/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { users, tournaments, registrations, matches, playerProfiles, auditLogs, adminAssignments, hostProfiles } = require('../../db/schema');
const uidService = require('../../services/uid.service'); // Added
const { eq, desc, count, and, or, sql, ne } = require('drizzle-orm');

// Get all users
// Get Pending Players (Unverified Emails or Pending Host Status)
const getPendingPlayers = async (req, res) => {
    try {
        // Implementation: Users who have signed up but have not completed email verification,
        // OR users who have requested HOST status but are 'PENDING'.
        // This gives Admins a actionable list.

        const result = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            hostStatus: users.hostStatus,
            emailVerified: users.emailVerified,
            createdAt: users.createdAt
        })
            .from(users)
            .where(
                or(
                    eq(users.hostStatus, 'PENDING'),
                    eq(users.emailVerified, false)
                )
            )
            .orderBy(desc(users.createdAt))
            .limit(50); // Limit nicely for dashboard widgets

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get pending error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pending actions' });
    }
};

// Get Verified Players (Active Users)
const getVerifiedPlayers = async (req, res) => {
    try {
        const adminId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';
        const isSuperAdmin = req.user.role === 'SUPERADMIN';

        // Query Builder Base
        let query = db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            role: users.role,
            hostStatus: users.hostStatus, // Added Host Status
            platformUid: users.platformUid, // Added details
            isBanned: users.isBanned,
            createdAt: users.createdAt,
            // Join profile fields
            fullName: playerProfiles.realName,
            imageUrl: playerProfiles.avatarUrl,
        })
            .from(users)
            .leftJoin(playerProfiles, eq(users.id, playerProfiles.userId));

        // BASELINE FILTER: Never show banned users in "Verified" list (unless explicit Banned view required later)
        // And Ensure strictly PLAYER role
        const baseCondition = and(
            eq(users.role, 'PLAYER'),
            eq(users.isBanned, false)
        );

        // Isolation Logic
        if (isSuperAdmin) {
            // Super Admin sees ALL valid users below SUPERADMIN level (ADMIN + PLAYER)
            query.where(and(
                ne(users.role, 'SUPERADMIN'),
                eq(users.isBanned, false)
            ));
        } else if (isAdmin) {
            // Admin sees ONLY assigned players
            query
                .innerJoin(adminAssignments, eq(users.id, adminAssignments.userId))
                .where(and(
                    baseCondition, // Admins manage Players only
                    eq(adminAssignments.adminId, adminId),
                    sql`${adminAssignments.revokedAt} IS NULL` // Only active assignments
                    // Note: 'FOR SHARE' is not standard in Drizzle Builder API for straight selects easily without raw, 
                    // but Inner Join + revokedAt check is robust for reading.
                ));
        } else {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const result = await query.orderBy(desc(users.createdAt));

        // Fallback for missing profile data
        const mapped = result.map(u => ({
            ...u,
            fullName: u.fullName || u.username,
            imageUrl: u.imageUrl || 'https://via.placeholder.com/150'
        }));

        res.json({ success: true, data: mapped });
    } catch (error) {
        console.error('Get verified users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

// Get List of Admins (For Super Admin Workload Management)
const getAdmins = async (req, res) => {
    try {
        // Fetch admins
        const admins = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            role: users.role,
            isBanned: users.isBanned
        })
            .from(users)
            .where(
                or(eq(users.role, 'ADMIN'), eq(users.role, 'SUPERADMIN'))
            );

        // Fetch ACTIVE counts from adminAssignments
        // Query: SELECT adminId, COUNT(*) FROM adminAssignments WHERE revokedAt IS NULL GROUP BY adminId
        const activeCounts = await db.select({
            adminId: adminAssignments.adminId,
            count: count()
        })
            .from(adminAssignments)
            .where(sql`${adminAssignments.revokedAt} IS NULL`)
            .groupBy(adminAssignments.adminId);

        // Map counts back to admins
        const result = admins.map(admin => {
            const countObj = activeCounts.find(c => c.adminId === admin.id);
            return {
                ...admin,
                managedUsersCount: countObj ? countObj.count : 0
            };
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get admins error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch admins' });
    }
};

// Approve Player
// Approve Player (Host Verification)
const approvePlayer = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== 'SUPERADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await db.transaction(async (tx) => {
            // 1. Verify User exists and is Pending (or verify intent)
            // Logic: Admins can make ANY 'PLAYER' a 'HOST' even if not requested?
            // User requested if hostStatus is PENDING.
            const target = await tx.select().from(users).where(eq(users.id, id)).limit(1);
            if (!target[0]) throw new Error('User not found');

            // Guard: Idempotency (Check if already a host)
            const existingHost = await tx.select().from(hostProfiles).where(eq(hostProfiles.userId, id)).limit(1);
            if (existingHost[0]) {
                return; // Already a host
            }

            // 2. Generate Host Code (Locked)
            const hostCode = await uidService.generateHostCode(tx);

            // 3. Create Host Profile
            await tx.insert(hostProfiles).values({
                userId: id,
                hostCode: hostCode,
                status: 'ACTIVE', // Auto-activate on approval
                verifiedAt: new Date(),
                verifiedBy: req.user.id
            });

            // 4. Update Legacy Status (for backward compatibility / UI)
            await tx.update(users)
                .set({ hostStatus: 'VERIFIED' })
                .where(eq(users.id, id));

            // Audit
            await tx.insert(auditLogs).values({
                userId: req.user.id,
                action: 'HOST_APPROVAL',
                targetId: id,
                details: JSON.stringify({ hostCode }),
                ipAddress: req.ip
            });
        });

        res.json({ success: true, message: 'Player/Host approved successfully' });
    } catch (error) {
        console.error('Approve player error:', error);
        res.status(500).json({ success: false, message: error.message || 'Approval failed' });
    }
};

// Delete Player (Reject)
// Ban Player (Originally Delete - NOW SOFT BAN)
const deletePlayer = async (req, res) => {
    try {
        if (req.user.role !== 'SUPERADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const targetId = req.params.id;

        // Prevent self-ban
        if (targetId === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot ban yourself' });
        }

        await db.transaction(async (tx) => {
            // Soft Ban
            await tx.update(users)
                .set({ isBanned: true })
                .where(eq(users.id, targetId));

            // Audit
            await tx.insert(auditLogs).values({
                userId: req.user.id,
                action: 'USER_BAN',
                targetId: targetId,
                details: JSON.stringify({ reason: 'Admin Action: Delete/Ban Player' }),
                ipAddress: req.ip
            });
        });

        res.json({ success: true, message: 'Player banned successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Action failed' });
    }
};

const getAllUsers = async (req, res) => {
    // Redirect to getVerifiedPlayers logic or keep raw list
    return getVerifiedPlayers(req, res);
};

// Get all tournaments
const getAllTournaments = async (req, res) => {
    try {
        const result = await db.select({
            id: tournaments.id,
            name: tournaments.name,
            status: tournaments.status,
            hostId: tournaments.hostId,
            entryFee: tournaments.entryFee,
            prizePool: tournaments.prizePool,
            createdAt: tournaments.createdAt,
            game: tournaments.game,
            active: tournaments.status, // Mapping for frontend which might expect 'active' boolean or status string
            startDate: tournaments.startTime,
            joiningFee: tournaments.entryFee,
            gameType: tournaments.type
        })
            .from(tournaments)
            .orderBy(desc(tournaments.createdAt));

        const mapped = result.map(t => ({
            ...t,
            active: t.status === 'ONGOING' || t.status === 'UPCOMING' || t.status === 'REGISTRATION' // Simple mapping
        }));

        res.json({ success: true, data: mapped });
    } catch (error) {
        console.error('Admin get tournaments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tournaments' });
    }
};

// Delete tournament
// Cancel Tournament (Originally Delete - NOW SOFT CANCEL)
const deleteTournament = async (req, res) => {
    try {
        const { id } = req.params;

        // Authorization Guard
        if (req.user.role !== 'SUPERADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await db.transaction(async (tx) => {
            // Check state
            const current = await tx.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
            if (!current[0]) throw new Error('Tournament not found');

            // Prevent cancelling completed
            if (current[0].status === 'COMPLETED') {
                throw new Error('Cannot cancel a completed tournament');
            }

            // Perform Update
            await tx.update(tournaments)
                .set({ status: 'CANCELLED' })
                .where(eq(tournaments.id, id));

            // Log Audit
            await tx.insert(auditLogs).values({
                userId: req.user.id,
                action: 'TOURNAMENT_CANCEL',
                targetId: id,
                details: JSON.stringify({ reason: 'Admin deletion request converted to cancellation' }),
                ipAddress: req.ip
            });
        });

        res.json({ success: true, message: 'Tournament cancelled successfully' });
    } catch (error) {
        console.error('Delete tournament error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to cancel tournament' });
    }
};

// Toggle status
// Toggle status
const toggleTournamentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.query; // string "true"/"false"

        // Authorization
        if (req.user.role !== 'SUPERADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const newStatus = isActive === 'true' ? 'ONGOING' : 'CANCELLED';

        await db.transaction(async (tx) => {
            // Check current status
            const current = await tx.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
            if (!current[0]) throw new Error('Tournament not found');

            // State Machine Guard
            if (current[0].status === 'COMPLETED') {
                throw new Error('Cannot modify a COMPLETED tournament');
            }
            if (current[0].status === 'CANCELLED' && newStatus === 'CANCELLED') {
                // Idempotent is ok, but maybe warn?
                return;
            }

            await tx.update(tournaments)
                .set({ status: newStatus })
                .where(eq(tournaments.id, id));

            // Audit
            await tx.insert(auditLogs).values({
                userId: req.user.id,
                action: 'TOURNAMENT_STATUS_CHANGE',
                targetId: id,
                details: JSON.stringify({ from: current[0].status, to: newStatus }),
                ipAddress: req.ip
            });
        });

        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        console.error('Toggle status error:', error.message);
        res.status(400).json({ success: false, message: error.message || 'Failed to update status' });
    }
};

// Get stats
const getStats = async (req, res) => {
    try {
        // Accurate Stats: Exclude banned, system, admins
        const userCountPromise = db.select({ count: count() })
            .from(users)
            .where(and(
                eq(users.role, 'PLAYER'),
                eq(users.isBanned, false)
            ));

        const tournCountPromise = db.select({ count: count() }).from(tournaments);

        const [userResult, tournResult] = await Promise.all([userCountPromise, tournCountPromise]);

        res.json({
            success: true,
            data: {
                users: userResult[0].count,
                tournaments: tournResult[0].count
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};

// Get User By ID (Stub/Basic impl)
const getUserById = async (req, res) => {
    try {
        const user = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
        if (!user.length) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get user' });
    }
};

// Update User (Stub)
const updateUser = async (req, res) => {
    res.json({ success: true, message: 'User updated (stub)' });
};

// Reassign Workload (SUPERADMIN Only - Transactional)
const reassignWorkload = async (req, res) => {
    try {
        // Authorization Guard
        if (req.user.role !== 'SUPERADMIN') {
            return res.status(403).json({ success: false, message: 'Unauthorized: Super Admin access required' });
        }

        const { fromAdminId, toAdminId } = req.body;
        const superAdminId = req.user.id;

        if (!fromAdminId || !toAdminId) {
            return res.status(400).json({ success: false, message: 'Source and Target Admin IDs required' });
        }

        // Verify target is an Admin
        const targetAdmin = await db.select().from(users).where(eq(users.id, toAdminId)).limit(1);
        if (!targetAdmin[0]) return res.status(404).json({ success: false, message: 'Target admin not found' });
        if (targetAdmin[0].role !== 'ADMIN' && targetAdmin[0].role !== 'SUPERADMIN') {
            return res.status(400).json({ success: false, message: 'Target user is not an Admin' });
        }

        // TRANSACTION: Revoke Old -> Insert New
        await db.transaction(async (tx) => {
            // 1. Identify active assignments to transfer WITH ROW LOCKING (FOR UPDATE)
            // This prevents race conditions where assignments could be modified concurrently
            const activeAssignmentsToRevokeRaw = await tx.execute(sql`
                SELECT * FROM \`adminAssignment\` 
                WHERE \`adminId\` = ${fromAdminId} 
                AND \`revokedAt\` IS NULL 
                FOR UPDATE
            `);

            // Drizzle execute returns differ by driver, standardize input
            const activeAssignmentsToRevoke = activeAssignmentsToRevokeRaw[0] || activeAssignmentsToRevokeRaw.rows || activeAssignmentsToRevokeRaw;

            // If strictly array (mysql2 default for select is [rows, fields]), safely handle
            const rows = Array.isArray(activeAssignmentsToRevoke) ? activeAssignmentsToRevoke : [];

            const countToTransfer = rows.length;

            if (countToTransfer === 0) {
                // Nothing to do, but not an error.
                // Log strictly for debug? No need to pollute audit log if action was empty.
                return;
            }

            // 2. Revoke current assignments (Soft Delete for History)
            await tx.update(adminAssignments)
                .set({ revokedAt: new Date() }) // JS Date -> MySQL Datetime
                .where(and(
                    eq(adminAssignments.adminId, fromAdminId),
                    sql`${adminAssignments.revokedAt} IS NULL`
                ));

            // 3. Insert new assignments
            // Prepare rows: same userId, new adminId, assignedBy me
            const newAssignments = rows.map(assign => ({
                adminId: toAdminId,
                userId: assign.userId,
                assignedBy: superAdminId,
                assignedAt: new Date(),
                revokedAt: null
            }));

            if (newAssignments.length > 0) {
                await tx.insert(adminAssignments).values(newAssignments);
            }

            // 4. Audit Log (Within Transaction)
            await tx.insert(auditLogs).values({
                userId: superAdminId,
                action: 'WORKLOAD_REASSIGN',
                targetId: toAdminId,
                details: JSON.stringify({
                    fromAdminId,
                    toAdminId,
                    transferredCount: countToTransfer
                }),
                ipAddress: req.ip
            });
        });

        res.json({
            success: true,
            message: `Workload reassigned successfully.`
        });

    } catch (error) {
        console.error('Reassign workload error:', error);
        res.status(500).json({ success: false, message: 'Failed to reassign workload' });
    }
};

// --- HOST APPLICATION MANAGEMENT (PHASE 3) ---

// 1. Get Pending Applications
const getPendingHostApplications = async (req, res) => {
    try {
        const apps = await db.select({
            id: hostApplications.id,
            userId: hostApplications.userId,
            username: users.username,
            email: users.email,
            notes: hostApplications.notes,
            documentsUrl: hostApplications.documentsUrl,
            createdAt: hostApplications.createdAt
        })
            .from(hostApplications)
            .innerJoin(users, eq(hostApplications.userId, users.id))
            .where(eq(hostApplications.status, 'PENDING'))
            .orderBy(desc(hostApplications.createdAt));

        res.json({ success: true, data: apps });
    } catch (error) {
        console.error('Fetch apps error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};

// 2. Approve Application
const approveHostApplication = async (req, res) => {
    const { applicationId } = req.params;
    const adminId = req.user.id;

    try {
        await db.transaction(async (tx) => {
            // Get Application
            const app = await tx.select().from(hostApplications).where(eq(hostApplications.id, applicationId)).limit(1);
            if (!app[0]) throw new Error('Application not found');
            if (app[0].status !== 'PENDING') throw new Error('Application already processed');

            const userId = app[0].userId;

            // 1. Generate HT Code (Atomic)
            const hostCode = await uidService.generateHostCode(tx);

            // 2. Create Host Profile
            const existingProfile = await tx.select().from(hostProfiles).where(eq(hostProfiles.userId, userId));
            if (existingProfile.length > 0) {
                await tx.update(hostProfiles).set({
                    status: 'ACTIVE',
                    verifiedAt: new Date(),
                    verifiedBy: adminId,
                    hostCode: hostCode
                }).where(eq(hostProfiles.userId, userId));
            } else {
                await tx.insert(hostProfiles).values({
                    userId,
                    hostCode,
                    status: 'ACTIVE',
                    verifiedAt: new Date(),
                    verifiedBy: adminId
                });
            }

            // 3. Update Application Status
            await tx.update(hostApplications)
                .set({ status: 'APPROVED', reviewedAt: new Date(), reviewedBy: adminId })
                .where(eq(hostApplications.id, applicationId));

            // 4. Update Legacy Status (Backward Comp)
            await tx.update(users)
                .set({ hostStatus: 'VERIFIED' })
                .where(eq(users.id, userId));
        });

        res.json({ success: true, message: 'Application Approved. Host Profile Created.' });
    } catch (error) {
        console.error('Approval Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Reject Application
const rejectHostApplication = async (req, res) => {
    const { applicationId } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body;

    try {
        await db.update(hostApplications)
            .set({
                status: 'REJECTED',
                notes: reason ? `REJECTION REASON: ${reason}` : undefined,
                reviewedAt: new Date(),
                reviewedBy: adminId
            })
            .where(eq(hostApplications.id, applicationId));

        res.json({ success: true, message: 'Application Rejected.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to reject.' });
    }
};

module.exports = {
    getAllUsers,
    getPendingPlayers,
    getVerifiedPlayers,
    getAdmins,
    approvePlayer,
    deletePlayer,
    getUserById,
    updateUser,
    updateUserRole: (req, res) => res.status(501).json({}),
    getAllTournaments,
    deleteTournament,
    getStats,
    toggleTournamentStatus,
    reassignWorkload,
    getPendingHostApplications,
    approveHostApplication,
    rejectHostApplication
};
