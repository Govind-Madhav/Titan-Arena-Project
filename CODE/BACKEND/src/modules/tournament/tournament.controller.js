/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { tournaments, registrations, users, playerProfiles, wallets, transactions, notifications, auditLogs } = require('../../db/schema');
const { eq, and, desc, sql, inArray } = require('drizzle-orm');
const crypto = require('node:crypto');
const { TOURNAMENT_STATUS, REGISTRATION_STATUS, PUBLIC_STATUSES, TOURNAMENT_TRANSITIONS } = require('./tournament.constants');
const { createTournamentSchema, updateTournamentSchema, updateParticipantStatusSchema } = require('./tournament.schema');
const { getHostStats } = require('../../services/hostStats.service');
const { logAction } = require('../../services/audit.service');
const { publishTournamentCreated, publishTournamentStarted, publishTournamentEnded } = require('./tournament.events');
const walletService = require('../wallet/wallet.service');
const emailService = require('../../services/email.service');
const { publishEvent } = require('../../config/kafka.config');
const { getHostTrustProfile } = require('../../services/hostTrust.service');

const parseStreamMeta = (url) => {
    if (!url || typeof url !== 'string') {
        return { platform: 'OTHER', streamId: null };
    }

    const normalized = url.trim();
    const twitchMatch = /twitch\.tv\/(?:videos\/(\d+)|([^/?#]+))/i.exec(normalized);
    if (twitchMatch) {
        return {
            platform: 'TWITCH',
            streamId: twitchMatch[1] || twitchMatch[2] || null
        };
    }

    const youtubePatterns = [
        /youtu\.be\/([^?#&]+)/i,
        /youtube\.com\/watch\?v=([^&]+)/i,
        /youtube\.com\/live\/([^?#&]+)/i,
        /youtube\.com\/embed\/([^?#&]+)/i
    ];

    for (const pattern of youtubePatterns) {
        const match = pattern.exec(normalized);
        if (match) {
            return {
                platform: 'YOUTUBE',
                streamId: match[1] || null
            };
        }
    }

    return { platform: 'OTHER', streamId: null };
};

/**
 * PRO GUARD: Asserts that the current user owns the tournament
 * @param {string} tournamentId 
 * @param {object} user 
 * @returns {Promise<object>} The tournament object if authorized
 */
const assertTournamentOwnership = async (tournamentId, user) => {
    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);

    if (!tournament[0]) {
        const error = new Error('Tournament not found');
        error.status = 404;
        throw error;
    }

    // Role-based escalation: Admins/SuperAdmins can bypass ownership check
    if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
        if (tournament[0].hostId !== user.id) {
            const error = new Error('ACCESS DENIED: You do not own this tournament');
            error.status = 403;
            throw error;
        }
    }

    return tournament[0];
};

const parseAuditDetails = (rawDetails) => {
    if (!rawDetails) return null;
    if (typeof rawDetails === 'object') return rawDetails;
    try {
        return JSON.parse(rawDetails);
    } catch {
        return null;
    }
};

const normalizeWinnerEntry = (entry, index) => {
    const userId = String(entry?.userId || entry?.id || entry?.playerId || '').trim();
    const rankCandidate = Number(entry?.rank);
    const rank = Number.isFinite(rankCandidate) && rankCandidate > 0 ? rankCandidate : (index + 1);

    return {
        userId,
        rank,
        prizeAmount: Number(entry?.prize ?? entry?.prizeAmount ?? entry?.amount ?? 0),
        remarks: entry?.remarks || null
    };
};

const resolveTournamentCreationPolicy = async (user, validatedData) => {
    const isPrivilegedCreator = Boolean(user?.isAdmin || ['ADMIN', 'SUPERADMIN'].includes(user?.role));
    const trustProfile = isPrivilegedCreator
        ? { level: 2, maxEntryFee: null, maxParticipants: null }
        : await getHostTrustProfile(user);

    if (isPrivilegedCreator) {
        return {
            isPrivilegedCreator,
            trustProfile,
            shouldAutoActivate: true,
            createPrizePool: validatedData.prizePool,
            tournamentStatus: TOURNAMENT_STATUS.REGISTRATION
        };
    }

    const identityReady = Boolean(
        user?.registrationCompleted &&
        user?.emailVerified &&
        user?.phoneVerified &&
        user?.legalName &&
        user?.phone
    );

    if (user?.hostStatus !== 'VERIFIED') {
        return {
            error: 'Host verification required before creating tournaments. Please complete KYC first.'
        };
    }

    if (!identityReady || !user?.billingAddress) {
        return {
            error: 'Full identity, phone, and billing verification are required before creating tournaments.'
        };
    }

    const entryFeeLimit = trustProfile.maxEntryFee ?? Number.POSITIVE_INFINITY;
    const participantLimit = trustProfile.maxParticipants ?? Number.POSITIVE_INFINITY;
    const overTrialLimit = validatedData.entryFee > entryFeeLimit || validatedData.maxParticipants > participantLimit;

    if (trustProfile.level === 0 && overTrialLimit) {
        return {
            error: `Trial host limits exceeded. Keep entry fee at ₹${trustProfile.maxEntryFee} or below and max participants at ${trustProfile.maxParticipants} or below for your first tournaments.`
        };
    }

    return {
        isPrivilegedCreator,
        trustProfile,
        shouldAutoActivate: trustProfile.level === 2 || (trustProfile.level === 1 && !overTrialLimit),
        createPrizePool: 0,
        tournamentStatus: trustProfile.level === 2 || (trustProfile.level === 1 && !overTrialLimit)
            ? TOURNAMENT_STATUS.REGISTRATION
            : 'PENDING_APPROVAL'
    };
};

// Create new tournament
const createTournament = async (req, res) => {
    try {
        // 1. Validate Input (Hardened)
        const validatedData = createTournamentSchema.parse(req.body);
        const creationPolicy = await resolveTournamentCreationPolicy(req.user, validatedData);
        if (creationPolicy.error) {
            return res.status(403).json({ success: false, message: creationPolicy.error });
        }

        const { createPrizePool, tournamentStatus, trustProfile, shouldAutoActivate } = creationPolicy;

        // 2. Strict Date Parsing (Expects ISO 8601 with Timezone from Frontend)
        const startTime = new Date(validatedData.startTime);

        const registrationEnd = validatedData.registrationEnd
            ? new Date(validatedData.registrationEnd)
            : new Date(startTime.getTime() - (60 * 60 * 1000));

        // 3. Insert with Whitelisted Data
        const newId = crypto.randomUUID();
        await db.insert(tournaments).values({
            id: newId,
            hostId: req.user.id,
            name: validatedData.name,
            game: validatedData.game,
            description: validatedData.description,
            rules: validatedData.rules || null,
            type: validatedData.type,
            format: validatedData.format || 'SINGLE_ELIMINATION',
            startTime: startTime,
            registrationEnd: registrationEnd,
            entryFee: validatedData.entryFee,
            prizePool: createPrizePool,
            minTeamsRequired: validatedData.minTeamsRequired,
            maxParticipants: validatedData.maxParticipants,
            streamUrl: validatedData.streamUrl || null,
            streamScope: validatedData.streamScope || 'MATCH',
            streamIsLive: Boolean(validatedData.streamIsLive),
            ...parseStreamMeta(validatedData.streamUrl),
            status: tournamentStatus
        });

        // PRO AUDIT: Log Creation
        await logAction(req.user.id, 'TOURNAMENT_CREATED', newId, { name: validatedData.name }, req.ip);

        // 🔔 KAFKA: Publish tournament.created event for downstream consumers
        await publishTournamentCreated({
            id: newId,
            name: validatedData.name,
            game: validatedData.game,
            type: validatedData.type,
            format: validatedData.format || 'SINGLE_ELIMINATION', // ← Java engine uses this to pick bracket strategy
            maxParticipants: validatedData.maxParticipants,
            hostId: req.user.id,
            prizePool: createPrizePool,
            entryFee: validatedData.entryFee,
            startDate: validatedData.startTime,
            trustLevel: trustProfile.level,
            activationMode: shouldAutoActivate ? 'AUTO' : 'MANUAL'
        });

        res.status(201).json({
            success: true,
            message: 'Tournament created successfully',
            data: { id: newId }
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        console.error('Create tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to create tournament' });
    }
};

// Get all tournaments (Public - Whitelisted Fields & Statuses)
const getAllTournaments = async (req, res) => {
    try {
        // PRO FIX: Never use .select() without explicit fields for public APIs
        // PRO FIX: Filter only public visible statuses
        const result = await db.select({
            id: tournaments.id,
            name: tournaments.name,
            game: tournaments.game,
            description: tournaments.description,
            startTime: tournaments.startTime,
            prizePool: tournaments.prizePool,
            entryFee: tournaments.entryFee,
            status: tournaments.status,
            type: tournaments.type
        })
            .from(tournaments)
            .where(inArray(tournaments.status, PUBLIC_STATUSES))
            .orderBy(desc(tournaments.createdAt));

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get all tournaments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tournaments' });
    }
};

// Get single tournament
const getTournamentById = async (req, res) => {
    try {
        const result = await db.select({
            id: tournaments.id,
            name: tournaments.name,
            game: tournaments.game,
            description: tournaments.description,
            type: tournaments.type,
            startTime: tournaments.startTime,
            registrationEnd: tournaments.registrationEnd,
            prizePool: tournaments.prizePool,
            entryFee: tournaments.entryFee,
            status: tournaments.status,
            rules: tournaments.rules,
            maxParticipants: tournaments.maxParticipants,
            streamUrl: tournaments.streamUrl,
            streamScope: tournaments.streamScope,
            streamPlatform: tournaments.streamPlatform,
            streamId: tournaments.streamId,
            streamIsLive: tournaments.streamIsLive
        })
            .from(tournaments)
            .where(eq(tournaments.id, req.params.id))
            .limit(1);
        if (!result.length) return res.status(404).json({ success: false, message: 'Tournament not found' });
        res.json({ success: true, data: result[0] });
    } catch (error) {
        console.error('Get tournament by id error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tournament' });
    }
};

// Get Host's Tournaments & Aggregated Stats (PRO REFACTOR: Uses Service Layer)
const getTournamentsByHost = async (req, res) => {
    try {
        const hostId = req.user.id;

        // Fetch tournaments using explicit fields to avoid runtime breaks on drifted DB columns.
        const tournamentRows = await db.execute(sql`
            SELECT
                t.id,
                t.name,
                t.description,
                t.game,
                t.type,
                t.format,
                t.status,
                t."entryFee" AS "entryFee",
                t."prizePool" AS "prizePool",
                COALESCE(t."maxParticipants", t."minTeamsRequired") AS "maxParticipants",
                t."startTime" AS "startTime",
                t."createdAt" AS "createdAt",
                t."highlightUrl" AS "imageUrl",
                t."streamUrl" AS "streamUrl",
                t."streamScope" AS "streamScope",
                t."streamPlatform" AS "streamPlatform",
                t."streamId" AS "streamId",
                t."streamIsLive" AS "streamIsLive"
            FROM "tournament" t
            WHERE t."hostId" = ${hostId}
            ORDER BY t."createdAt" DESC
        `);

        const myTournaments = (tournamentRows.rows || []).map((row) => ({
            ...row,
            bannerUrl: null
        }));

        const tournamentIds = myTournaments.map((tournament) => tournament.id);
        const participantRows = tournamentIds.length
            ? await db
                .select({
                    tournamentId: registrations.tournamentId,
                    count: sql`COUNT(*)::int`
                })
                .from(registrations)
                .where(and(
                    inArray(registrations.tournamentId, tournamentIds),
                    sql`${registrations.status} != 'CANCELLED'`
                ))
                .groupBy(registrations.tournamentId)
            : [];

        const participantMap = new Map(participantRows.map((row) => [row.tournamentId, Number(row.count || 0)]));
        const tournamentsWithCounts = myTournaments.map((tournament) => ({
            ...tournament,
            currentParticipants: participantMap.get(tournament.id) || 0
        }));

        // Use service layer for stats (PRO FIX)
        const stats = await getHostStats(hostId);

        res.json({
            success: true,
            data: {
                tournaments: tournamentsWithCounts,
                stats
            }
        });
    } catch (error) {
        console.error('Host tournaments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch host data' });
    }
};

// Secure: Get Participants (Host/Admin Only)
const getParticipants = async (req, res) => {
    try {
        const tournamentId = req.params.id;

        // 1. Verify Ownership (PRO GUARD)
        await assertTournamentOwnership(tournamentId, req.user);

        // 2. Fetch Participants with Profiles
        const parts = await db.select({
            id: registrations.id,
            userId: registrations.userId,
            status: registrations.status,
            createdAt: registrations.createdAt,
            user: {
                username: users.username,
                email: users.email
            },
            playerProfile: {
                avatarUrl: playerProfiles.avatarUrl,
                ign: playerProfiles.ign
            }
        })
            .from(registrations)
            .leftJoin(users, eq(registrations.userId, users.id))
            .leftJoin(playerProfiles, eq(registrations.userId, playerProfiles.userId))
            .where(eq(registrations.tournamentId, tournamentId));

        res.json({ success: true, data: parts });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        console.error('Get participants error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch participants' });
    }
};

// Secure: Update Participant Status (Host/Admin Only)
const updateParticipantStatus = async (req, res) => {
    try {
        const { id: tournamentId, userId } = req.params; // Assuming participantId in params is actually userId
        // 1. Validate Status Enum (Hardened)
        const { status } = updateParticipantStatusSchema.parse(req.body);

        // 2. Verify Ownership
        const tournament = await assertTournamentOwnership(tournamentId, req.user);

        // 3. PRO GUARD: Enforce REGISTRATION state for management
        if (![TOURNAMENT_STATUS.REGISTRATION, TOURNAMENT_STATUS.REG_CLOSED].includes(tournament.status)) {
            return res.status(403).json({
                success: false,
                message: `Action denied: Participant list is locked while tournament is ${tournament.status.toLowerCase()}`
            });
        }

        // 4. Update Status
        await db.update(registrations)
            .set({ status })
            .where(and(
                eq(registrations.tournamentId, tournamentId),
                eq(registrations.userId, userId)
            ));

        // PRO AUDIT: Log Status Change
        await logAction(req.user.id, 'PARTICIPANT_STATUS_UPDATE', tournamentId, { userId, newStatus: status }, req.ip);

        res.json({ success: true, message: `Participant status updated to ${status}` });
    } catch (error) {
        if (error.name === 'ZodError') return res.status(400).json({ success: false, message: 'Invalid status' });
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        console.error('Update participant error:', error);
        res.status(500).json({ success: false, message: 'Failed to update participant' });
    }
};

// FULL CRUD IMPLEMENTATION
const buildTournamentUpdateData = (validatedData, isPrivilegedEditor) => {
    const setData = {};

    const assignIfDefined = (key) => {
        if (validatedData[key] !== undefined) {
            setData[key] = validatedData[key];
        }
    };

    [
        'name',
        'game',
        'description',
        'type',
        'format',
        'entryFee',
        'prizePool',
        'minTeamsRequired',
        'maxParticipants',
        'rules',
        'bannerUrl',
        'streamUrl',
        'streamScope',
        'streamIsLive',
        'status'
    ].forEach(assignIfDefined);

    if (validatedData.startTime !== undefined) {
        const parsedStartTime = new Date(validatedData.startTime);
        if (Number.isNaN(parsedStartTime.getTime())) {
            return { error: 'Invalid startTime format' };
        }
        setData.startTime = parsedStartTime;
    }

    if (validatedData.registrationEnd !== undefined) {
        const parsedRegistrationEnd = new Date(validatedData.registrationEnd);
        if (Number.isNaN(parsedRegistrationEnd.getTime())) {
            return { error: 'Invalid registrationEnd format' };
        }
        setData.registrationEnd = parsedRegistrationEnd;
    }

    if (!isPrivilegedEditor) {
        delete setData.prizePool;
    }

    return { setData };
};

const updateTournament = async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const validatedData = updateTournamentSchema.parse(req.body);

        const isPrivilegedEditor = Boolean(req.user?.isAdmin || ['ADMIN', 'SUPERADMIN'].includes(req.user?.role));
        const normalizedUpdate = buildTournamentUpdateData(validatedData, isPrivilegedEditor);
        if (normalizedUpdate.error) {
            return res.status(400).json({ success: false, message: normalizedUpdate.error });
        }

        const setData = normalizedUpdate.setData;

        // Verify Ownership
        const existingTournament = await assertTournamentOwnership(tournamentId, req.user);

        // PRO GUARD: State Machine Transitions
        if (validatedData.status && validatedData.status !== existingTournament.status) {
            const validNextStates = TOURNAMENT_TRANSITIONS[existingTournament.status] || [];

            if (!validNextStates.includes(validatedData.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid state transition: ${existingTournament.status} -> ${validatedData.status}`
                });
            }
        }

        const streamMeta = parseStreamMeta(setData.streamUrl);

        // Update with Whitelisted Data
        await db.update(tournaments)
            .set({
                ...setData,
                ...(setData.streamUrl !== undefined && {
                    streamPlatform: streamMeta.platform,
                    streamId: streamMeta.streamId
                }),
                updatedAt: new Date()
            })
            .where(eq(tournaments.id, tournamentId));

        // PRO AUDIT: Log Update
        await logAction(req.user.id, 'TOURNAMENT_UPDATED', tournamentId, { changedFields: Object.keys(setData) }, req.ip);

        // 🔔 KAFKA: Publish status transition events
        if (setData.status === TOURNAMENT_STATUS.REG_CLOSED) {
            // ── Bracket pre-generation: fire as soon as reg closes so the Java engine
            //    builds the bracket. Players see their seedings before startTime.
            await publishTournamentStarted(tournamentId, req.user.id);
        } else if (setData.status === TOURNAMENT_STATUS.ONGOING) {
            // ── Matches are now LIVE. Publish a lightweight signal so consumers
            //    (notifications, frontend WS) know the tournament has begun.
            //    The bracket was already generated at REG_CLOSED.
            await publishEvent('tournament.live', {
                eventType: 'TOURNAMENT_LIVE',
                tournamentId,
                hostId: req.user.id,
                timestamp: new Date().toISOString()
            });
        } else if (setData.status === TOURNAMENT_STATUS.COMPLETED) {
            await publishTournamentEnded(tournamentId, null, existingTournament.prizePool);
        }

        res.json({ success: true, message: 'Tournament updated successfully' });
    } catch (error) {
        if (error.name === 'ZodError') return res.status(400).json({ success: false, errors: error.errors });
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        console.error('Update tournament error:', error);
        res.status(500).json({ success: false, message: 'Update failed' });
    }
};

const updateTournamentStream = async (req, res) => {
    try {
        const { id: tournamentId } = req.params;
        const { streamUrl, streamIsLive, streamScope } = req.body;

        await assertTournamentOwnership(tournamentId, req.user);

        const streamMeta = parseStreamMeta(streamUrl);
        const updateData = {
            updatedAt: new Date(),
            streamUrl: streamUrl || null,
            streamIsLive: Boolean(streamIsLive),
            streamScope: streamScope || 'TOURNAMENT',
            streamPlatform: streamMeta.platform,
            streamId: streamMeta.streamId
        };

        const [updated] = await db.update(tournaments)
            .set(updateData)
            .where(eq(tournaments.id, tournamentId))
            .returning();

        await logAction(req.user.id, 'TOURNAMENT_STREAM_UPDATED', tournamentId, {
            streamScope: updateData.streamScope,
            streamIsLive: updateData.streamIsLive,
            streamPlatform: updateData.streamPlatform
        }, req.ip);

        res.json({ success: true, message: 'Tournament stream updated', data: updated });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        console.error('Update tournament stream error:', error);
        res.status(500).json({ success: false, message: 'Failed to update tournament stream' });
    }
};

const deleteTournament = async (req, res) => {
    try {
        const tournamentId = req.params.id;

        // Verify Ownership
        const tournament = await assertTournamentOwnership(tournamentId, req.user);

        // Business Rule: Can't cancel once ongoing or finished
        if ([TOURNAMENT_STATUS.ONGOING, TOURNAMENT_STATUS.COMPLETED].includes(tournament.status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a tournament that is already ongoing or completed'
            });
        }

        // ─── GAP C FIX: Mass refund to all paid registrations ────────────────
        if (tournament.entryFee > 0) {
            const paidRegs = await db
                .select({ userId: registrations.userId })
                .from(registrations)
                .where(and(
                    eq(registrations.tournamentId, tournamentId),
                    inArray(registrations.status, ['PENDING', 'APPROVED', 'CONFIRMED']),
                    eq(registrations.paymentStatus, 'COMPLETED')
                ));

            for (const { userId } of paidRegs) {
                await walletService.credit(
                    userId,
                    tournament.entryFee,
                    'CREDIT',
                    'REFUND',
                    `Refund — tournament deleted: ${tournament.name}`,
                    null,
                    tournamentId
                ).catch(err => console.error(`Refund failed for ${userId}:`, err.message));
            }
        }

        // PRO FIX: Soft Delete only
        await db.update(tournaments)
            .set({ status: TOURNAMENT_STATUS.CANCELLED })
            .where(eq(tournaments.id, tournamentId));

        // PRO AUDIT: Log Cancellation
        await logAction(req.user.id, 'TOURNAMENT_CANCELLED', tournamentId, {}, req.ip);

        res.json({ success: true, message: 'Tournament cancelled successfully (Soft Delete)' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
};

// Player Actions: Join Tournament
const joinTournament = async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const userId = req.user.id;

        // 1. Verify Tournament Existence & State
        const tournament = await db.select({
            id: tournaments.id,
            status: tournaments.status,
            entryFee: tournaments.entryFee,
            maxParticipants: tournaments.maxParticipants,
            startTime: tournaments.startTime,
            name: tournaments.name
        })
            .from(tournaments)
            .where(eq(tournaments.id, tournamentId))
            .limit(1);

        if (!tournament.length) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const t = tournament[0];
        if (![TOURNAMENT_STATUS.REGISTRATION, TOURNAMENT_STATUS.CREATED].includes(t.status)) {
            return res.status(400).json({
                success: false,
                message: `Registration is currently ${t.status.toLowerCase()}`
            });
        }

        // ─── GAP A FIX: Capacity check ─────────────────────────────────────────
        if (t.maxParticipants) {
            const [countRow] = await db
                .select({ count: sql`count(*)` })
                .from(registrations)
                .where(and(
                    eq(registrations.tournamentId, tournamentId),
                    inArray(registrations.status, ['PENDING', 'APPROVED', 'CONFIRMED'])
                ));
            if (Number(countRow.count) >= t.maxParticipants) {
                return res.status(400).json({ success: false, message: 'Tournament is full' });
            }
        }

        // 2. Check for Existing Registration
        const existing = await db.select()
            .from(registrations)
            .where(and(
                eq(registrations.tournamentId, tournamentId),
                eq(registrations.userId, userId)
            ))
            .limit(1);

        if (existing.length && existing[0].status !== REGISTRATION_STATUS.CANCELLED) {
            return res.status(400).json({ success: false, message: 'Already registered for this tournament' });
        }

        // 3. PRO GUARD: Collision Detection (Gap: Prevent overlapping tournaments)
        // If the user isn't overriding (force=true), check for overlap ±2 hours.
        if (!req.body.force) {
            // Find all confirmed/approved registrations for this user
            const myRegs = await db.select({
                tournamentId: registrations.tournamentId,
                status: tournaments.status,
                name: tournaments.name,
                startTime: tournaments.startTime
            })
                .from(registrations)
                .innerJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
                .where(and(
                    eq(registrations.userId, userId),
                    inArray(registrations.status, ['PENDING', 'APPROVED', 'CONFIRMED']),
                    // We only care about active/soon-to-be active tournaments
                    inArray(tournaments.status, [TOURNAMENT_STATUS.UPCOMING, TOURNAMENT_STATUS.REGISTRATION, TOURNAMENT_STATUS.REG_CLOSED, TOURNAMENT_STATUS.ONGOING])
                ));

            const targetTime = new Date(t.startTime).getTime();
            const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

            const collision = myRegs.find(reg => {
                const regTime = new Date(reg.startTime).getTime();
                // Is the registered tournament's start time within 2 hours of this one?
                return Math.abs(regTime - targetTime) <= TWO_HOURS_MS;
            });

            if (collision) {
                return res.status(409).json({
                    success: false,
                    code: 'COLLISION_WARNING',
                    message: `Schedule Collision: You are already registered for "${collision.name}" which starts around the same time.`,
                    collisionData: collision
                });
            }
        }

        // 4. Create Registration + debit entry fee atomically
        await db.transaction(async (tx) => {
            if (existing.length && existing[0].status === REGISTRATION_STATUS.CANCELLED) {
                await tx.update(registrations)
                    .set({ status: REGISTRATION_STATUS.PENDING, paymentStatus: t.entryFee > 0 ? 'PENDING' : 'COMPLETED', updatedAt: new Date() })
                    .where(eq(registrations.id, existing[0].id));
            } else {
                await tx.insert(registrations).values({
                    tournamentId,
                    userId,
                    status: REGISTRATION_STATUS.PENDING,
                    paymentStatus: t.entryFee > 0 ? 'PENDING' : 'COMPLETED'
                });
            }

            // ─── GAP A FIX: Debit entry fee ───────────────────────────────
            if (t.entryFee > 0) {
                await walletService.debit(
                    userId,
                    t.entryFee,
                    'DEBIT',
                    'TOURNAMENT_ENTRY',
                    `Entry fee for tournament: ${tournamentId}`,
                    null,
                    tournamentId,
                    tx
                );
                // Mark payment as completed
                await tx.update(registrations)
                    .set({ paymentStatus: 'COMPLETED' })
                    .where(and(
                        eq(registrations.tournamentId, tournamentId),
                        eq(registrations.userId, userId)
                    ));
            }
        });

        // PRO AUDIT: Log Join
        await logAction(userId, 'PLAYER_JOINED', tournamentId, { entryFee: t.entryFee }, req.ip);

        res.json({ success: true, message: 'Successfully requested to join tournament' });
    } catch (error) {
        if (error.message === 'Insufficient balance') {
            return res.status(402).json({ success: false, message: 'Insufficient wallet balance to pay entry fee' });
        }
        console.error('Join Tournament Error:', error);
        res.status(500).json({ success: false, message: 'Failed to join tournament' });
    }
};

// Player Actions: Leave Tournament
const leaveTournament = async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const userId = req.user.id;

        // 1. Verify Tournament State (Cannot leave once registration is closed or ongoing)
        const tournament = await db.select({ status: tournaments.status, entryFee: tournaments.entryFee, name: tournaments.name })
            .from(tournaments)
            .where(eq(tournaments.id, tournamentId))
            .limit(1);

        if (!tournament.length) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const t = tournament[0];
        if (t.status !== TOURNAMENT_STATUS.REGISTRATION) {
            return res.status(403).json({
                success: false,
                message: 'Cannot leave tournament after registration has closed'
            });
        }

        // 2. Fetch existing registration
        const [reg] = await db.select()
            .from(registrations)
            .where(and(
                eq(registrations.tournamentId, tournamentId),
                eq(registrations.userId, userId)
            ))
            .limit(1);

        if (!reg) {
            return res.status(404).json({ success: false, message: 'No registration found' });
        }

        await db.transaction(async (tx) => {
            // 2. Soft Delete: Change status to CANCELLED
            await tx.update(registrations)
                .set({ status: REGISTRATION_STATUS.CANCELLED, updatedAt: new Date() })
                .where(eq(registrations.id, reg.id));

            // ─── GAP B FIX: Refund entry fee if player had paid ────────────────
            if (t.entryFee > 0 && reg.paymentStatus === 'COMPLETED') {
                await walletService.credit(
                    userId,
                    t.entryFee,
                    'CREDIT',
                    'REFUND',
                    `Refund — left tournament: ${t.name}`,
                    null,
                    tournamentId,
                    tx
                );
            }
        });

        // PRO AUDIT: Log Leave
        await logAction(userId, 'PLAYER_LEFT', tournamentId, {}, req.ip);

        res.json({ success: true, message: 'Successfully left the tournament' });
    } catch (error) {
        console.error('Leave Tournament Error:', error);
        res.status(500).json({ success: false, message: 'Failed to leave tournament' });
    }
};
// Declare Winners (Host/Admin Only)
const declareWinners = async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const { winners } = req.body; // Array of { userId|id|playerId, rank, prize|prizeAmount }

        // 1. Verify Ownership
        const tournament = await assertTournamentOwnership(tournamentId, req.user);

        // 2. Validate State
        if (![TOURNAMENT_STATUS.ONGOING, TOURNAMENT_STATUS.COMPLETED].includes(tournament.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot declare winners when tournament is ${tournament.status}`
            });
        }

        if (!Array.isArray(winners) || winners.length === 0) {
            return res.status(400).json({ success: false, message: 'Winners list is required' });
        }

        const normalizedWinners = winners
            .map((winner, index) => {
                const rankCandidate = Number(winner?.rank);
                const rank = Number.isFinite(rankCandidate) && rankCandidate > 0 ? rankCandidate : (index + 1);
                return {
                    userId: String(winner?.userId || winner?.id || winner?.playerId || '').trim(),
                    rank,
                    prizeAmount: Number(winner?.prize ?? winner?.prizeAmount ?? winner?.amount ?? 0),
                    remarks: winner?.remarks || null
                };
            })
            .filter((winner) => Boolean(winner.userId));

        if (normalizedWinners.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one valid winner with userId/playerId is required' });
        }

        const firstPlace = normalizedWinners.find((winner) => winner.rank === 1) || normalizedWinners[0];
        const firstPlaceId = firstPlace.userId;

        // ─── GAP D FIX: Actually write winners + distribute prizes ────────────
        await db.transaction(async (tx) => {
            // Mark tournament completed and set winnerId
            await tx.update(tournaments)
                .set({
                    status: TOURNAMENT_STATUS.COMPLETED,
                    winnerId: firstPlaceId,
                    updatedAt: new Date()
                })
                .where(eq(tournaments.id, tournamentId));

            await logAction(req.user.id, 'TOURNAMENT_WINNERS_DECLARED', tournamentId, { winners: normalizedWinners }, req.ip);
        });

        // Credit each winner's prize (non-blocking per winner so one failure doesn't stop others)
        const prizeResults = [];
        for (const w of normalizedWinners) {
            const recipientId = w.userId;
            const prizeAmount = w.prizeAmount;
            if (!recipientId || prizeAmount <= 0) continue;
            try {
                await walletService.credit(
                    recipientId,
                    prizeAmount,
                    'CREDIT',
                    'PRIZE',
                    `Rank #${w.rank} prize — ${tournament.name}`,
                    null,
                    tournamentId
                );
                prizeResults.push({ userId: recipientId, rank: w.rank, amount: prizeAmount, status: 'PAID' });
            } catch (err) {
                console.error(`Prize credit failed for ${recipientId}:`, err.message);
                prizeResults.push({ userId: recipientId, rank: w.rank, amount: prizeAmount, status: 'FAILED' });
            }
        }

        // 🔔 KAFKA: Publish tournament.ended
        await publishTournamentEnded(tournamentId, firstPlaceId, tournament.prizePool);

        res.json({
            success: true,
            message: 'Winners declared and prizes distributed',
            data: { tournamentId, winner: firstPlaceId, prizes: prizeResults }
        });
    } catch (error) {
        console.error('Declare Winners Error:', error);
        res.status(500).json({ success: false, message: 'Failed to declare winners' });
    }
};
// Get Winners (Public)
const getWinners = async (req, res) => {
    try {
        const tournamentId = req.params.id;

        const [tournament] = await db.select({
            id: tournaments.id,
            name: tournaments.name,
            winnerId: tournaments.winnerId,
            status: tournaments.status
        }).from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);

        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        const [auditEntry] = await db.select({
            details: auditLogs.details,
            createdAt: auditLogs.createdAt
        })
            .from(auditLogs)
            .where(and(
                eq(auditLogs.targetId, tournamentId),
                eq(auditLogs.action, 'TOURNAMENT_WINNERS_DECLARED')
            ))
            .orderBy(desc(auditLogs.createdAt))
            .limit(1);

        const parsed = parseAuditDetails(auditEntry?.details);
        let rawWinners = [];
        if (Array.isArray(parsed?.winners)) {
            rawWinners = parsed.winners;
        } else if (Array.isArray(parsed)) {
            rawWinners = parsed;
        }

        const normalized = rawWinners
            .map((entry, index) => normalizeWinnerEntry(entry, index))
            .filter((winner) => Boolean(winner.userId));

        if (normalized.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: tournament.winnerId
                    ? 'Winner declared, but podium details are unavailable in audit logs'
                    : 'No winners declared yet'
            });
        }

        const userIds = [...new Set(normalized.map((winner) => winner.userId))];
        const userRows = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            ign: playerProfiles.ign,
            avatarUrl: playerProfiles.avatarUrl
        })
            .from(users)
            .leftJoin(playerProfiles, eq(users.id, playerProfiles.userId))
            .where(inArray(users.id, userIds));

        const userMap = new Map(userRows.map((user) => [user.id, user]));

        const winners = normalized
            .map((winner) => {
                const user = userMap.get(winner.userId);
                return {
                    userId: winner.userId,
                    rank: winner.rank,
                    prizeAmount: winner.prizeAmount,
                    remarks: winner.remarks,
                    username: user?.username || null,
                    ign: user?.ign || null,
                    email: user?.email || null,
                    avatarUrl: user?.avatarUrl || null
                };
            })
            .sort((a, b) => a.rank - b.rank);

        res.json({
            success: true,
            data: winners,
            meta: {
                tournamentId,
                tournamentName: tournament.name,
                declaredAt: auditEntry?.createdAt || null
            }
        });
    } catch (error) {
        console.error('Get Winners Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch winners' });
    }
};

// ─── Cancel Tournament ────────────────────────────────────────────────────────
const cancelTournament = async (req, res) => {
    try {
        const tournamentId = req.params.id;

        const tournament = await assertTournamentOwnership(tournamentId, req.user);

        const CANCELLABLE = [TOURNAMENT_STATUS.UPCOMING, TOURNAMENT_STATUS.REGISTRATION, TOURNAMENT_STATUS.REG_CLOSED];
        if (!CANCELLABLE.includes(tournament.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel a tournament that is ${tournament.status.toLowerCase()}. Only upcoming/registration-phase tournaments can be cancelled.`
            });
        }

        // Fetch all confirmed/approved registrations that paid entry fee
        const paidRegistrations = await db
            .select({
                reg: registrations,
                user: { id: users.id, username: users.username, email: users.email }
            })
            .from(registrations)
            .leftJoin(users, eq(registrations.userId, users.id))
            .where(and(
                eq(registrations.tournamentId, tournamentId),
                inArray(registrations.status, ['CONFIRMED', 'APPROVED'])
            ));

        const refundAmount = tournament.entryFee;
        const refundResults = [];

        // Batch refund
        for (const { user } of paidRegistrations) {
            if (!user?.id || refundAmount <= 0) continue;
            try {
                await walletService.credit(
                    user.id,
                    refundAmount,
                    'REFUND',
                    tournamentId,
                    `Refund for cancelled tournament: ${tournament.name}`
                );

                // In-app notification
                await db.insert(notifications).values({
                    userId: user.id,
                    title: 'Tournament Cancelled',
                    message: `${tournament.name} was cancelled. Your entry fee of ₹${(refundAmount / 100).toFixed(2)} has been refunded.`,
                    type: 'REFUND',
                }).catch(() => { }); // non-blocking

                // Email notification (non-blocking)
                emailService.sendTournamentCancelled({
                    to: user.email,
                    username: user.username,
                    tournamentName: tournament.name,
                    refundAmount,
                }).catch(() => { });

                refundResults.push({ userId: user.id, status: 'REFUNDED' });
            } catch (err) {
                console.error(`Refund failed for ${user.id}:`, err.message);
                refundResults.push({ userId: user.id, status: 'REFUND_FAILED' });
            }
        }

        // Mark tournament as CANCELLED
        await db.update(tournaments)
            .set({ status: 'CANCELLED', updatedAt: new Date() })
            .where(eq(tournaments.id, tournamentId));

        // Audit log
        await logAction(req.user.id, 'TOURNAMENT_CANCELLED', tournamentId, { refundCount: refundResults.length }, req.ip);

        // Kafka event
        await publishEvent('tournament.cancelled', {
            eventType: 'TOURNAMENT_CANCELLED',
            tournamentId,
            name: tournament.name,
            game: tournament.game,
            cancelledBy: req.user.id,
            refundCount: refundResults.filter(r => r.status === 'REFUNDED').length,
            timestamp: new Date().toISOString(),
        });

        res.json({
            success: true,
            message: `Tournament cancelled. ${refundResults.filter(r => r.status === 'REFUNDED').length} players refunded.`,
            data: { refunds: refundResults },
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        console.error('Cancel tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel tournament' });
    }
};

// Tournament Banner Upload
const uploadBanner = async (req, res) => {
    try {
        const { id: tournamentId } = req.params;

        await assertTournamentOwnership(tournamentId, req.user);

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }

        const bannerUrl = `/uploads/community/${req.file.filename}`;

        await db.update(tournaments)
            .set({ bannerUrl, updatedAt: new Date() })
            .where(eq(tournaments.id, tournamentId));

        await logAction(req.user.id, 'TOURNAMENT_BANNER_UPLOADED', tournamentId, { fileName: req.file.filename }, req.ip);

        res.json({
            success: true,
            message: 'Banner uploaded successfully',
            data: { bannerUrl }
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        console.error('Upload banner error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload banner' });
    }
};

module.exports = {
    createTournament,
    getAllTournaments,
    getTournamentById,
    updateTournament,
    deleteTournament,
    joinTournament,
    leaveTournament,
    getParticipants,
    updateParticipantStatus,
    cancelTournament,
    declareWinners,
    getWinners,
    getTournamentsByHost,
    uploadBanner,
    updateTournamentStream
};

