
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // scripts/../.env
try {
    const schema = require('../src/db/schema');
    console.log('✅ Schema loaded successfully');
    console.log('Users table keys:', Object.keys(schema.users));
} catch (error) {
    const fs = require('fs');
    fs.writeFileSync('debug_error.log', error.stack || String(error));
    console.error('❌ Schema load failed (Logged to debug_error.log)');
}
