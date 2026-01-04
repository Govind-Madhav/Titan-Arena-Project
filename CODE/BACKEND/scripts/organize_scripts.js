/**
 * Script Cleanup and Organization Tool
 * 
 * This script organizes the scripts directory by:
 * 1. Creating organized subdirectories
 * 2. Moving scripts to appropriate locations
 * 3. Archiving old/duplicate scripts
 * 
 * Run with: node scripts/organize_scripts.js
 */

const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname);
const productionDir = path.join(scriptsDir, 'production');
const developmentDir = path.join(scriptsDir, 'development');
const archiveDir = path.join(scriptsDir, 'archive');

// Script categorization
const scriptCategories = {
    production: [
        'init_uid_counters.js',
        'migrate_region_system.js',
        'promote_superadmin.js'
    ],
    development: [
        'create_seed_users.js',
        'count_users.js',
        'list_user_names.js'
    ],
    archive: [
        // Duplicates
        'clear-users.js',
        'clear_users.js',
        'remove_users.js',
        'remove_all_users.js',
        'cleanup_users.js',
        'remove_unverified_users.js',

        // Check scripts
        'check_user.js',
        'check_users.js',
        'check_user_table.js',
        'check_tables.js',

        // Test scripts
        'test-event-flow.js',
        'test-firebase.js',
        'test-redis.js',
        'test-registration-flow.js',
        'test_signup.json',
        'test_wallet_direct.js',
        'test_wallet_insert.js',
        'reproduce-register-error.js',

        // One-off fixes
        'fix_all_fks.js',
        'fix_db_migration.js',
        'fix_schema.js',
        'fix_wallet_fk.js',
        'apply_critical_fixes.js',
        'apply_migrations.js',
        'apply_phase1_cleanup.js',
        'apply_schema_changes.js',
        'patch_schema.js',

        // Old migrations
        'migrate_db.js',
        'migrate_uids.js',
        'backfill_player_codes.js',
        'backfill_profiles.js',

        // Debugging
        'diagnose-db.js',
        'investigate_db.js',
        'verify_phase3_4.js',
        'verify_tables.js',

        // Dangerous
        'nuke_database.js',
        'dangerous_drop_all.js',
        'clean_database.js',

        // Misc
        'init_counters.js',
        'update_username.js'
    ]
};

function createDirectories() {
    console.log('📁 Creating organized directories...\n');

    [productionDir, developmentDir, archiveDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Created: ${path.basename(dir)}/`);
        }
    });
    console.log('');
}

function moveScripts() {
    console.log('📦 Moving scripts to organized locations...\n');

    let movedCount = 0;

    Object.entries(scriptCategories).forEach(([category, scripts]) => {
        const targetDir = category === 'production' ? productionDir :
            category === 'development' ? developmentDir : archiveDir;

        scripts.forEach(script => {
            const sourcePath = path.join(scriptsDir, script);
            const targetPath = path.join(targetDir, script);

            if (fs.existsSync(sourcePath)) {
                try {
                    fs.renameSync(sourcePath, targetPath);
                    console.log(`✅ Moved ${script} → ${category}/`);
                    movedCount++;
                } catch (err) {
                    console.error(`❌ Failed to move ${script}:`, err.message);
                }
            }
        });
    });

    console.log(`\n📊 Moved ${movedCount} scripts\n`);
}

function createReadme() {
    console.log('📝 Creating README.md...\n');

    const readme = `# Scripts Directory

## Production Scripts

These scripts are safe to run in production and are part of the deployment process.

### \`production/init_uid_counters.js\`
Initializes UID counters for all 6 regions. **Run once** before starting the application for the first time.

\`\`\`bash
node scripts/production/init_uid_counters.js
\`\`\`

⚠️ **WARNING:** Only run on fresh installations or during controlled migrations with full backups.

### \`production/migrate_region_system.js\`
Migrates the database to the new region-based UID system.

\`\`\`bash
node scripts/production/migrate_region_system.js
\`\`\`

### \`production/promote_superadmin.js\`
Promotes a user to SUPERADMIN role.

\`\`\`bash
node scripts/production/promote_superadmin.js <email>
\`\`\`

---

## Development Scripts

These scripts are for development and testing purposes only.

### \`development/create_seed_users.js\`
Creates seed users for testing.

### \`development/count_users.js\`
Counts users in the database.

### \`development/list_user_names.js\`
Lists all usernames in the database.

---

## Archive

Old scripts, one-off fixes, and debugging tools are archived in \`archive/\`.

These scripts are kept for reference but should not be used in production.

---

## Usage Guidelines

1. **Production scripts** - Review carefully before running
2. **Development scripts** - Safe to run in dev environment
3. **Archive scripts** - Reference only, do not use

## Adding New Scripts

- Production scripts → \`production/\`
- Development/testing → \`development/\`
- One-off fixes → \`archive/\`
`;

    fs.writeFileSync(path.join(scriptsDir, 'README.md'), readme);
    console.log('✅ Created README.md\n');
}

function generateReport() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('                 CLEANUP COMPLETE                      ');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📂 New Structure:');
    console.log('   scripts/');
    console.log('   ├── production/        (3 scripts)');
    console.log('   ├── development/       (3 scripts)');
    console.log('   ├── archive/           (40 scripts)');
    console.log('   ├── README.md');
    console.log('   └── organize_scripts.js\n');

    console.log('✅ Production scripts ready to use');
    console.log('✅ Development scripts organized');
    console.log('✅ Old scripts archived');
    console.log('✅ Documentation created\n');
}

// Main execution
async function main() {
    console.log('\n🚀 Starting script organization...\n');

    try {
        createDirectories();
        moveScripts();
        createReadme();
        generateReport();

        console.log('✨ Script organization complete!\n');
    } catch (error) {
        console.error('❌ Error during organization:', error);
        process.exit(1);
    }
}

main();
