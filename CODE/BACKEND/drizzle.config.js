require('dotenv').config({ override: true });
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
    console.log('🔍 Drizzle Config DB URL:', dbUrl.replace(/:[^:@]+@/, ':***@'));
} else {
    console.error('❌ Drizzle Config: DATABASE_URL is missing!');
}
const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
    schema: './src/db/schema.js',
    out: './drizzle',
    dialect: 'mysql',
    dbCredentials: {
        url: process.env.DATABASE_URL,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root1',
        database: process.env.DB_NAME || 'esports_tournament',
    },
});
