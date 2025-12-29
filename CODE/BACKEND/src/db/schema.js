/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { mysqlTable, varchar, boolean, datetime, int, text, index, uniqueIndex, primaryKey, bigint, timestamp, mysqlEnum } = require('drizzle-orm/mysql-core');
const { sql } = require('drizzle-orm');
const crypto = require('crypto');

// Users table
// UID Counters table
// ⚠️ CONCURRENCY WARNING:
// Do not blindly SELECT and UPDATE this table. You MUST use atomic increments:
// UPDATE uid_counters SET lastValue = LAST_INSERT_ID(lastValue + 1) WHERE ...
// SELECT LAST_INSERT_ID();
const uidCounters = mysqlTable('uid_counters', {
    regionCode: varchar('region_code', { length: 2 }).notNull(),
    year: int('year').notNull(),
    lastValue: int('last_value').notNull().default(0),
}, (table) => ({
    pk: primaryKey({ columns: [table.regionCode, table.year] }),
}));

// User Counters (ID Generation)
const userCounters = mysqlTable('user_counters', {
    key: varchar('key', { length: 20 }).primaryKey(), // 'PLAYER_CODE', 'HOST_CODE', 'ADMIN_CODE'
    lastNumber: int('last_number').notNull().default(0)
});

// Host Profiles (Operational Extension)
const hostProfiles = mysqlTable('host_profiles', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 191 }).notNull().unique(), // FK to users.id
    hostCode: varchar('host_code', { length: 20 }).unique().notNull(), // HTxxxx
    status: mysqlEnum('status', ['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED']).default('PENDING').notNull(),
    verifiedAt: timestamp('verified_at'),
    verifiedBy: varchar('verified_by', { length: 191 }), // FK to users.id (Admin)
    createdAt: timestamp('created_at').defaultNow()
});

// Host Applications (Phase 3 Strict)
const hostApplications = mysqlTable('host_applications', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id),
    status: mysqlEnum('status', ['PENDING', 'APPROVED', 'REJECTED']).default('PENDING').notNull(),
    documentsUrl: text('documents_url'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    reviewedAt: timestamp('reviewed_at'),
    reviewedBy: varchar('reviewed_by', { length: 191 }).references(() => users.id)
});

// Posts (Phase 4 Strict)
const posts = mysqlTable('posts', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id),
    content: text('content').notNull(),
    type: mysqlEnum('type', ['GENERAL', 'ACHIEVEMENT', 'TOURNAMENT_UPDATE']).notNull(),
    mediaUrl: text('media_url'),
    likesCount: int('likes_count').default(0),
    isDeleted: boolean('is_deleted').default(false),
    createdAt: timestamp('created_at').defaultNow()
});

// Users table
const users = mysqlTable('user', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    username: varchar('username', { length: 191 }).notNull().unique(),
    email: varchar('email', { length: 191 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),

    // New Identity Fields (Final Architecture)
    playerCode: varchar('player_code', { length: 20 }).unique(), // PLxxxx (Nullable until migration)
    isAdmin: boolean('is_admin').default(false),

    // Legal & Private Info
    legalName: varchar('legalName', { length: 255 }).notNull(),
    dateOfBirth: datetime('dateOfBirth').notNull(),
    phone: varchar('phone', { length: 20 }),
    phoneVerified: boolean('phoneVerified').notNull().default(false),
    phoneVisibility: varchar('phoneVisibility', { length: 20 }).notNull().default('private'),

    // Location
    countryCode: varchar('country_code', { length: 3 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    city: varchar('city', { length: 100 }),
    regionCode: varchar('regionCode', { length: 2 }).notNull(),

    // Status Flags
    // DEPRECATED (Migration Only): role, hostStatus, platformUid
    role: varchar('role', { length: 50 }).notNull().default('PLAYER'), // -> use isAdmin / hostProfiles
    hostStatus: varchar('hostStatus', { length: 50 }).notNull().default('NOT_VERIFIED'), // -> use hostProfiles.status
    // Keeping platformUid briefly - mapped to old UID logic
    platformUid: varchar('platformUid', { length: 20 }).unique(), // -> use playerCode

    isBanned: boolean('isBanned').notNull().default(false),
    emailVerified: boolean('emailVerified').notNull().default(false),
    registrationCompleted: boolean('registrationCompleted').notNull().default(false),
    termsAccepted: boolean('termsAccepted').notNull().default(false),

    // Enterprise Security Fields
    passwordUpdatedAt: datetime('passwordUpdatedAt'),
    lastLoginAt: datetime('lastLoginAt'),
    failedLoginCount: int('failedLoginCount').default(0),

    // Profile
    bio: text('bio'),
    avatarUrl: varchar('avatarUrl', { length: 500 }),

    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
    platformUidIdx: uniqueIndex('user_platformUid_idx').on(table.platformUid),
    usernameIdx: uniqueIndex('user_username_idx').on(table.username),
    emailIdx: uniqueIndex('user_email_idx').on(table.email),
    regionCodeIdx: index('user_regionCode_idx').on(table.regionCode),
    countryCodeIdx: index('user_country_code_idx').on(table.countryCode),
}));

// Refresh Tokens table
const refreshTokens = mysqlTable('refreshToken', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    token: varchar('token', { length: 500 }).notNull().unique(),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    expiresAt: datetime('expiresAt').notNull(),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdIdx: index('refreshToken_userId_idx').on(table.userId),
}));

// Wallets table
const wallets = mysqlTable('wallet', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().unique().references(() => users.id),
    balance: bigint('balance', { mode: 'number' }).notNull().default(0), // Updated to bigint
    locked: bigint('locked', { mode: 'number' }).notNull().default(0), // Updated to bigint
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Transactions table
const transactions = mysqlTable('transaction', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    walletId: varchar('walletId', { length: 191 }).notNull().references(() => wallets.id),
    type: varchar('type', { length: 50 }).notNull(), // CREDIT or DEBIT
    source: varchar('source', { length: 50 }).notNull(), // TOURNAMENT_ENTRY, WINNING, HOST_EARNING, WITHDRAWAL, DEPOSIT
    amount: bigint('amount', { mode: 'number' }).notNull(),
    balanceAfter: bigint('balanceAfter', { mode: 'number' }).notNull().default(0), // Ledger snapshot
    tournamentId: varchar('tournamentId', { length: 191 }),
    message: varchar('message', { length: 255 }),
    metadata: text('metadata'), // New JSON metadata field (using text for MySQL compatibility if json not supported perfectly in all versions, or use json mode)
    status: varchar('status', { length: 50 }).notNull().default('COMPLETED'),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdIdx: index('transaction_userId_idx').on(table.userId),
    walletIdIdx: index('transaction_walletId_idx').on(table.walletId),
    tournamentIdIdx: index('transaction_tournamentId_idx').on(table.tournamentId),
    sourceIdx: index('transaction_source_idx').on(table.source),
}));

// KYC Requests table
const kycRequests = mysqlTable('kycRequest', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().unique().references(() => users.id),
    documentType: varchar('documentType', { length: 100 }).notNull(),
    proofUrl: varchar('proofUrl', { length: 500 }).notNull(),
    selfieUrl: varchar('selfieUrl', { length: 500 }).notNull(),
    rankProofUrl: varchar('rankProofUrl', { length: 500 }),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'),
    adminNotes: text('adminNotes'),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Teams table
const teams = mysqlTable('team', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 191 }).notNull(),
    captainId: varchar('captainId', { length: 191 }).notNull().references(() => users.id),
    maxMembers: int('maxMembers').notNull().default(5),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
    captainIdIdx: index('team_captainId_idx').on(table.captainId),
}));

// Team Members table
const teamMembers = mysqlTable('teamMember', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    teamId: varchar('teamId', { length: 191 }).notNull().references(() => teams.id),
    role: varchar('role', { length: 50 }).notNull().default('MEMBER'),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    teamIdIdx: index('teamMember_teamId_idx').on(table.teamId),
    userTeamUnique: uniqueIndex('teamMember_userId_teamId_unique').on(table.userId, table.teamId),
}));

// Tournaments table
const tournaments = mysqlTable('tournament', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 255 }).notNull(),
    game: varchar('game', { length: 100 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(),
    teamSize: int('teamSize'),
    hostId: varchar('hostId', { length: 191 }).notNull().references(() => users.id),
    entryFee: bigint('entryFee', { mode: 'number' }).notNull(),
    prizePool: bigint('prizePool', { mode: 'number' }).notNull(),
    minTeamsRequired: int('minTeamsRequired').notNull(),
    insufficientRegPolicy: varchar('insufficientRegPolicy', { length: 50 }).notNull().default('CANCEL'),
    status: varchar('status', { length: 50 }).notNull().default('UPCOMING'), // CREATED, REGISTRATION, ONGOING, COMPLETED, CANCELLED
    currentRound: int('currentRound').default(0),
    totalRounds: int('totalRounds').default(0),
    winnerId: varchar('winnerId', { length: 191 }),
    startTime: datetime('startTime').notNull(),
    registrationEnd: datetime('registrationEnd').notNull(),
    collected: bigint('collected', { mode: 'number' }).notNull().default(0),
    hostProfit: bigint('hostProfit', { mode: 'number' }).notNull().default(0),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
    hostIdIdx: index('tournament_hostId_idx').on(table.hostId),
    statusIdx: index('tournament_status_idx').on(table.status),
    gameIdx: index('tournament_game_idx').on(table.game),
}));

// Notifications table
const notifications = mysqlTable('notification', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    type: varchar('type', { length: 50 }).notNull().default('INFO'),
    isRead: boolean('isRead').notNull().default(false),
    meta: text('meta'),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdIdx: index('notification_userId_idx').on(table.userId),
    isReadIdx: index('notification_isRead_idx').on(table.isRead),
}));

// Audit Logs table
const auditLogs = mysqlTable('auditLog', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(), // TOURNAMENT_START, MATCH_OVERRIDE, etc.
    targetId: varchar('targetId', { length: 191 }), // ID of the object being acted upon
    details: text('details'), // JSON string
    ipAddress: varchar('ipAddress', { length: 45 }),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    targetIdIdx: index('auditLog_targetId_idx').on(table.targetId),
    userIdIdx: index('auditLog_userId_idx').on(table.userId),
    createdAtIdx: index('auditLog_createdAt_idx').on(table.createdAt), // Enterprise: Time-based lookup
}));

// Admin Assignments Table (Enterprise Delegation History)
const adminAssignments = mysqlTable('adminAssignment', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    adminId: varchar('adminId', { length: 191 }).notNull().references(() => users.id), // The Manager
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),   // The Managed User/Host
    assignedBy: varchar('assignedBy', { length: 191 }).notNull().references(() => users.id), // Super Admin who did it
    assignedAt: datetime('assignedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    revokedAt: datetime('revokedAt'), // Null = Active, Timestamp = History
}, (table) => ({
    adminIdIdx: index('adminAssignment_adminId_idx').on(table.adminId),
    userIdIdx: index('adminAssignment_userId_idx').on(table.userId),
    // NOTE: MySQL cannot enforce partial uniqueness (WHERE revokedAt IS NULL).
    // Active assignment uniqueness is enforced via transactional locking in logic.
    activeAssignmentIdx: index('adminAssignment_active_idx').on(table.userId, table.revokedAt), // Optimization for "Who manages this user now?"
}));

// Games table
const games = mysqlTable('game', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 191 }).notNull().unique(),
    slug: varchar('slug', { length: 191 }).notNull().unique(),
    shortName: varchar('shortName', { length: 100 }),
    logoUrl: text('logoUrl'),
    bannerUrl: text('bannerUrl'),
    description: text('description'),
    isActive: boolean('isActive').notNull().default(true),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
    slugIdx: index('game_slug_idx').on(table.slug),
}));

// Registrations table
const registrations = mysqlTable('registration', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    tournamentId: varchar('tournamentId', { length: 191 }).notNull(),
    teamId: varchar('teamId', { length: 191 }),
    userId: varchar('userId', { length: 191 }),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'),
    paymentStatus: varchar('paymentStatus', { length: 50 }).notNull().default('PENDING'),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
    tournamentIdIdx: index('registration_tournamentId_idx').on(table.tournamentId),
    teamIdIdx: index('registration_teamId_idx').on(table.teamId),
    userIdIdx: index('registration_userId_idx').on(table.userId),
}));

// Matches table
const matches = mysqlTable('match', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    tournamentId: varchar('tournamentId', { length: 191 }).notNull(),
    round: int('round').notNull(),
    matchNumber: int('matchNumber').notNull(),
    participantAId: varchar('participantAId', { length: 191 }), // User or Team ID
    participantBId: varchar('participantBId', { length: 191 }),
    nextMatchId: varchar('nextMatchId', { length: 191 }), // Self-relation
    positionInNextMatch: int('positionInNextMatch'), // 1 or 2
    scoreA: int('scoreA').default(0),
    scoreB: int('scoreB').default(0),
    winnerId: varchar('winnerId', { length: 191 }),
    status: varchar('status', { length: 50 }).notNull().default('SCHEDULED'), // SCHEDULED, AWAITING_RESULT, COMPLETED, DISPUTED
    isBye: boolean('isBye').default(false),
    locked: boolean('locked').default(false), // For concussion safety
    startTime: datetime('startTime'),
    endTime: datetime('endTime'),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
    tournamentIdIdx: index('match_tournamentId_idx').on(table.tournamentId),
    winnerIdIdx: index('match_winnerId_idx').on(table.winnerId),
}));

// Player Profiles table (Core Identity)
const playerProfiles = mysqlTable('playerProfile', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().unique(), // Foreign Key to users

    // Identity
    ign: varchar('ign', { length: 191 }), // In-Game Name
    realName: varchar('realName', { length: 255 }),
    dateOfBirth: datetime('dateOfBirth'),
    avatarUrl: varchar('avatarUrl', { length: 500 }),
    bio: text('bio'),

    // Location
    country: varchar('country', { length: 100 }),
    state: varchar('state', { length: 100 }),
    city: varchar('city', { length: 100 }),
    preferredServer: varchar('preferredServer', { length: 50 }), // Asia, SEA, MiddleEast

    // Contact (Discord)
    discordId: varchar('discordId', { length: 100 }),
    discordVisibility: varchar('discordVisibility', { length: 20 }).default('private'), // public, team, private

    // Preferences
    skillLevel: varchar('skillLevel', { length: 50 }), // Beginner, SemiPro, Pro
    playStyle: varchar('playStyle', { length: 50 }), // Aggressive, Tactical, Balanced

    // Availability
    availableDays: varchar('availableDays', { length: 50 }), // Weekdays, Weekends, Both
    availableTime: varchar('availableTime', { length: 50 }), // Morning, Evening, Night

    // System
    completionPercentage: int('completionPercentage').default(0),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdIdx: uniqueIndex('playerProfile_userId_idx').on(table.userId),
    ignIdx: index('playerProfile_ign_idx').on(table.ign),
}));

// Player Game Profiles table (Multi-Game)
const playerGameProfiles = mysqlTable('playerGameProfile', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull(),

    game: varchar('game', { length: 50 }).notNull(), // BGMI, Valorant, CS2, FreeFire
    inGameName: varchar('inGameName', { length: 191 }).notNull(),
    inGameId: varchar('inGameId', { length: 191 }).notNull(),

    verificationStatus: varchar('verificationStatus', { length: 50 }).default('PENDING'), // PENDING, VERIFIED, REJECTED
    verifiedBy: varchar('verifiedBy', { length: 191 }), // Admin ID

    meta: text('meta'), // JSON: rank, tier, level

    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdIdx: index('playerGameProfile_userId_idx').on(table.userId),
    gameIdIdx: index('playerGameProfile_game_inGameId_idx').on(table.game, table.inGameId),
}));

// Disputes table
const disputes = mysqlTable('dispute', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    matchId: varchar('matchId', { length: 191 }).notNull().references(() => matches.id),
    raisedById: varchar('raisedById', { length: 191 }).notNull().references(() => users.id),
    reason: text('reason').notNull(),
    evidenceUrl: varchar('evidenceUrl', { length: 500 }),
    status: varchar('status', { length: 50 }).notNull().default('OPEN'), // OPEN, RESOLVED, REJECTED
    resolution: text('resolution'),
    resolvedAt: datetime('resolvedAt'),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
    matchIdIdx: index('dispute_matchId_idx').on(table.matchId),
    raisedByIdIdx: index('dispute_raisedById_idx').on(table.raisedById),
    statusIdx: index('dispute_status_idx').on(table.status),
}));



module.exports = {
    uidCounters,
    users,
    refreshTokens,
    wallets,
    transactions,
    kycRequests,
    teams,
    teamMembers,
    tournaments,
    notifications,
    auditLogs,
    games,
    registrations,
    matches,
    playerProfiles,
    playerGameProfiles,
    adminAssignments,
    disputes,
    userCounters,
    hostProfiles,
    hostApplications, // New
    posts // New
};
