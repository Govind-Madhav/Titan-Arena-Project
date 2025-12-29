/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { mysqlTable, varchar, boolean, datetime, int, text, index, uniqueIndex, primaryKey, bigint, mysqlEnum } = require('drizzle-orm/mysql-core');
const { sql } = require('drizzle-orm');
const crypto = require('crypto');

// ============================================================================
// CORE TABLES (NO DEPENDENCIES)
// ============================================================================

// Users table - MUST BE FIRST (referenced by all other tables)
const users = mysqlTable('users', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    username: varchar('username', { length: 191 }).notNull().unique(),
    email: varchar('email', { length: 191 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),

    // New Identity Fields (Final Architecture)
    playerCode: varchar('player_code', { length: 20 }).unique(), // PLxxxx (Nullable until migration)
    isAdmin: boolean('is_admin').notNull(),

    // Legal & Private Info
    legalName: varchar('legalName', { length: 255 }).notNull(),
    dateOfBirth: datetime('dateOfBirth').notNull(),
    phone: varchar('phone', { length: 20 }),
    phoneVerified: boolean('phoneVerified').notNull(),
    phoneVisibility: varchar('phoneVisibility', { length: 20 }).notNull(),

    // Location
    countryCode: varchar('country_code', { length: 3 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    city: varchar('city', { length: 100 }),
    regionCode: varchar('regionCode', { length: 2 }).notNull(),

    // Status Flags
    // DEPRECATED (Migration Only): role, hostStatus, platformUid
    role: varchar('role', { length: 50 }).notNull(), // -> use isAdmin / hostProfiles
    hostStatus: varchar('hostStatus', { length: 50 }).notNull(), // -> use hostProfiles.status
    // Keeping platformUid briefly - mapped to old UID logic
    platformUid: varchar('platformUid', { length: 20 }).unique(), // -> use playerCode

    isBanned: boolean('isBanned').notNull(),
    emailVerified: boolean('emailVerified').notNull(),
    registrationCompleted: boolean('registrationCompleted').notNull(),
    termsAccepted: boolean('termsAccepted').notNull(),

    // Enterprise Security Fields
    passwordUpdatedAt: datetime('passwordUpdatedAt'),
    lastLoginAt: datetime('lastLoginAt'),
    failedLoginCount: int('failedLoginCount').notNull(),

    // Profile
    bio: text('bio'),
    avatarUrl: varchar('avatarUrl', { length: 500 }),

    createdAt: datetime('createdAt').notNull(),
    updatedAt: datetime('updatedAt').notNull(),
}, (table) => ({
    platformUidIdx: uniqueIndex('user_platformUid_idx').on(table.platformUid),
    usernameIdx: uniqueIndex('user_username_idx').on(table.username),
    emailIdx: uniqueIndex('user_email_idx').on(table.email),
    regionCodeIdx: index('user_regionCode_idx').on(table.regionCode),
    countryCodeIdx: index('user_country_code_idx').on(table.countryCode),
}));

// UID Counters table
// ⚠️ CONCURRENCY WARNING:
// Do not blindly SELECT and UPDATE this table. You MUST use atomic increments:
// UPDATE uid_counters SET lastValue = LAST_INSERT_ID(lastValue + 1) WHERE ...
// SELECT LAST_INSERT_ID();
const uidCounters = mysqlTable('uid_counters', {
    regionCode: varchar('region_code', { length: 2 }).notNull(),
    year: int('year').notNull(),
    lastValue: int('last_value').notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.regionCode, table.year] }),
}));

// User Counters (ID Generation)
const userCounters = mysqlTable('user_counters', {
    key: varchar('key', { length: 20 }).primaryKey(), // 'PLAYER_CODE', 'HOST_CODE', 'ADMIN_CODE'
    lastNumber: int('last_number').notNull()
});

// ============================================================================
// DEPENDENT TABLES (REFERENCE users)
// ============================================================================

// Host Profiles (Operational Extension)
const hostProfiles = mysqlTable('host_profiles', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 191 }).notNull().unique(), // FK to users.id
    hostCode: varchar('host_code', { length: 20 }).unique().notNull(), // HTxxxx
    status: mysqlEnum('status', ['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED']).notNull(),
    verifiedAt: datetime('verified_at'),
    verifiedBy: varchar('verified_by', { length: 191 }), // FK to users.id (Admin)
    createdAt: datetime('created_at').notNull()
});

// Host Applications (Phase 3 Strict)
const hostApplications = mysqlTable('host_applications', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id),
    status: mysqlEnum('status', ['PENDING', 'APPROVED', 'REJECTED']).notNull(),
    documentsUrl: text('documents_url'),
    notes: text('notes'),
    createdAt: datetime('created_at').notNull(),
    reviewedAt: datetime('reviewed_at'),
    reviewedBy: varchar('reviewed_by', { length: 191 }).references(() => users.id)
});

// Posts (Phase 4 Strict)
const posts = mysqlTable('posts', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id),
    content: text('content').notNull(),
    type: mysqlEnum('type', ['GENERAL', 'ACHIEVEMENT', 'TOURNAMENT_UPDATE']).notNull(),
    mediaUrl: text('media_url'),
    likesCount: int('likes_count').notNull(),
    isDeleted: boolean('is_deleted').notNull(),
    createdAt: datetime('created_at').notNull()
});

// Refresh Tokens table
const refreshTokens = mysqlTable('refreshToken', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    token: varchar('token', { length: 500 }).notNull().unique(),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    expiresAt: datetime('expiresAt').notNull(),
    createdAt: datetime('createdAt').notNull(),
}, (table) => ({
    userIdIdx: index('refreshToken_userId_idx').on(table.userId),
}));

// Wallets table - NO DEFAULTS
const wallets = mysqlTable('wallet', {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar('userId', { length: 191 }).notNull().unique().references(() => users.id),
    balance: bigint('balance', { mode: 'number' }).notNull(),
    locked: bigint('locked', { mode: 'number' }).notNull(),
    createdAt: datetime('createdAt').notNull(),
    updatedAt: datetime('updatedAt').notNull(),
});
