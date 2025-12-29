
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

const showTables = async () => {
    try {
        console.log('🔍 Verifying New Tables...');

        // Check host_applications
        const hostApps = await db.execute(sql`DESCRIBE host_applications`);
        console.log('\n📋 Table: host_applications');
        console.table(hostApps[0].map(col => ({ Field: col.Field, Type: col.Type, Null: col.Null, Key: col.Key })));

        // Check posts
        const posts = await db.execute(sql`DESCRIBE posts`);
        console.log('\n📋 Table: posts');
        console.table(posts[0].map(col => ({ Field: col.Field, Type: col.Type, Null: col.Null, Key: col.Key })));

        process.exit(0);
    } catch (error) {
        console.error('❌ Verification Failed:', error.message);
        process.exit(1);
    }
};

showTables();
