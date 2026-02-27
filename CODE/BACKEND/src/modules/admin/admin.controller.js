/**
 * Admin Controller
 * All endpoints require isAdmin: true or role: ADMIN/SUPERADMIN
 */

const { db } = require('../../db');
const {
    users, wallets, playerProfiles, hostProfiles,
    tournaments, tournamentParticipants, refreshTokens
} = require('../../db/schema');
const { eq, desc, count, sql, like, or, and } = require('drizzle-orm');

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────
exports.getStats = async (req, res) => {
    try {
        const [[totalUsers], [totalTournaments], [activeTournaments], [totalPlayers], [totalHosts], [bannedUsers], [walletTotals]] = await Promise.all([
            db.select({ count: count() }).from(users),
            db.select({ count: count() }).from(tournaments),
            db.select({ count: count() }).from(tournaments).where(eq(tournaments.status, 'ACTIVE')),
            db.select({ count: count() }).from(users).where(eq(users.role, 'PLAYER')),
            db.select({ count: count() }).from(users).where(eq(users.hostStatus, 'ACTIVE')),
            db.select({ count: count() }).from(users).where(eq(users.isBanned, true)),
            db.select({ totalBalance: sql`SUM(${wallets.balance})`, totalLocked: sql`SUM(${wallets.locked})` }).from(wallets)
        ]);

        res.json({
            success: true,
            data: {
                users: { total: Number(totalUsers.count), players: Number(totalPlayers.count), hosts: Number(totalHosts.count), banned: Number(bannedUsers.count) },
                tournaments: { total: Number(totalTournaments.count), active: Number(activeTournaments.count) },
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
        const offset = (Number(page) - 1) * Number(limit);

        let conditions = [];
        if (search) conditions.push(or(like(users.email, `%${search}%`), like(users.username, `%${search}%`)));
        if (role) conditions.push(eq(users.role, role));
        if (banned === 'true') conditions.push(eq(users.isBanned, true));
        if (banned === 'false') conditions.push(eq(users.isBanned, false));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [result, [{ total }]] = await Promise.all([
            db.select({ id: users.id, username: users.username, email: users.email, role: users.role, isAdmin: users.isAdmin, hostStatus: users.hostStatus, isBanned: users.isBanned, emailVerified: users.emailVerified, countryCode: users.countryCode, createdAt: users.createdAt, ign: playerProfiles.ign, avatarUrl: playerProfiles.avatarUrl })
                .from(users).leftJoin(playerProfiles, eq(users.id, playerProfiles.userId))
                .where(whereClause).orderBy(desc(users.createdAt)).limit(Number(limit)).offset(offset),
            db.select({ total: count() }).from(users).where(whereClause)
        ]);

        res.json({ success: true, data: { users: result, total: Number(total), page: Number(page), limit: Number(limit) } });
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
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause = status ? eq(tournaments.status, status) : undefined;

        const [result, [{ total }]] = await Promise.all([
            db.select({ id: tournaments.id, title: tournaments.title, status: tournaments.status, entryFee: tournaments.entryFee, prizePool: tournaments.prizePool, maxParticipants: tournaments.maxParticipants, currentParticipants: tournaments.currentParticipants, startDate: tournaments.startDate, hostId: tournaments.hostId, createdAt: tournaments.createdAt, hostUsername: users.username })
                .from(tournaments).leftJoin(users, eq(tournaments.hostId, users.id))
                .where(whereClause).orderBy(desc(tournaments.createdAt)).limit(Number(limit)).offset(offset),
            db.select({ total: count() }).from(tournaments).where(whereClause)
        ]);

        res.json({ success: true, data: { tournaments: result, total: Number(total), page: Number(page), limit: Number(limit) } });
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
        const participants = await db.select({ userId: tournamentParticipants.userId }).from(tournamentParticipants).where(eq(tournamentParticipants.tournamentId, id));

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
        const { status = 'PENDING' } = req.query;
        const result = await db.select({ id: hostProfiles.id, userId: hostProfiles.userId, status: hostProfiles.status, createdAt: hostProfiles.createdAt, username: users.username, email: users.email, ign: playerProfiles.ign, countryCode: users.countryCode })
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
                db.update(hostProfiles).set({ status: 'APPROVED' }).where(eq(hostProfiles.id, id)),
                db.update(users).set({ hostStatus: 'ACTIVE', role: 'HOST' }).where(eq(users.id, application.userId))
            ]);
            res.json({ success: true, message: 'Host application approved' });
        } else {
            await db.update(hostProfiles).set({ status: 'REJECTED' }).where(eq(hostProfiles.id, id));
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
