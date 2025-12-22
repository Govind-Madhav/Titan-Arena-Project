/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { mysqlTable, varchar, boolean, datetime, int, text, index, uniqueIndex, primaryKey, bigint } = require('drizzle-orm/mysql-core');
const { sql } = require('drizzle-orm');
const crypto = require('crypto');

// Users table
// UID Counters table
const uidCounters = mysqlTable('uid_counters', {
    regionCode: varchar('region_code', { length: 2 }).notNull(),
    year: int('year').notNull(),
    lastValue: int('last_value').notNull().default(0),
}, (table) => ({
    pk: primaryKey({ columns: [table.regionCode, table.year] }),
}));

// Users table
const users = mysqlTable('user', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    platformUid: varchar('platformUid', { length: 20 }).notNull().unique(),
    username: varchar('username', { length: 191 }).notNull().unique(),
    email: varchar('email', { length: 191 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(), // Renamed from password

    // Legal & Private Info
    legalName: varchar('legalName', { length: 255 }).notNull(),
    dateOfBirth: datetime('dateOfBirth').notNull(), // Using datetime for compatibility, though date is preferred if supported
    phone: varchar('phone', { length: 20 }),
    phoneVerified: boolean('phoneVerified').notNull().default(false),

    // Location
    countryCode: varchar('country_code', { length: 3 }).notNull(), // Renamed from country
    state: varchar('state', { length: 100 }).notNull(),
    city: varchar('city', { length: 100 }),
    regionCode: varchar('regionCode', { length: 2 }).notNull(),

    // Status Flags
    role: varchar('role', { length: 50 }).notNull().default('PLAYER'),
    hostStatus: varchar('hostStatus', { length: 50 }).notNull().default('NOT_VERIFIED'),
    isBanned: boolean('isBanned').notNull().default(false),
    emailVerified: boolean('emailVerified').notNull().default(false),
    registrationCompleted: boolean('registrationCompleted').notNull().default(false),
    termsAccepted: boolean('termsAccepted').notNull().default(false),

    // Profile
    bio: text('bio'),
    avatarUrl: varchar('avatarUrl', { length: 500 }),

    // Auth & Security
    // Removed verificationToken and verificationExpiry as redundant with Redis OTP

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
    userId: varchar('userId', { length: 191 }).notNull(),
    expiresAt: datetime('expiresAt').notNull(),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdIdx: index('refreshToken_userId_idx').on(table.userId),
}));

// Wallets table
const wallets = mysqlTable('wallet', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().unique(),
    balance: bigint('balance', { mode: 'number' }).notNull().default(0), // Updated to bigint
    locked: bigint('locked', { mode: 'number' }).notNull().default(0), // Updated to bigint
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Transactions table
const transactions = mysqlTable('transaction', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull(),
    walletId: varchar('walletId', { length: 191 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // CREDIT or DEBIT
    source: varchar('source', { length: 50 }).notNull(), // TOURNAMENT_ENTRY, WINNING, HOST_EARNING, WITHDRAWAL, DEPOSIT
    amount: int('amount').notNull(),
    balanceAfter: int('balanceAfter').notNull().default(0), // Ledger snapshot
    tournamentId: varchar('tournamentId', { length: 191 }),
    message: varchar('message', { length: 255 }),
    meta: text('meta'), // Legacy metadata field, keeping for compatibility
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
    userId: varchar('userId', { length: 191 }).notNull().unique(),
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
    captainId: varchar('captainId', { length: 191 }).notNull(),
    maxMembers: int('maxMembers').notNull().default(5),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
    captainIdIdx: index('team_captainId_idx').on(table.captainId),
}));

// Team Members table
const teamMembers = mysqlTable('teamMember', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull(),
    teamId: varchar('teamId', { length: 191 }).notNull(),
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
    hostId: varchar('hostId', { length: 191 }).notNull(),
    entryFee: int('entryFee').notNull(),
    prizePool: int('prizePool').notNull(),
    minTeamsRequired: int('minTeamsRequired').notNull(),
    insufficientRegPolicy: varchar('insufficientRegPolicy', { length: 50 }).notNull().default('CANCEL'),
    status: varchar('status', { length: 50 }).notNull().default('UPCOMING'), // CREATED, REGISTRATION, ONGOING, COMPLETED, CANCELLED
    currentRound: int('currentRound').default(0),
    totalRounds: int('totalRounds').default(0),
    winnerId: varchar('winnerId', { length: 191 }),
    startTime: datetime('startTime').notNull(),
    registrationEnd: datetime('registrationEnd').notNull(),
    collected: int('collected').notNull().default(0),
    hostProfit: int('hostProfit').notNull().default(0),
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
    userId: varchar('userId', { length: 191 }).notNull(),
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
    userId: varchar('userId', { length: 191 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(), // TOURNAMENT_START, MATCH_OVERRIDE, etc.
    targetId: varchar('targetId', { length: 191 }), // ID of the object being acted upon
    details: text('details'), // JSON string
    ipAddress: varchar('ipAddress', { length: 45 }),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    targetIdIdx: index('auditLog_targetId_idx').on(table.targetId),
    userIdIdx: index('auditLog_userId_idx').on(table.userId),
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
    matches
};
