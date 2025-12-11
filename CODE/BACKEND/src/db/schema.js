/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { mysqlTable, varchar, boolean, datetime, int, text, index, uniqueIndex } = require('drizzle-orm/mysql-core');
const { sql } = require('drizzle-orm');

// Users table
const users = mysqlTable('user', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: varchar('email', { length: 191 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    username: varchar('username', { length: 191 }).notNull().unique(),
    role: varchar('role', { length: 50 }).notNull().default('PLAYER'),
    hostStatus: varchar('hostStatus', { length: 50 }).notNull().default('NOT_VERIFIED'),
    isBanned: boolean('isBanned').notNull().default(false),
    emailVerified: boolean('emailVerified').notNull().default(false),
    bio: text('bio'),
    avatarUrl: varchar('avatarUrl', { length: 500 }),
    verificationToken: varchar('verificationToken', { length: 191 }).unique(),
    verificationExpiry: datetime('verificationExpiry'),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

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
    balance: int('balance').notNull().default(0),
    locked: int('locked').notNull().default(0),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Transactions table
const transactions = mysqlTable('transaction', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull(),
    walletId: varchar('walletId', { length: 191 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    amount: int('amount').notNull(),
    message: varchar('message', { length: 255 }),
    meta: text('meta'),
    status: varchar('status', { length: 50 }).notNull().default('COMPLETED'),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdIdx: index('transaction_userId_idx').on(table.userId),
    walletIdIdx: index('transaction_walletId_idx').on(table.walletId),
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
    status: varchar('status', { length: 50 }).notNull().default('UPCOMING'),
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
    teamAId: varchar('teamAId', { length: 191 }),
    teamBId: varchar('teamBId', { length: 191 }),
    scoreA: int('scoreA').default(0),
    scoreB: int('scoreB').default(0),
    winnerId: varchar('winnerId', { length: 191 }),
    status: varchar('status', { length: 50 }).notNull().default('SCHEDULED'),
    startTime: datetime('startTime'),
    endTime: datetime('endTime'),
    createdAt: datetime('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
    tournamentIdIdx: index('match_tournamentId_idx').on(table.tournamentId),
    winnerIdIdx: index('match_winnerId_idx').on(table.winnerId),
}));

module.exports = {
    users,
    refreshTokens,
    wallets,
    transactions,
    kycRequests,
    teams,
    teamMembers,
    tournaments,
    notifications,
    games,
    registrations,
    matches
};
