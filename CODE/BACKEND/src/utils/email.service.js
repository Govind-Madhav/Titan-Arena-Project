/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    console.log('Configuring email transporter...');
    console.log('SMTP Config:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER ? 'Set' : 'Missing',
        pass: process.env.SMTP_PASS ? 'Set' : 'Missing'
    });

    // Explicitly load .env from root
    const path = require('path');
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });

    console.log('Configuring email transporter...');
    console.log('SMTP Config:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER, // Print value to debug (will verify later)
        passLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('CRITICAL: SMTP_USER or SMTP_PASS is missing directly from process.env');
        const error = new Error('Missing SMTP credentials in process.env');
        require('fs').writeFileSync('email-error.log', JSON.stringify({ message: error.message, env: process.env }, null, 2));
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Send verification email
exports.sendVerificationEmail = async (email, token, username) => {
    const transporter = createTransporter();

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const mailOptions = {
        from: `"TITAN ARENA" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '🎮 Verify Your TITAN ARENA Account',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0D0D0D; color: #ffffff; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                    .logo { text-align: center; margin-bottom: 30px; }
                    .logo h1 { font-size: 32px; margin: 0; }
                    .logo span { color: #8B5CF6; }
                    .card { background: linear-gradient(145deg, #1a1a2e, #16162a); border-radius: 16px; padding: 40px; border: 1px solid rgba(139, 92, 246, 0.2); }
                    h2 { color: #ffffff; margin-top: 0; }
                    p { color: #a0a0a0; line-height: 1.6; }
                    .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                    .button:hover { opacity: 0.9; }
                    .code { font-size: 24px; font-weight: bold; color: #8B5CF6; letter-spacing: 4px; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    .highlight { color: #8B5CF6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">
                        <h1>TITAN <span>ARENA</span></h1>
                    </div>
                    <div class="card">
                        <h2>Welcome, ${username}! 🎮</h2>
                        <p>Thanks for signing up for TITAN ARENA. To complete your registration and start competing in tournaments, please verify your email address.</p>
                        
                        <div style="text-align: center;">
                            <a href="${verificationUrl}" class="button">Verify Email Address</a>
                        </div>
                        
                        <p style="font-size: 14px; margin-top: 20px;">Or copy and paste this link in your browser:</p>
                        <p style="font-size: 12px; word-break: break-all; color: #8B5CF6;">${verificationUrl}</p>
                        
                        <p style="font-size: 14px; color: #666;">This link will expire in <span class="highlight">24 hours</span>.</p>
                        
                        <p>If you didn't create an account, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 TITAN ARENA. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Email send error:', error);

        // Deep debug
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(__dirname, '../../.env');
        let fileContent = 'File not found';
        try {
            if (fs.existsSync(envPath)) {
                fileContent = fs.readFileSync(envPath, 'utf8');
            }
        } catch (e) { fileContent = 'Error reading file: ' + e.message; }

        const debugInfo = {
            error: error,
            envPath: envPath,
            envFileExists: fs.existsSync(envPath),
            envFileContentPeek: fileContent.substring(0, 50) + '...', // First 50 chars only
            processEnvSMTP: {
                user: process.env.SMTP_USER,
                passLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0
            }
        };

        fs.writeFileSync('email-error.log', JSON.stringify(debugInfo, null, 2));
        throw error;
    }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, token, username) => {
    const transporter = createTransporter();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const mailOptions = {
        from: `"TITAN ARENA" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '🔐 Reset Your TITAN ARENA Password',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0D0D0D; color: #ffffff; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                    .logo { text-align: center; margin-bottom: 30px; }
                    .logo h1 { font-size: 32px; margin: 0; }
                    .logo span { color: #8B5CF6; }
                    .card { background: linear-gradient(145deg, #1a1a2e, #16162a); border-radius: 16px; padding: 40px; border: 1px solid rgba(139, 92, 246, 0.2); }
                    h2 { color: #ffffff; margin-top: 0; }
                    p { color: #a0a0a0; line-height: 1.6; }
                    .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    .highlight { color: #8B5CF6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">
                        <h1>TITAN <span>ARENA</span></h1>
                    </div>
                    <div class="card">
                        <h2>Password Reset Request 🔐</h2>
                        <p>Hi ${username}, you requested to reset your password. Click the button below to create a new password.</p>
                        
                        <div style="text-align: center;">
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </div>
                        
                        <p style="font-size: 14px; color: #666;">This link will expire in <span class="highlight">1 hour</span>.</p>
                        
                        <p>If you didn't request this, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 TITAN ARENA. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};
