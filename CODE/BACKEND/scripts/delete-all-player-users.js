/**
 * Delete all users with role = PLAYER and their direct FK-linked rows.
 * Usage: node scripts/delete-all-player-users.js
 */
require('dotenv').config();
const { Client } = require('pg');

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        await client.query('BEGIN');

        const players = await client.query("SELECT id FROM users WHERE role = 'PLAYER'");
        const playerIds = players.rows.map((row) => row.id);

        console.log(`PLAYER users found: ${playerIds.length}`);
        if (playerIds.length === 0) {
            await client.query('ROLLBACK');
            console.log('No PLAYER users to delete.');
            return;
        }

        const foreignKeys = await client.query(`
            SELECT tc.table_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
               AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
               AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
              AND ccu.table_name = 'users'
              AND ccu.column_name = 'id'
            ORDER BY tc.table_name
        `);

        for (const fk of foreignKeys.rows) {
            if (fk.table_name === 'users') continue;

            const sql = `DELETE FROM ${quoteIdent(fk.table_name)} WHERE ${quoteIdent(fk.column_name)}::text = ANY($1::text[])`;
            const result = await client.query(sql, [playerIds.map((id) => String(id))]);
            console.log(`Deleted from ${fk.table_name}: ${result.rowCount}`);
        }

        const deletedUsers = await client.query('DELETE FROM users WHERE id::text = ANY($1::text[])', [playerIds.map((id) => String(id))]);
        console.log(`Deleted PLAYER users: ${deletedUsers.rowCount}`);

        await client.query('COMMIT');
        console.log('Bulk delete completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Bulk delete failed:', error.message);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

run();
