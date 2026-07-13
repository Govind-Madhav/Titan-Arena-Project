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
        port: Number.parseInt(process.env.SMTP_PORT, 10) || 587,
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
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

    // For OTP, we display the code directly. The argument 'token' is actually the OTP.
    const otp = token;

    // Logging email destination only for operational tracing
    console.log(`📧 Sending verification email to ${email}`);

    const mailOptions = {
        from: { name: 'TITAN ARENA', address: fromAddress },
        to: email,
        replyTo: fromAddress,
        subject: 'Titan Arena verification code',
        headers: {
            'X-Priority': '1',
            Importance: 'high'
        },
        text: `Hi ${cleanUsername || 'there'},\n\nYour Titan Arena verification code is: ${otp}\n\nThis code expires in 15 minutes. If you did not request it, you can ignore this message.`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
            </head>
            <body>
                <p>Hi ${cleanUsername || 'there'},</p>
                <p>Your Titan Arena verification code is:</p>
                <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
                <p>This code expires in 15 minutes.</p>
                <p>If you did not request this code, you can ignore this email.</p>
            </body>
            </html>
        `
    };

    try {
        const info = await transport.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`);
        console.log(`📬 Message ID: ${info.messageId}`);
        console.log(`📨 Response: ${info.response}`);
        return true;
    } catch (error) {
        console.error('❌ Email send error:', {
            message: error.message,
            code: error.code,
            smtpConfigured: !!process.env.SMTP_USER
        });
        throw error;
    }
};

// Send custom branded verification email
exports.sendCustomVerificationEmail = async (email, verificationLink, username) => {
    const transport = getTransporter();
    const cleanUsername = sanitize(username);
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

    console.log(`📧 Sending custom verification email to ${email}`);

    const mailOptions = {
        from: { name: 'TITAN ARENA', address: fromAddress },
        to: email,
        replyTo: fromAddress,
        subject: 'Titan Arena account verification',
        headers: {
            'X-Priority': '1',
            Importance: 'high'
        },
        text: `Welcome, ${cleanUsername}! Verify your account here: ${verificationLink}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
            </head>
            <body>
                <p>Welcome, ${cleanUsername}.</p>
                <p>Please verify your Titan Arena account by opening this link:</p>
                <p><a href="${verificationLink}">${verificationLink}</a></p>
                <p>If you did not request this, you can ignore this email.</p>
            </body>
            </html>
        `
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`Custom verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Custom Email send error:', error);
        throw error;
    }
};

exports.sendPasswordResetEmail = async (email, link, username) => {
    const transport = getTransporter();
    const cleanUsername = sanitize(username);
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
        from: { name: 'TITAN ARENA', address: fromAddress },
        to: email,
        replyTo: fromAddress,
        subject: 'Titan Arena password reset',
        headers: {
            'X-Priority': '1',
            Importance: 'high'
        },
        text: `Hi ${cleanUsername},\n\nUse this link to reset your Titan Arena password: ${link}\n\nIf you did not request this, you can ignore this email.`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
            </head>
            <body>
                <p>Hi ${cleanUsername},</p>
                <p>Use this link to reset your Titan Arena password:</p>
                <p><a href="${link}">${link}</a></p>
                <p>This link expires in 5 minutes.</p>
                <p>If you did not request this, you can ignore this email.</p>
            </body>
            </html>
        `
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`Password reset link sent to ${email}`);
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

exports.sendGenericEmail = async (email, subject, text, html) => {
    const transport = getTransporter();
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
        from: { name: 'TITAN ARENA', address: fromAddress },
        to: email,
        replyTo: fromAddress,
        subject: subject,
        text: text,
        html: html
    };

    try {
        await transport.sendMail(mailOptions);
        console.log(`📧 Generic email sent to ${email} with subject: "${subject}"`);
        return true;
    } catch (error) {
        console.error(`❌ Generic Email send error to ${email}:`, error.message);
        return false;
    }
};
