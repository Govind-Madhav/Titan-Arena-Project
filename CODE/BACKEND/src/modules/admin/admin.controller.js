/**
 * Admin Controller
 * All endpoints require isAdmin: true or role: ADMIN/SUPERADMIN
 */

const { db } = require('../../db');
const {
    users, wallets, playerProfiles, hostProfiles,
    tournaments, registrations, refreshTokens, kycRequests, hostApplications
} = require('../../db/schema');
const { eq, desc, count, sql, like, or, and, inArray } = require('drizzle-orm');

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────
exports.getStats = async (req, res) => {
    try {
        const [[totalUsers], [totalTournaments], [activeTournaments], [totalPlayers], [totalHosts], [bannedUsers], [pendingKyc], [walletTotals]] = await Promise.all([
            db.select({ count: count() }).from(users),
            db.select({ count: count() }).from(tournaments),
            db.select({ count: count() }).from(tournaments).where(or(
                eq(tournaments.status, 'REGISTRATION'),
                eq(tournaments.status, 'REG_CLOSED'),
                eq(tournaments.status, 'ONGOING')
            )),
            db.select({ count: count() }).from(users).where(eq(users.role, 'PLAYER')),
            db.select({ count: count() }).from(users).where(or(
                eq(users.hostStatus, 'ACTIVE'),
                eq(users.hostStatus, 'VERIFIED')
            )),
            db.select({ count: count() }).from(users).where(eq(users.isBanned, true)),
            db.select({ count: count() }).from(kycRequests).where(eq(kycRequests.status, 'PENDING')),
            db.select({ totalBalance: sql`SUM(${wallets.balance})`, totalLocked: sql`SUM(${wallets.locked})` }).from(wallets)
        ]);

        res.json({
            success: true,
            data: {
                users: { total: Number(totalUsers.count), players: Number(totalPlayers.count), hosts: Number(totalHosts.count), banned: Number(bannedUsers.count) },
                tournaments: { total: Number(totalTournaments.count), active: Number(activeTournaments.count) },
                kyc: { pending: Number(pendingKyc.count) },
                platform: { totalBalance: Number(walletTotals.totalBalance || 0), totalLocked: Number(walletTotals.totalLocked || 0) }
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};

// ─────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────
exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, banned } = req.query;
        const parsedPage = Number(page);
        const parsedLimit = Number(limit);
        const offset = (parsedPage - 1) * parsedLimit;

        const filters = [];
        if (search) {
            const pattern = `%${search}%`;
            filters.push(sql`(u.email ILIKE ${pattern} OR u.username ILIKE ${pattern})`);
        }
        if (role && role !== 'ALL') {
            filters.push(sql`u.role = ${role}`);
        }
        if (banned === 'true') {
            filters.push(sql`u."isBanned" = true`);
        }
        if (banned === 'false') {
            filters.push(sql`u."isBanned" = false`);
        }

        const whereExpr = filters.length ? and(...filters) : undefined;

        const listQuery = whereExpr
            ? sql`
                SELECT
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.is_admin AS "isAdmin",
                    u."hostStatus" AS "hostStatus",
                    u."isBanned" AS "isBanned",
                    u."emailVerified" AS "emailVerified",
                    u.country_code AS "countryCode",
                    u."platformUid" AS "platformUid",
                    u."createdAt" AS "createdAt",
                    p.ign,
                    p."avatarUrl" AS "avatarUrl"
                FROM "users" u
                LEFT JOIN "playerprofile" p ON u.id = p."userId"
                WHERE ${whereExpr}
                ORDER BY u."createdAt" DESC
                LIMIT ${parsedLimit} OFFSET ${offset}
            `
            : sql`
                SELECT
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.is_admin AS "isAdmin",
                    u."hostStatus" AS "hostStatus",
                    u."isBanned" AS "isBanned",
                    u."emailVerified" AS "emailVerified",
                    u.country_code AS "countryCode",
                    u."platformUid" AS "platformUid",
                    u."createdAt" AS "createdAt",
                    p.ign,
                    p."avatarUrl" AS "avatarUrl"
                FROM "users" u
                LEFT JOIN "playerprofile" p ON u.id = p."userId"
                ORDER BY u."createdAt" DESC
                LIMIT ${parsedLimit} OFFSET ${offset}
            `;

        const countQuery = whereExpr
            ? sql`
                SELECT COUNT(*)::int AS total
                FROM "users" u
                WHERE ${whereExpr}
            `
            : sql`
                SELECT COUNT(*)::int AS total
                FROM "users" u
            `;

        const [resultRows, totalRows] = await Promise.all([
            db.execute(listQuery),
            db.execute(countQuery)
        ]);

        const result = resultRows.rows || [];
        const total = Number(totalRows.rows?.[0]?.total || 0);

        res.json({ success: true, data: { users: result, total, page: parsedPage, limit: parsedLimit } });
    } catch (error) {
        console.error('Admin getUsers error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

exports.banUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { ban, reason } = req.body;

        if (id === req.user.id) return res.status(400).json({ success: false, message: 'Cannot ban yourself' });

        await db.update(users).set({ isBanned: ban }).where(eq(users.id, id));
        if (ban) await db.delete(refreshTokens).where(eq(refreshTokens.userId, id));

        res.json({ success: true, message: ban ? `User banned: ${reason || 'No reason given'}` : 'User unbanned' });
    } catch (error) {
        console.error('Admin ban error:', error);
        res.status(500).json({ success: false, message: 'Failed to update ban status' });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, isAdmin } = req.body;

        const validRoles = ['PLAYER', 'HOST', 'ADMIN', 'SUPERADMIN'];
        if (role && !validRoles.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });

        await db.update(users).set({ ...(role && { role }), ...(typeof isAdmin === 'boolean' && { isAdmin }) }).where(eq(users.id, id));
        res.json({ success: true, message: 'User role updated' });
    } catch (error) {
        console.error('Admin role update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update role' });
    }
};

// ─────────────────────────────────────────────
// TOURNAMENT MANAGEMENT
// ─────────────────────────────────────────────
exports.getTournaments = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const parsedPage = Number(page);
        const parsedLimit = Number(limit);
        const offset = (parsedPage - 1) * parsedLimit;

        const listQuery = status
            ? sql`
                SELECT
                    t.id,
                    t.name,
                    t.game,
                    t.description,
                    t.rules,
                    t.type,
                    t.format,
                    t."bannerUrl" AS "bannerUrl",
                    t.status,
                    t."entryFee" AS "entryFee",
                    t."prizePool" AS "prizePool",
                    COALESCE(t."maxParticipants", t."minTeamsRequired") AS "maxParticipants",
                    t."startTime" AS "startTime",
                    t."hostId" AS "hostId",
                    t."createdAt" AS "createdAt",
                    u.username AS "hostUsername"
                FROM "tournament" t
                LEFT JOIN "users" u ON t."hostId" = u.id
                WHERE t.status = ${status}
                ORDER BY t."createdAt" DESC
                LIMIT ${parsedLimit} OFFSET ${offset}
            `
            : sql`
                SELECT
                    t.id,
                    t.name,
                    t.game,
                    t.description,
                    t.rules,
                    t.type,
                    t.format,
                    t."bannerUrl" AS "bannerUrl",
                    t.status,
                    t."entryFee" AS "entryFee",
                    t."prizePool" AS "prizePool",
                    COALESCE(t."maxParticipants", t."minTeamsRequired") AS "maxParticipants",
                    t."startTime" AS "startTime",
                    t."hostId" AS "hostId",
                    t."createdAt" AS "createdAt",
                    u.username AS "hostUsername"
                FROM "tournament" t
                LEFT JOIN "users" u ON t."hostId" = u.id
                ORDER BY t."createdAt" DESC
                LIMIT ${parsedLimit} OFFSET ${offset}
            `;

        const countQuery = status
            ? sql`SELECT COUNT(*)::int AS total FROM "tournament" WHERE status = ${status}`
            : sql`SELECT COUNT(*)::int AS total FROM "tournament"`;

        const [resultRows, totalRows] = await Promise.all([
            db.execute(listQuery),
            db.execute(countQuery)
        ]);

        const result = resultRows.rows || [];
        const total = Number(totalRows.rows?.[0]?.total || 0);

        const tournamentIds = result.map(t => t.id);
        const participantRows = tournamentIds.length
            ? await db.select({ tournamentId: registrations.tournamentId, count: count() })
                .from(registrations)
                .where(inArray(registrations.tournamentId, tournamentIds))
                .groupBy(registrations.tournamentId)
            : [];

        const countsMap = new Map(participantRows.map(r => [r.tournamentId, Number(r.count)]));

        const normalized = result.map(t => ({
            ...t,
            hostUsername: t.hostUsername || 'Unknown',
            title: t.name,
            startDate: t.startTime,
            currentParticipants: countsMap.get(t.id) || 0,
            active: ['REGISTRATION', 'REG_CLOSED', 'ONGOING'].includes(t.status)
        }));

        res.json({ success: true, data: { tournaments: normalized, total, page: parsedPage, limit: parsedLimit } });
    } catch (error) {
        console.error('Admin getTournaments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tournaments' });
    }
};

exports.cancelTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
        const tournament = result[0];

        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
        if (['CANCELLED', 'COMPLETED'].includes(tournament.status)) {
            return res.status(400).json({ success: false, message: `Tournament already ${tournament.status}` });
        }

        // Refund participants
        const participants = await db.select({ userId: registrations.userId })
            .from(registrations)
            .where(and(
                eq(registrations.tournamentId, id),
                eq(registrations.paymentStatus, 'COMPLETED')
            ));

        if (participants.length > 0 && tournament.entryFee > 0) {
            for (const p of participants) {
                await db.update(wallets).set({ balance: sql`${wallets.balance} + ${tournament.entryFee}` }).where(eq(wallets.userId, p.userId));
            }
        }

        await db.update(tournaments).set({ status: 'CANCELLED' }).where(eq(tournaments.id, id));
        res.json({ success: true, message: `Tournament cancelled. ${participants.length} participants refunded.`, refunded: participants.length });
    } catch (error) {
        console.error('Admin cancel tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel tournament' });
    }
};

// ─────────────────────────────────────────────
// HOST APPLICATIONS
// ─────────────────────────────────────────────
exports.getHostApplications = async (req, res) => {
    try {
        const requestedStatus = (req.query.status || 'PENDING').toUpperCase();
        let status = requestedStatus;
        if (requestedStatus === 'APPROVED' || requestedStatus === 'VERIFIED') {
            status = 'ACTIVE';
        } else if (requestedStatus === 'REJECTED') {
            status = 'REVOKED';
        }

        const result = await db.select({
            id: hostProfiles.id,
            userId: hostProfiles.userId,
            status: hostProfiles.status,
            createdAt: hostProfiles.createdAt,
            username: users.username,
            email: users.email,
            ign: playerProfiles.ign,
            avatarUrl: playerProfiles.avatarUrl,
            countryCode: users.countryCode
        })
            .from(hostProfiles).leftJoin(users, eq(hostProfiles.userId, users.id)).leftJoin(playerProfiles, eq(hostProfiles.userId, playerProfiles.userId))
            .where(eq(hostProfiles.status, status)).orderBy(desc(hostProfiles.createdAt));

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Admin host applications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch host applications' });
    }
};

exports.reviewHostApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reason } = req.body;

        if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, message: 'Action must be approve or reject' });

        const [application] = await db.select().from(hostProfiles).where(eq(hostProfiles.id, id)).limit(1);
        if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

        if (action === 'approve') {
            await Promise.all([
                db.update(hostProfiles).set({ status: 'ACTIVE' }).where(eq(hostProfiles.id, id)),
                db.update(users).set({ hostStatus: 'VERIFIED', role: 'HOST' }).where(eq(users.id, application.userId))
            ]);
            res.json({ success: true, message: 'Host application approved' });
        } else {
            await db.update(hostProfiles).set({ status: 'REVOKED' }).where(eq(hostProfiles.id, id));
            res.json({ success: true, message: `Host application rejected: ${reason || 'No reason given'}` });
        }
    } catch (error) {
        console.error('Admin host review error:', error);
        res.status(500).json({ success: false, message: 'Failed to process application' });
    }
};

// ─────────────────────────────────────────────
// WALLET MANAGEMENT
// ─────────────────────────────────────────────
exports.getWallets = async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause = search ? or(like(users.email, `%${search}%`), like(users.username, `%${search}%`)) : undefined;

        const result = await db.select({ userId: wallets.userId, balance: wallets.balance, locked: wallets.locked, username: users.username, email: users.email })
            .from(wallets).leftJoin(users, eq(wallets.userId, users.id))
            .where(whereClause).orderBy(desc(wallets.balance)).limit(Number(limit)).offset(offset);

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Admin wallets error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch wallets' });
    }
};

exports.adjustWallet = async (req, res) => {
    try {
        const { userId, amount, type, reason } = req.body;
        if (!userId || !amount || !type || !reason) return res.status(400).json({ success: false, message: 'userId, amount, type, and reason are required' });

        const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
        if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
        if (type === 'debit' && Number(wallet.balance) < Number(amount)) return res.status(400).json({ success: false, message: 'Insufficient balance for debit' });

        await db.update(wallets)
            .set({ balance: type === 'credit' ? sql`${wallets.balance} + ${amount}` : sql`${wallets.balance} - ${amount}`, updatedAt: new Date() })
            .where(eq(wallets.userId, userId));

        console.log(`💳 Admin wallet ${type}: ${amount} for user ${userId}. Reason: ${reason}`);
        res.json({ success: true, message: `Wallet ${type}ed. Reason: ${reason}` });
    } catch (error) {
        console.error('Admin wallet adjust error:', error);
        res.status(500).json({ success: false, message: 'Failed to adjust wallet' });
    }
};

// ─────────────────────────────────────────────
// LEGACY/COMPATIBILITY ENDPOINTS (UI BACKWARD COMPAT)
// ─────────────────────────────────────────────
exports.getApplications = async (req, res) => {
    try {
        const pendingProfiles = await db.select({
            id: hostProfiles.id,
            userId: hostProfiles.userId,
            status: hostProfiles.status,
            createdAt: hostProfiles.createdAt,
            username: users.username,
            email: users.email,
            ign: playerProfiles.ign,
            avatarUrl: playerProfiles.avatarUrl,
            countryCode: users.countryCode
        })
            .from(hostProfiles)
            .leftJoin(users, eq(hostProfiles.userId, users.id))
            .leftJoin(playerProfiles, eq(hostProfiles.userId, playerProfiles.userId))
            .where(eq(hostProfiles.status, 'PENDING'))
            .orderBy(desc(hostProfiles.createdAt));

        const appMeta = await Promise.all(
            pendingProfiles.map(async (profile) => {
                const [latestApplication] = await db.select({
                    notes: hostApplications.notes,
                    documentsUrl: hostApplications.documentsUrl,
                    submittedAt: hostApplications.createdAt
                })
                    .from(hostApplications)
                    .where(eq(hostApplications.userId, profile.userId))
                    .orderBy(desc(hostApplications.createdAt))
                    .limit(1);

                return {
                    ...profile,
                    notes: latestApplication?.notes || null,
                    documentsUrl: latestApplication?.documentsUrl || null,
                    applicationCreatedAt: latestApplication?.submittedAt || null
                };
            })
        );

        return res.json({ success: true, data: appMeta });
    } catch (error) {
        console.error('Admin getApplications error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch applications' });
    }
};

exports.approveApplication = async (req, res) => {
    req.body = { action: 'approve' };
    return exports.reviewHostApplication(req, res);
};

exports.rejectApplication = async (req, res) => {
    req.body = { action: 'reject', reason: req.body?.reason };
    return exports.reviewHostApplication(req, res);
};

exports.getPendingHosts = async (req, res) => {
    req.query.status = 'PENDING';
    return exports.getHostApplications(req, res);
};

exports.getVerifiedHosts = async (req, res) => {
    req.query.status = 'ACTIVE';
    return exports.getHostApplications(req, res);
};

exports.approveHost = async (req, res) => {
    req.body = { action: 'approve' };
    return exports.reviewHostApplication(req, res);
};

exports.deleteHost = async (req, res) => {
    req.body = { action: 'reject', reason: 'Rejected by admin' };
    return exports.reviewHostApplication(req, res);
};

exports.toggleTournamentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const isActive = String(req.query.isActive) === 'true';

        const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
        if (!t) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const status = isActive ? 'REGISTRATION' : 'CANCELLED';
        await db.update(tournaments).set({ status, updatedAt: new Date() }).where(eq(tournaments.id, id));

        return res.json({ success: true, message: `Tournament status set to ${status}` });
    } catch (error) {
        console.error('Toggle tournament status error:', error);
        return res.status(500).json({ success: false, message: 'Failed to update tournament status' });
    }
};

exports.deleteTournamentByAdmin = async (req, res) => {
    return exports.cancelTournament(req, res);
};

exports.reassignWorkload = async (req, res) => {
    const { fromAdminId, toAdminId } = req.body || {};
    if (!fromAdminId || !toAdminId || fromAdminId === toAdminId) {
        return res.status(400).json({ success: false, message: 'Valid source and target admin IDs are required' });
    }

    return res.json({
        success: true,
        message: 'Workload reassignment acknowledged. Assignment model is not enforced in current schema.',
        data: { fromAdminId, toAdminId }
    });
};
