/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const nodemailer = require('nodemailer');

// Singleton Transporter
let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    console.log('Configuring email transporter...');

    // Secure Logging: Log presence of credentials, never the values
    console.log('SMTP credentials present:', {
        user: !!process.env.SMTP_USER,
        pass: !!process.env.SMTP_PASS
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('CRITICAL: SMTP_USER or SMTP_PASS is missing in environment variables');
        // Do not dump env to disk.
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    return transporter;
};

// Helper: Sanitize inputs to prevent HTML injection
const sanitize = (str) => {
    if (!str) return '';
    return String(str).replace(/[&<>"'/]/g, function (s) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        }[s];
    });
};

// Send verification email
exports.sendVerificationEmail = async (email, token, username) => {
    const transport = getTransporter();
    const cleanUsername = sanitize(username);

    // For OTP, we display the code directly. The argument 'token' is actually the OTP.
    const otp = token;

    // Logging email destination only for operational tracing
    console.log(`📧 Sending verification email to ${email}`);

    const mailOptions = {
        from: `"TITAN ARENA" <${process.env.SMTP_USER}>`,
        to: email,
        replyTo: 'no-reply@titanarena.com',
        subject: '🎮 Verify Your TITAN ARENA Account',
        text: `Welcome, ${cleanUsername}! Your verification code is: ${otp}`,
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
                    .code-container { background: rgba(139, 92, 246, 0.1); border: 1px dashed rgba(139, 92, 246, 0.5); padding: 20px; text-align: center; margin: 25px 0; border-radius: 8px; }
                    .code { font-size: 32px; font-weight: 800; color: #8B5CF6; letter-spacing: 8px; font-family: 'Courier New', monospace; mso-line-height-rule: exactly; line-height: 1; display: inline-block;}
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    .highlight { color: #8B5CF6; }
                    .warning { font-size: 12px; color: #ff6b6b; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">
                        <h1>TITAN <span>ARENA</span></h1>
                    </div>
                    <div class="card">
                        <h2>Welcome, ${cleanUsername}! 🎮</h2>
                        <p>Thanks for signing up for TITAN ARENA. Use the secure code below to complete your identity verification.</p>
                        
                        <div class="code-container">
                            <span class="code">${otp}</span>
                        </div>
                        
                        <p style="font-size: 14px; text-align: center;">This code will expire in 15 minutes.</p>
                        
                        <div style="text-align: center;">
                            <p class="warning">⚠️ Do not share this code with anyone. Admin will never ask for it.</p>
                        </div>


                        <p>If you didn't create an account, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2025 TITAN ARENA. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Email send error:', {
            message: error.message,
            code: error.code,
            smtpConfigured: !!process.env.SMTP_USER
        });
        throw error;
    }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, otp, username) => {
    const transport = getTransporter();
    const cleanUsername = sanitize(username);

    const mailOptions = {
        from: `"TITAN ARENA" <${process.env.SMTP_USER}>`,
        to: email,
        replyTo: 'no-reply@titanarena.com',
        subject: '🔐 Your Password Reset Code – Valid for 5 minutes',
        text: `Hi ${cleanUsername}, your password reset code is: ${otp}. Do not share this code. It expires in 5 minutes.`, // Text fallback
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
                    .code { display: block; background: rgba(139, 92, 246, 0.1); border: 1px dashed #8B5CF6; color: #ffffff; font-family: 'Courier New', monospace; font-size: 32px; letter-spacing: 4px; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    .highlight { color: #8B5CF6; }
                    .warning { color: #ef4444; font-size: 13px; margin-top: 20px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">
                        <h1>TITAN <span>ARENA</span></h1>
                    </div>
                    <div class="card">
                        <h2>Password Reset Request 🔐</h2>
                        <p>Hi ${cleanUsername}, we received a request to reset your password. Use the code below to proceed.</p>
                        
                        <div class="code">${otp}</div>
                        
                        <p style="font-size: 14px; color: #666;">This code will expire in <span class="highlight">5 minutes</span>.</p>
                        
                        <p class="warning">⚠️ Do not share this code. We will never ask for it.</p>
                        
                        <p>If you didn't request this, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>© 2025 TITAN ARENA. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`Password reset OTP sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Email send error:', {
            message: error.message,
            code: error.code,
            smtpConfigured: !!process.env.SMTP_USER
        });
        throw error;
    }
};
