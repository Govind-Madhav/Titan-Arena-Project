/**
 * Database Migration: Region-Based UID System
 * 
 * Changes:
 * 1. Drop old uid_counters table
 * 2. Create new simplified uid_counters (region only)
 * 3. Add region_code and sub_region_code to users
 * 4. Make ign unique in playerprofile
 */

require('dotenv').config();
const { db, pool } = require('../src/db');
const { sql } = require('drizzle-orm');

async function migrate() {
    console.log('🔄 Starting database migration...\n');

    try {
        // Step 1: Drop old uid_counters
        console.log('1️⃣  Dropping old uid_counters table...');
        await db.execute(sql`DROP TABLE IF EXISTS uid_counters`);
        console.log('   ✅ Dropped\n');

        // Step 2: Create new uid_counters
        console.log('2️⃣  Creating new uid_counters table...');
        await db.execute(sql`
            CREATE TABLE uid_counters (
                region INT PRIMARY KEY,
                \`last_value\` BIGINT NOT NULL DEFAULT 0
            )
        `);
        console.log('   ✅ Created\n');

        // Step 3: Seed counters
        console.log('3️⃣  Seeding region counters...');
        await db.execute(sql`
            INSERT INTO uid_counters (region, \`last_value\`) VALUES
            (1, 0), (2, 0), (3, 0), (4, 0), (5, 0), (6, 0)
        `);
        console.log('   ✅ Seeded\n');

        // Step 4: Add new columns to users (if not exists)
        console.log('4️⃣  Updating users table...');
        try {
            await db.execute(sql`
                ALTER TABLE users 
                ADD COLUMN region_code INT,
                ADD COLUMN sub_region_code VARCHAR(10)
            `);
            console.log('   ✅ Added region_code and sub_region_code\n');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('   ⚠️  Columns already exist, skipping\n');
            } else {
                throw error;
            }
        }

        // Step 5: Set default values for existing users
        console.log('5️⃣  Setting default region for existing users...');
        await db.execute(sql`
            UPDATE users 
            SET region_code = 1, sub_region_code = 'AS-SA' 
            WHERE region_code IS NULL
        `);
        console.log('   ✅ Updated\n');

        // Step 6: Make region_code NOT NULL
        console.log('6️⃣  Making region_code NOT NULL...');
        await db.execute(sql`
            ALTER TABLE users MODIFY region_code INT NOT NULL
        `);
        console.log('   ✅ Updated\n');

        // Step 7: Drop old regionCode column (if exists)
        console.log('7️⃣  Dropping old regionCode column...');
        try {
            await db.execute(sql`ALTER TABLE users DROP COLUMN regionCode`);
            console.log('   ✅ Dropped\n');
        } catch (error) {
            if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('   ⚠️  Column already dropped, skipping\n');
            } else {
                throw error;
            }
        }

        // Step 8: Make IGN unique in playerprofile
        console.log('8️⃣  Making IGN unique in playerprofile...');
        try {
            await db.execute(sql`
                ALTER TABLE playerprofile 
                ADD UNIQUE KEY unique_ign (ign)
            `);
            console.log('   ✅ Added unique constraint\n');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('   ⚠️  Constraint already exists, skipping\n');
            } else {
                throw error;
            }
        }

        console.log('========================================');
        console.log('✅ Migration completed successfully!');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();
