require('dotenv').config();
const { db } = require('../src/db');

(async () => {
    const result = await db.execute('SHOW TABLES');
    const tables = result[0].map(row => Object.values(row)[0]);
    console.log('Tables containing "user":', tables.filter(t => t.toLowerCase().includes('user')));
    process.exit(0);
})();
