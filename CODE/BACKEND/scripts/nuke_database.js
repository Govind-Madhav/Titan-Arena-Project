
require('dotenv').config({ override: true });
const mysql = require('mysql2/promise');

async function nukeDatabase() {
    console.log('☢️  STARTING DATABASE NUKE ☢️\n');

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL is missing!');
        process.exit(1);
    }

    // Parse URL to get connection details but WITHOUT the database
    // We want to connect to the "server" to drop the "database"
    // e.g. mysql://root:pass@host:port/railway -> mysql://root:pass@host:port/

    try {
        const url = new URL(dbUrl);
        const dbName = url.pathname.replace('/', ''); // hostname/railway -> railway

        console.log(`🎯 Target Database: '${dbName}'`);

        // Connect to 'sys' or just base connection
        // We construct a config object manually
        const connection = await mysql.createConnection({
            host: url.hostname,
            user: url.username,
            password: url.password,
            port: url.port || 3306,
            ssl: { rejectUnauthorized: false } // Required for Railway usually
        });

        console.log('✅ Connected to MySQL Server');

        console.log(`💣 DROPPING DATABASE ${dbName}...`);
        await connection.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
        console.log(`   ✅ Dropped ${dbName}`);

        console.log(`✨ CREATING DATABASE ${dbName}...`);
        await connection.execute(`CREATE DATABASE \`${dbName}\``);
        console.log(`   ✅ Created ${dbName}`);

        await connection.end();

        console.log('\n✅ DATABASE RESET COMPLETE. It is now truly empty.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during nuke:', error);
        // Special advice for permission errors
        if (error.code === 'ER_DBACCESS_DENIED_ERROR' || error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n⚠️  It seems you do not have permission to DROP the database.');
            console.error('   Please use the Railway Dashboard to delete the database volume or tables manually.');
        }
        process.exit(1);
    }
}

nukeDatabase();
