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
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL,
        ssl: false, // Disable SSL for local development
    },
});
