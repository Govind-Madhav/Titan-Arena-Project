
const { register } = require('../src/controllers/auth.controller');

// Mock Request
const req = {
    body: {
        legalName: "Test User",
        username: "testuser_" + Math.floor(Math.random() * 10000),
        email: "test.user." + Math.floor(Math.random() * 10000) + "@example.com",
        password: "securePassword123!",
        mobile: "1234567890",
        role: "PLAYER",
        termsAccepted: true
    }
};

// Mock Response
const res = {
    status: function (code) {
        console.log(`[Response] Status Code: ${code}`);
        return this; // Chainable
    },
    json: function (data) {
        console.log('[Response] Body:', JSON.stringify(data, null, 2));
    }
};

console.log('--- STARTING REPRODUCTION SCRIPT ---');
register(req, res)
    .then(() => {
        console.log('--- SCRIPT COMPLETED ---');
        // Keep process alive briefly to ensure async logs flush if any
        setTimeout(() => process.exit(0), 1000);
    })
    .catch(err => {
        console.error('--- UNCAUGHT ERROR ---');
        console.error(err);
        process.exit(1);
    });
