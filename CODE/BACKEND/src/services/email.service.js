/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 *
 * Email Notification Service — Phase B
 * Sends transactional emails for critical platform events.
 * Uses Nodemailer with SMTP (configured via env vars).
 * Gracefully skips if SMTP is not configured (dev mode).
 */

const nodemailer = require('nodemailer');

// ─── Transporter Setup ────────────────────────────────────────────────────────

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.warn('⚠️  Email Service: SMTP not configured — emails will be skipped');
        return null;
    }
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number.parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    return transporter;
};

const FROM = `"Titan Arena" <${process.env.SMTP_USER || 'noreply@titanarena.gg'}>`;

/**
 * Core send utility. All public functions use this.
 */
const send = async ({ to, subject, html }) => {
    const transport = getTransporter();
    if (!transport) return; // dev mode — skip silently
    try {
        await transport.sendMail({ from: FROM, to, subject, html });
    } catch (err) {
        console.error(`❌ Email failed to ${to}: ${err.message}`);
    }
};

// ─── Shared Style ─────────────────────────────────────────────────────────────

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #e0e0f0; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #1a1a2e; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 28px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: 1px; }
    .body { padding: 28px; }
    .body p { line-height: 1.7; color: #c0c0d8; }
    .cta { display: inline-block; margin: 16px 0; padding: 12px 28px; background: #7c3aed; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .footer { padding: 16px 28px; font-size: 12px; color: #555577; text-align: center; }
    .highlight { color: #a78bfa; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .badge-win { background: #064e3b; color: #34d399; }
    .badge-loss { background: #450a0a; color: #f87171; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>⚡ TITAN ARENA</h1></div>
    <div class="body">${content}</div>
    <div class="footer">© 2025 Titan Arena · All rights reserved</div>
  </div>
</body>
</html>`;

// ─── Email Templates ──────────────────────────────────────────────────────────

/**
 * Notify player their match has been scheduled.
 */
exports.sendMatchScheduled = async ({ to, username, tournamentName, round, opponent, scheduledAt }) => {
    await send({
        to,
        subject: `⚔️ Your match is scheduled — ${tournamentName}`,
        html: baseTemplate(`
            <p>Hi <span class="highlight">${username}</span>,</p>
            <p>Your <strong>Round ${round}</strong> match has been scheduled in <span class="highlight">${tournamentName}</span>.</p>
            <p>🆚 <strong>Opponent:</strong> ${opponent || 'TBD'}</p>
            ${scheduledAt ? `<p>🕐 <strong>Scheduled:</strong> ${new Date(scheduledAt).toLocaleString()}</p>` : ''}
            <a href="${process.env.APP_URL || 'https://titanarena.gg'}/matches" class="cta">View Match</a>
        `),
    });
};

/**
 * Notify player a tournament they're in has closed registration and schedule is ready.
 */
exports.sendTournamentStart = async ({ to, username, tournamentName, tournamentId }) => {
    await send({
        to,
        subject: `📅 Schedule Ready — ${tournamentName}`,
        html: baseTemplate(`
            <p>Hi <span class="highlight">${username}</span>,</p>
            <p>Registration closed for <span class="highlight">${tournamentName}</span> and the schedule is now ready!</p>
            <p>Head to the bracket page to see your start time. Opponents will be revealed when matches begin.</p>
            <a href="${process.env.APP_URL || 'https://titanarena.gg'}/tournaments/${tournamentId}" class="cta">View Bracket</a>
        `),
    });
};

/**
 * Notify player a tournament they're in is LIVE.
 */
exports.sendTournamentLive = async ({ to, username, tournamentName, tournamentId }) => {
    await send({
        to,
        subject: `🔥 Matches are LIVE — ${tournamentName}`,
        html: baseTemplate(`
            <p>Hi <span class="highlight">${username}</span>,</p>
            <p>The tournament <span class="highlight">${tournamentName}</span> has officially started!</p>
            <p>Your opponents are now revealed. Good luck!</p>
            <a href="${process.env.APP_URL || 'https://titanarena.gg'}/tournaments/${tournamentId}" class="cta">Go to Tournament</a>
        `),
    });
};

/**
 * Notify player of their match result (win or loss).
 */
exports.sendMatchResult = async ({ to, username, won, tournamentName, opponentName, round }) => {
    const resultBadge = won
        ? `<span class="badge badge-win">✅ VICTORY</span>`
        : `<span class="badge badge-loss">❌ ELIMINATED</span>`;
    await send({
        to,
        subject: `${won ? '🎉 Victory!' : '💀 Match Result'} — ${tournamentName}`,
        html: baseTemplate(`
            <p>Hi <span class="highlight">${username}</span>,</p>
            <p>Your Round ${round} match in <span class="highlight">${tournamentName}</span> vs <strong>${opponentName || 'your opponent'}</strong> has concluded.</p>
            <p>${resultBadge}</p>
            ${won
                ? '<p>You advance to the next round. Good luck! 🚀</p>'
                : '<p>Better luck next time. Keep grinding and come back stronger 💪</p>'
            }
            <a href="${process.env.APP_URL || 'https://titanarena.gg'}/tournaments" class="cta">View Tournaments</a>
        `),
    });
};

/**
 * Notify winner their prize has been credited to their wallet.
 */
exports.sendPrizeDistributed = async ({ to, username, amount, position, tournamentName }) => {
    const formatted = (amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    await send({
        to,
        subject: `💰 Prize credited — ${tournamentName}`,
        html: baseTemplate(`
            <p>Hi <span class="highlight">${username}</span>,</p>
            <p>Congratulations on finishing <strong>#${position}</strong> in <span class="highlight">${tournamentName}</span>!</p>
            <p>Your prize of <span class="highlight">${formatted}</span> has been credited to your Titan Arena wallet.</p>
            <a href="${process.env.APP_URL || 'https://titanarena.gg'}/wallet" class="cta">View Wallet</a>
        `),
    });
};

/**
 * Notify players their tournament was cancelled and entry fee refunded.
 */
exports.sendTournamentCancelled = async ({ to, username, tournamentName, refundAmount }) => {
    const formatted = refundAmount > 0
        ? `<p>Your entry fee of <span class="highlight">${(refundAmount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span> has been refunded to your wallet.</p>`
        : '';
    await send({
        to,
        subject: `⚠️ Tournament Cancelled — ${tournamentName}`,
        html: baseTemplate(`
            <p>Hi <span class="highlight">${username}</span>,</p>
            <p>We're sorry to inform you that <span class="highlight">${tournamentName}</span> has been cancelled by the host.</p>
            ${formatted}
            <a href="${process.env.APP_URL || 'https://titanarena.gg'}/tournaments" class="cta">Browse Tournaments</a>
        `),
    });
};

/**
 * Notify player they unlocked an achievement.
 */
exports.sendAchievementUnlocked = async ({ to, username, achievementName, description }) => {
    await send({
        to,
        subject: `🏅 Achievement Unlocked: ${achievementName}`,
        html: baseTemplate(`
            <p>Hi <span class="highlight">${username}</span>,</p>
            <p>You just unlocked a new achievement:</p>
            <h2 style="color:#a78bfa; margin: 8px 0;">🏅 ${achievementName}</h2>
            <p style="color:#c0c0d8; font-style: italic;">"${description}"</p>
            <a href="${process.env.APP_URL || 'https://titanarena.gg'}/profile" class="cta">View Profile</a>
        `),
    });
};

/**
 * Notify a user about a KYC decision.
 */
exports.sendKycDecision = async ({ to, username, decision, reason }) => {
    let headline = 'KYC Review Updated';
    let subject = 'KYC Update';
    let accentColor = '#fbbf24';
    let bodyCopy = 'Your KYC review has been updated.';

    if (decision === 'APPROVED') {
        headline = 'KYC Approved ✅';
        subject = '✅ KYC Approved';
        accentColor = '#34d399';
        bodyCopy = 'Your KYC has been approved. Host access is now available according to your trust level.';
    } else if (decision === 'REJECTED') {
        headline = 'KYC Rejected ❌';
        subject = '❌ KYC Rejected';
        accentColor = '#f87171';
        bodyCopy = 'Your KYC was rejected.';
        if (reason) {
            bodyCopy += ` Reason: ${reason}`;
        }
    } else if (decision === 'FLAGGED') {
        headline = 'KYC Flagged ⚠️';
        subject = '⚠️ KYC Flagged for Manual Review';
        bodyCopy = 'Your account has been flagged for manual review.';
        if (reason) {
            bodyCopy += ` Reason: ${reason}`;
        }
    }

    const reasonBlock = reason
        ? `<p><strong>Reason:</strong> ${reason}</p>`
        : '';

    await send({
        to,
        subject,
        html: baseTemplate(`
            <p>Hi <span class="highlight">${username}</span>,</p>
            <h2 style="margin: 8px 0 16px; color: ${accentColor};">${headline}</h2>
            <p>Your KYC review has been processed by the Titan Arena admin team.</p>
            ${reasonBlock}
            <p>${bodyCopy}</p>
            <a href="${process.env.APP_URL || 'https://titanarena.gg'}/settings" class="cta">Open Settings</a>
        `),
    });
};
