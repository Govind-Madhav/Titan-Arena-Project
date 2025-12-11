require('dotenv').config();
const mysql = require('mysql2/promise');

async function resetDb() {
    console.log('Resetting database...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root1'
    });

    try {
        await connection.query('DROP DATABASE IF EXISTS esports_tournament');
        await connection.query('CREATE DATABASE esports_tournament');
        console.log('Database reset successfully!');
    } catch (error) {
        console.error('Error resetting database:', error);
    } finally {
        await connection.end();
    }
}

resetDb();
