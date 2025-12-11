require('dotenv').config();
const prisma = require('./src/config/prisma');
const bcrypt = require('bcryptjs');

async function testSignup() {
    try {
        const hashedPassword = await bcrypt.hash('Test@123456', 12);

        const user = await prisma.user.create({
            data: {
                email: 'test@test.com',
                password: hashedPassword,
                username: 'testuser',
                role: 'PLAYER',
                emailVerified: false,
                verificationToken: 'test-token',
                verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        });

        console.log('User created successfully:', user);

        const wallet = await prisma.wallet.create({
            data: {
                userId: user.id,
                balance: 0,
                locked: 0
            }
        });

        console.log('Wallet created successfully:', wallet);

    } catch (error) {
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testSignup();
