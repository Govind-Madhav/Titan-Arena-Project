const otplib = require('otplib');
console.log('otplib exports:', Object.keys(otplib));

try {
    const { generateSecret, generateURI, verifySync } = otplib;
    console.log('generateSecret:', typeof generateSecret);
    console.log('generateURI:', typeof generateURI);
    console.log('verifySync:', typeof verifySync);
} catch (e) {
    console.error('Error importing:', e.message);
}
