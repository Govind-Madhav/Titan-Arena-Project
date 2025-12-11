const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
    schema: './src/db/schema.js',
    out: './drizzle',
    dialect: 'mysql',
    dbCredentials: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root1',
        database: process.env.DB_NAME || 'esports_tournament',
    },
});
