// @ts-nocheck
/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { pgTable, varchar, boolean, timestamp, integer, text, index, uniqueIndex, primaryKey, bigint, json, numeric, doublePrecision } = require('drizzle-orm/pg-core');
const { pgEnum } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const crypto = require('node:crypto');

// Define PostgreSQL Enums
const authProviderEnum = pgEnum('auth_provider', ['FIREBASE', 'LEGACY']);
const hostStatusEnum = pgEnum('host_status_enum', ['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED']);
const hostApplicationStatusEnum = pgEnum('host_application_status', ['PENDING', 'APPROVED', 'REJECTED']);
const postTypeEnum = pgEnum('post_type', ['GENERAL', 'ACHIEVEMENT', 'TOURNAMENT_UPDATE']);

// Users table
const users = pgTable('users', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    username: varchar('username', { length: 191 }).notNull().unique(),
    email: varchar('email', { length: 191 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    recoveryEmail: varchar('recovery_email', { length: 191 }),
    mfaEnabled: boolean('mfa_enabled').default(false),
    mfaSecret: varchar('mfa_secret', { length: 255 }),

    // Firebase Auth Bridge (Hardened Identity)
    firebaseUid: varchar('firebase_uid', { length: 128 }).unique(),
    authProvider: authProviderEnum('auth_provider').default('FIREBASE'),

    // New Identity Fields (Final Architecture)
    playerCode: varchar('player_code', { length: 20 }).unique(),
    isAdmin: boolean('is_admin').default(false),

    // Legal & Private Info
    legalName: varchar('legalName', { length: 255 }).notNull(),
    dateOfBirth: timestamp('dateOfBirth').notNull(),
    phone: varchar('phone', { length: 20 }),
    phoneVerified: boolean('phoneVerified').notNull().default(false),
    phoneVisibility: varchar('phoneVisibility', { length: 20 }).notNull().default('private'),

    // Privacy & Media
    mediaVisibility: varchar('media_visibility', { length: 20 }).default('public'),

    // Billing (Structured)
    invoiceEmail: varchar('invoice_email', { length: 191 }),
    billingAddress: json('billing_address'),

    // Lifecycle
    deactivatedAt: timestamp('deactivated_at'),
    usernameChangeCount: integer('username_change_count').default(0),

    // Location
    countryCode: varchar('country_code', { length: 3 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    city: varchar('city', { length: 100 }),

    // Region System
    regionCode: integer('region_code').notNull(),
    subRegionCode: varchar('sub_region_code', { length: 10 }),

    // Status Flags
    role: varchar('role', { length: 50 }).notNull().default('PLAYER'),
    hostStatus: varchar('hostStatus', { length: 50 }).notNull().default('NOT_VERIFIED'),
    platformUid: varchar('platformUid', { length: 20 }).unique(),
    hostUid: varchar('hostUid', { length: 20 }).unique(),
    adminUid: varchar('adminUid', { length: 20 }).unique(),
    superAdminUid: varchar('superAdminUid', { length: 20 }).unique(),

    isBanned: boolean('isBanned').notNull().default(false),
    emailVerified: boolean('emailVerified').notNull().default(false),
    registrationCompleted: boolean('registrationCompleted').notNull().default(false),
    termsAccepted: boolean('termsAccepted').notNull().default(false),

    // Enterprise Security Fields
    passwordUpdatedAt: timestamp('passwordUpdatedAt'),
    lastLoginAt: timestamp('lastLoginAt'),
    failedLoginCount: integer('failedLoginCount').default(0),

    // Profile
    bio: text('bio'),
    avatarUrl: varchar('avatarUrl', { length: 500 }),

    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    platformUidIdx: uniqueIndex('user_platformUid_idx').on(table.platformUid),
    hostUidIdx: uniqueIndex('user_hostUid_idx').on(table.hostUid),
    adminUidIdx: uniqueIndex('user_adminUid_idx').on(table.adminUid),
    superAdminUidIdx: uniqueIndex('user_superAdminUid_idx').on(table.superAdminUid),
    usernameIdx: uniqueIndex('user_username_idx').on(table.username),
    emailIdx: uniqueIndex('user_email_idx').on(table.email),
    regionCodeIdx: index('user_regionCode_idx').on(table.regionCode),
    countryCodeIdx: index('user_country_code_idx').on(table.countryCode),
    firebaseUidIdx: index('idx_firebase_uid').on(table.firebaseUid),
}));

// UID Counters Table (Platform-wide)
const uidCounters = pgTable('uid_counters', {
    region: integer('region').primaryKey(),
    lastValue: bigint('last_value', { mode: 'number' }).notNull().default(0),
    updatedAt: timestamp('updated_at').defaultNow()
});

// User Counters Table (Legacy/Specific)
const userCounters = pgTable('user_counters', {
    key: varchar('key', { length: 20 }).primaryKey(),
    lastNumber: integer('last_number').notNull().default(0)
});

// Host Profiles
const hostProfiles = pgTable('host_profiles', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 191 }).notNull().unique(),
    hostCode: varchar('host_code', { length: 20 }).unique().notNull(),
    status: hostStatusEnum('status').default('PENDING').notNull(),
    verifiedAt: timestamp('verified_at'),
    verifiedBy: varchar('verified_by', { length: 191 }),
    createdAt: timestamp('created_at').defaultNow()
});

// Host Applications
const hostApplications = pgTable('host_applications', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id),
    status: hostApplicationStatusEnum('status').default('PENDING').notNull(),
    documentsUrl: text('documents_url'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    reviewedAt: timestamp('reviewed_at'),
    reviewedBy: varchar('reviewed_by', { length: 191 }).references(() => users.id)
});

// Posts
const posts = pgTable('posts', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id),
    content: text('content').notNull(),
    type: postTypeEnum('type').notNull(),
    mediaUrl: text('media_url'),
    likesCount: integer('likes_count').default(0),
    isDeleted: boolean('is_deleted').default(false),
    createdAt: timestamp('created_at').defaultNow()
});

// Refresh Tokens table
const refreshTokens = pgTable('refreshtoken', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    token: varchar('token', { length: 500 }).notNull().unique(),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    expiresAt: timestamp('expiresAt').notNull(),
    userAgent: varchar('user_agent', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
    userIdIdx: index('refreshToken_userId_idx').on(table.userId),
}));

// Wallets table
const wallets = pgTable('wallet', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().unique().references(() => users.id),
    balance: bigint('balance', { mode: 'number' }).notNull(),
    locked: bigint('locked', { mode: 'number' }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
    createdAt: timestamp('createdAt').notNull(),
    updatedAt: timestamp('updatedAt').notNull(),
});

// Transactions table
const transactions = pgTable('transaction', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    walletId: varchar('walletId', { length: 191 }).notNull().references(() => wallets.id),
    type: varchar('type', { length: 50 }).notNull(),
    source: varchar('source', { length: 50 }).notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    balanceAfter: bigint('balanceAfter', { mode: 'number' }).notNull().default(0),
    tournamentId: varchar('tournamentId', { length: 191 }),
    message: varchar('message', { length: 255 }),
    metadata: text('metadata'),
    status: varchar('status', { length: 50 }).notNull().default('COMPLETED'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
    userIdIdx: index('transaction_userId_idx').on(table.userId),
    walletIdIdx: index('transaction_walletId_idx').on(table.walletId),
    tournamentIdIdx: index('transaction_tournamentId_idx').on(table.tournamentId),
    sourceIdx: index('transaction_source_idx').on(table.source),
}));

// KYC Requests table
const kycRequests = pgTable('kycrequest', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().unique().references(() => users.id),
    documentType: varchar('documentType', { length: 100 }).notNull(),
    proofUrl: varchar('proofUrl', { length: 500 }).notNull(),
    selfieUrl: varchar('selfieUrl', { length: 500 }).notNull(),
    rankProofUrl: varchar('rankProofUrl', { length: 500 }),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'),
    adminNotes: text('adminNotes'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

// Teams table
const teams = pgTable('team', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 191 }).notNull(),
    captainId: varchar('captainId', { length: 191 }).notNull().references(() => users.id),
    maxMembers: integer('maxMembers').notNull().default(5),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    captainIdIdx: index('team_captainId_idx').on(table.captainId),
}));

// Team Members table
const teamMembers = pgTable('teammember', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    teamId: varchar('teamId', { length: 191 }).notNull().references(() => teams.id),
    role: varchar('role', { length: 50 }).notNull().default('MEMBER'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
    teamIdIdx: index('teamMember_teamId_idx').on(table.teamId),
    userTeamUnique: uniqueIndex('teamMember_userId_teamId_unique').on(table.userId, table.teamId),
}));

// Tournaments table
const tournaments = pgTable('tournament', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 255 }).notNull(),
    game: varchar('game', { length: 100 }).notNull(),
    description: text('description'),
    rules: text('rules'),
    highlightUrl: varchar('highlightUrl', { length: 500 }),
    bannerUrl: varchar('bannerUrl', { length: 500 }),
    streamUrl: text('streamUrl'),
    streamPlatform: varchar('streamPlatform', { length: 20 }).default('OTHER'),
    streamId: varchar('streamId', { length: 191 }),
    streamScope: varchar('streamScope', { length: 20 }).default('MATCH'),
    streamIsLive: boolean('streamIsLive').notNull().default(false),
    type: varchar('type', { length: 50 }).notNull(),
    format: varchar('format', { length: 50 }).notNull().default('SINGLE_ELIMINATION'), // bracket format
    seeding: varchar('seeding', { length: 20 }).notNull().default('RANDOM'),           // RANDOM | MMR
    teamSize: integer('teamSize'),
    hostId: varchar('hostId', { length: 191 }).notNull().references(() => users.id),
    entryFee: bigint('entryFee', { mode: 'number' }).notNull(),
    prizePool: bigint('prizePool', { mode: 'number' }).notNull(),
    minTeamsRequired: integer('minTeamsRequired').notNull(),
    maxParticipants: integer('maxParticipants'),
    insufficientRegPolicy: varchar('insufficientRegPolicy', { length: 50 }).notNull().default('CANCEL'),
    status: varchar('status', { length: 50 }).notNull().default('UPCOMING'),
    currentRound: integer('currentRound').default(0),
    totalRounds: integer('totalRounds').default(0),
    winnerId: varchar('winnerId', { length: 191 }),
    startTime: timestamp('startTime').notNull(),
    registrationEnd: timestamp('registrationEnd').notNull(),
    checkinStart: timestamp('checkinStart'),      // check-in window opens
    checkinEnd: timestamp('checkinEnd'),          // check-in window closes
    collected: bigint('collected', { mode: 'number' }).notNull().default(0),
    hostProfit: bigint('hostProfit', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    hostIdIdx: index('tournament_hostId_idx').on(table.hostId),
    statusIdx: index('tournament_status_idx').on(table.status),
    gameIdx: index('tournament_game_idx').on(table.game),
}));

// Notifications table
const notifications = pgTable('notification', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    type: varchar('type', { length: 50 }).notNull().default('INFO'),
    isRead: boolean('isRead').notNull().default(false),
    meta: text('meta'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
    userIdIdx: index('notification_userId_idx').on(table.userId),
    isReadIdx: index('notification_isRead_idx').on(table.isRead),
}));

// Audit Logs table
const auditLogs = pgTable('auditlog', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    action: varchar('action', { length: 100 }).notNull(),
    targetId: varchar('targetId', { length: 191 }),
    details: text('details'),
    ipAddress: varchar('ipAddress', { length: 45 }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
    targetIdIdx: index('auditLog_targetId_idx').on(table.targetId),
    userIdIdx: index('auditLog_userId_idx').on(table.userId),
    createdAtIdx: index('auditLog_createdAt_idx').on(table.createdAt),
}));

// Admin Assignments Table
const adminAssignments = pgTable('adminassignment', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    adminId: varchar('adminId', { length: 191 }).notNull().references(() => users.id),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    assignedBy: varchar('assignedBy', { length: 191 }).notNull().references(() => users.id),
    assignedAt: timestamp('assignedAt').notNull().defaultNow(),
    revokedAt: timestamp('revokedAt'),
}, (table) => ({
    adminIdIdx: index('adminAssignment_adminId_idx').on(table.adminId),
    userIdIdx: index('adminAssignment_userId_idx').on(table.userId),
    activeAssignmentIdx: index('adminAssignment_active_idx').on(table.userId, table.revokedAt),
}));

// Games table
const games = pgTable('game', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 191 }).notNull().unique(),
    slug: varchar('slug', { length: 191 }).notNull().unique(),
    shortName: varchar('shortName', { length: 100 }),
    logoUrl: text('logoUrl'),
    bannerUrl: text('bannerUrl'),
    description: text('description'),
    isActive: boolean('isActive').notNull().default(true),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    slugIdx: index('game_slug_idx').on(table.slug),
}));

// Registrations table
const registrations = pgTable('registration', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    tournamentId: varchar('tournamentId', { length: 191 }).notNull(),
    teamId: varchar('teamId', { length: 191 }),
    userId: varchar('userId', { length: 191 }),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'),
    paymentStatus: varchar('paymentStatus', { length: 50 }).notNull().default('PENDING'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    tournamentIdIdx: index('registration_tournamentId_idx').on(table.tournamentId),
    teamIdIdx: index('registration_teamId_idx').on(table.teamId),
    userIdIdx: index('registration_userId_idx').on(table.userId),
}));

// Matches table
const matches = pgTable('match', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    tournamentId: varchar('tournamentId', { length: 191 }).notNull(),
    round: integer('round').notNull(),
    matchNumber: integer('matchNumber').notNull(),
    participantAId: varchar('participantAId', { length: 191 }),
    participantBId: varchar('participantBId', { length: 191 }),
    nextMatchId: varchar('nextMatchId', { length: 191 }),
    nextMatchSlot: varchar('nextMatchSlot', { length: 5 }),           // "A" or "B"
    positionInNextMatch: integer('positionInNextMatch'),
    scoreA: integer('scoreA').default(0),
    scoreB: integer('scoreB').default(0),
    winnerId: varchar('winnerId', { length: 191 }),
    status: varchar('status', { length: 50 }).notNull().default('SCHEDULED'),
    isBye: boolean('isBye').default(false),
    locked: boolean('locked').default(false),
    startTime: timestamp('startTime'),
    endTime: timestamp('endTime'),
    proofUrl: text('proofUrl'),            // screenshot/video URL submitted by host
    streamUrl: text('streamUrl'),          // Twitch/YouTube live stream link
    vodUrl: text('vodUrl'),                // post-match VOD/replay link
    spectatorCode: varchar('spectatorCode', { length: 100 }), // in-game spectator password
    // ─── Double Elimination fields ────────────────────────────────────────────
    bracketSection: varchar('bracket_section', { length: 20 }).default('WINNERS'), // WINNERS | LOSERS | GRAND_FINAL | ROUND_ROBIN
    loserNextMatchId: varchar('loser_next_match_id', { length: 191 }),              // where the loser goes
    loserNextMatchSlot: varchar('loser_next_match_slot', { length: 5 }),            // "A" or "B"
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    tournamentIdIdx: index('match_tournamentId_idx').on(table.tournamentId),
    winnerIdIdx: index('match_winnerId_idx').on(table.winnerId),
}));


// Player Profiles table
const playerProfiles = pgTable('playerprofile', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().unique(),

    // Identity
    ign: varchar('ign', { length: 191 }),
    realName: varchar('realName', { length: 255 }),
    dateOfBirth: timestamp('dateOfBirth'),
    avatarUrl: varchar('avatarUrl', { length: 500 }),
    bio: text('bio'),

    // Location
    country: varchar('country', { length: 100 }),
    state: varchar('state', { length: 100 }),
    city: varchar('city', { length: 100 }),
    preferredServer: varchar('preferredServer', { length: 50 }),

    // Contact (Discord)
    discordId: varchar('discordId', { length: 100 }),
    discordVisibility: varchar('discordVisibility', { length: 20 }).default('private'),

    // Preferences
    skillLevel: varchar('skillLevel', { length: 50 }),
    playStyle: varchar('playStyle', { length: 50 }),

    // Availability
    availableDays: varchar('availableDays', { length: 50 }),
    availableTime: varchar('availableTime', { length: 50 }),

    // System
    completionPercentage: integer('completionPercentage').default(0),
    profileVisibility: varchar('profileVisibility', { length: 20 }).default('public'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    userIdIdx: uniqueIndex('playerProfile_userId_idx').on(table.userId),
    ignIdx: index('playerProfile_ign_idx').on(table.ign),
}));

// Player Game Profiles table
const playerGameProfiles = pgTable('playergameprofile', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull(),

    game: varchar('game', { length: 50 }).notNull(),
    inGameName: varchar('inGameName', { length: 191 }).notNull(),
    inGameId: varchar('inGameId', { length: 191 }).notNull(),

    verificationStatus: varchar('verificationStatus', { length: 50 }).default('PENDING'),
    verifiedBy: varchar('verifiedBy', { length: 191 }),

    meta: text('meta'),

    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    userIdIdx: index('playerGameProfile_userId_idx').on(table.userId),
    gameIdIdx: index('playerGameProfile_game_inGameId_idx').on(table.game, table.inGameId),
}));

// Disputes table
const disputes = pgTable('dispute', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    matchId: varchar('matchId', { length: 191 }).notNull().references(() => matches.id),
    raisedById: varchar('raisedById', { length: 191 }).notNull().references(() => users.id),
    reason: text('reason').notNull(),
    evidenceUrl: varchar('evidenceUrl', { length: 500 }),
    status: varchar('status', { length: 50 }).notNull().default('OPEN'),
    resolution: text('resolution'),
    resolvedAt: timestamp('resolvedAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    matchIdIdx: index('dispute_matchId_idx').on(table.matchId),
    raisedByIdIdx: index('dispute_raisedById_idx').on(table.raisedById),
    statusIdx: index('dispute_status_idx').on(table.status),
}));

// ─── Payouts table (prize distribution) ───────────────────────────────────────
const payouts = pgTable('payout', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    tournamentId: varchar('tournamentId', { length: 191 }).notNull().references(() => tournaments.id),
    userId: varchar('userId', { length: 191 }).references(() => users.id),
    teamId: varchar('teamId', { length: 191 }).references(() => teams.id),
    position: integer('position').notNull(),                          // 1st, 2nd, 3rd
    amount: bigint('amount', { mode: 'number' }).notNull(),           // in paise/cents
    status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING | PAID | FAILED
    paidAt: timestamp('paidAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
    tournamentIdIdx: index('payout_tournamentId_idx').on(table.tournamentId),
    userIdIdx: index('payout_userId_idx').on(table.userId),
}));

// ─── Check-ins table (player attendance before bracket lock) ──────────────────
const checkins = pgTable('checkin', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    tournamentId: varchar('tournamentId', { length: 191 }).notNull().references(() => tournaments.id),
    userId: varchar('userId', { length: 191 }).references(() => users.id),
    teamId: varchar('teamId', { length: 191 }).references(() => teams.id),
    checkedInAt: timestamp('checkedInAt').notNull().defaultNow(),
}, (table) => ({
    tournamentIdIdx: index('checkin_tournamentId_idx').on(table.tournamentId),
    uniqueCheckin: uniqueIndex('checkin_tournament_participant_unique').on(table.tournamentId, table.userId),
}));

// ─── MMR / ELO Ratings table ──────────────────────────────────────────────────
const mmrRatings = pgTable('mmr_rating', {
    userId: varchar('userId', { length: 191 }).primaryKey().references(() => users.id),
    rating: integer('rating').notNull().default(1000),
    gamesPlayed: integer('gamesPlayed').notNull().default(0),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    peakRating: integer('peakRating').notNull().default(1000),
    currentStreak: integer('currentStreak').notNull().default(0),  // positive=win streak, negative=loss streak
    tier: varchar('tier', { length: 30 }).notNull().default('BRONZE'), // BRONZE | SILVER | GOLD | PLATINUM | DIAMOND | CHAMPION
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    ratingIdx: index('mmr_rating_idx').on(table.rating),
    tierIdx: index('mmr_tier_idx').on(table.tier),
}));

// ─── Achievements definitions table ──────────────────────────────────────────
const achievements = pgTable('achievement', {
    id: varchar('id', { length: 50 }).primaryKey(),  // e.g. 'FIRST_BLOOD', 'CHAMPION'
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description').notNull(),
    iconUrl: text('iconUrl'),
    tier: varchar('tier', { length: 20 }).notNull().default('BRONZE'), // BRONZE | SILVER | GOLD | LEGENDARY
    points: integer('points').notNull().default(10),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
});

// ─── User Achievements junction table ─────────────────────────────────────────
const userAchievements = pgTable('user_achievement', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    achievementId: varchar('achievementId', { length: 50 }).notNull().references(() => achievements.id),
    unlockedAt: timestamp('unlockedAt').notNull().defaultNow(),
    meta: json('meta'),  // e.g. { tournamentId, matchId } for context
}, (table) => ({
    userIdIdx: index('userAchievement_userId_idx').on(table.userId),
    unique: uniqueIndex('userAchievement_user_achievement_unique').on(table.userId, table.achievementId),
}));

// ─── Clans / Organisations table ──────────────────────────────────────────────
const clans = pgTable('clan', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 100 }).notNull().unique(),
    tag: varchar('tag', { length: 10 }).notNull().unique(),   // e.g. [NOVA]
    description: text('description'),
    logoUrl: text('logoUrl'),
    bannerUrl: text('bannerUrl'),
    ownerId: varchar('ownerId', { length: 191 }).notNull().references(() => users.id),
    totalWins: integer('totalWins').notNull().default(0),
    membersCount: integer('membersCount').notNull().default(1),
    isOpen: boolean('isOpen').notNull().default(true),  // open = anyone can apply
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    tagIdx: uniqueIndex('clan_tag_idx').on(table.tag),
    ownerIdx: index('clan_owner_idx').on(table.ownerId),
}));

// ─── Clan Members table ────────────────────────────────────────────────────────
const clanMembers = pgTable('clan_member', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    clanId: varchar('clanId', { length: 191 }).notNull().references(() => clans.id),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    role: varchar('role', { length: 30 }).notNull().default('MEMBER'), // OWNER | OFFICER | MEMBER
    joinedAt: timestamp('joinedAt').notNull().defaultNow(),
}, (table) => ({
    clanIdIdx: index('clanMember_clanId_idx').on(table.clanId),
    unique: uniqueIndex('clanMember_user_unique').on(table.userId), // one clan per user
}));

// Blocked Users Table
const blockedUsers = pgTable('blocked_users', {
    blockerId: varchar('blocker_id', { length: 191 }).notNull().references(() => users.id),
    blockedId: varchar('blocked_id', { length: 191 }).notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
    pk: primaryKey({ columns: [table.blockerId, table.blockedId] })
}));

// ─── Team MMR / ELO Ratings table ────────────────────────────────────────────
const teamMmrRatings = pgTable('team_mmr_rating', {
    teamId: varchar('teamId', { length: 191 }).primaryKey().references(() => teams.id),
    rating: integer('rating').notNull().default(1000),
    gamesPlayed: integer('gamesPlayed').notNull().default(0),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    peakRating: integer('peakRating').notNull().default(1000),
    currentStreak: integer('currentStreak').notNull().default(0),
    tier: varchar('tier', { length: 30 }).notNull().default('BRONZE'),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
    ratingIdx: index('team_mmr_rating_idx').on(table.rating),
    tierIdx: index('team_mmr_tier_idx').on(table.tier),
}));

// ─── Match MVPs table ─────────────────────────────────────────────────────────
const matchMvps = pgTable('match_mvp', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    matchId: varchar('matchId', { length: 191 }).notNull().references(() => matches.id),
    tournamentId: varchar('tournamentId', { length: 191 }).notNull(),
    teamId: varchar('teamId', { length: 191 }).notNull(),  // the winning team
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),  // the MVP player
    mmrBonus: integer('mmrBonus').notNull().default(0),     // extra MMR awarded to MVP
    reason: varchar('reason', { length: 255 }),              // optional note from host
    createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
    matchIdIdx: uniqueIndex('match_mvp_matchId_unique').on(table.matchId), // one MVP per match
    userIdIdx: index('match_mvp_userId_idx').on(table.userId),
    tournamentIdIdx: index('match_mvp_tournamentId_idx').on(table.tournamentId),
}));

module.exports = {
    authProviderEnum,
    hostStatusEnum,
    hostApplicationStatusEnum,
    postTypeEnum,
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
    uidCounters,
    userCounters,
    hostProfiles,
    hostApplications,
    posts,
    blockedUsers,
    // Phase A-D additions
    payouts,
    checkins,
    mmrRatings,
    achievements,
    userAchievements,
    clans,
    clanMembers,
    // Team MMR + MVP
    teamMmrRatings,
    matchMvps,
};
