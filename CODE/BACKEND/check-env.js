const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('--- Environment Diagnostic ---');
console.log('Current Directory:', process.cwd());

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ .env file found at:', envPath);
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    console.log('File has', lines.length, 'lines.');

    // Check for specific keys without printing values
    const hasSmtpUser = content.includes('SMTP_USER');
    const hasSmtpPass = content.includes('SMTP_PASS');
    console.log('Contains SMTP_USER?', hasSmtpUser);
    console.log('Contains SMTP_PASS?', hasSmtpPass);
} else {
    console.error('❌ .env file NOT found at:', envPath);
    // Check if .env.txt exists (common mistake on Windows)
    if (fs.existsSync(envPath + '.txt')) {
        console.error('⚠️ Found .env.txt - please rename it to just .env');
    }
}

console.log('\n--- Loaded Environment Variables ---');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set (Length: ' + process.env.SMTP_USER.length + ')' : 'Missing');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set (Length: ' + process.env.SMTP_PASS.length + ')' : 'Missing');
