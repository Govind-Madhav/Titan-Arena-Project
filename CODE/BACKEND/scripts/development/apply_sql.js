require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, '../../drizzle/0000_panoramic_photon.sql');

(async () => {
    let connection;
    try {
        console.log('🚧 Applying full schema from SQL...');

        if (!fs.existsSync(SQL_FILE)) {
            console.error('❌ SQL file not found:', SQL_FILE);
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(SQL_FILE, 'utf-8');
        const statements = sqlContent.split('--> statement-breakpoint');

        connection = await mysql.createConnection({
            uri: process.env.DATABASE_URL,
            multipleStatements: true
        });

        // Disable FK checks just in case (though should be clean)
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        console.log(`Found ${statements.length} statements to execute.`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i].trim();
            if (stmt) {
                try {
                    await connection.execute(stmt);
                    // console.log(`   ✅ Executed statement ${i + 1}`);
                } catch (err) {
                    console.error(`❌ Failed statement ${i + 1}:`);
                    console.error(stmt.substring(0, 100) + '...');
                    console.error('Error:', err.message);
                    // Don't exit, try to continue? Fks are added later so order matters.
                    // But splitting by breakpoint usually sorts dependencies or Fks are added at end (ALTER).
                    // Drizzle puts CREATE then ALTER.
                }
            }
        }

        // Re-enable FK
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        console.log('✅ Schema application complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal Error:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
})();
