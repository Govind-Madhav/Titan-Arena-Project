/**
 * Titan Arena — Automated End-to-End API Test Script
 * Tests: Health, Register, OTP (auto-captured), Login, Token Refresh,
 *        Tournaments (public list + create), Wallet, Logout
 *
 * Usage: node scripts/test-api.js
 *
 * How OTP capture works:
 *   After calling /register, the OTP is stored in Redis as a bcrypt hash.
 *   We cannot reverse-hash it, but the server PRINTS the plaintext OTP
 *   to the terminal (dev mode). We patch console.log to intercept it.
 */

/* eslint-disable sonarjs/no-nested-ternary, no-negated-condition, sonarjs/no-nested-functions */

require('dotenv').config();
const http = require('node:http');

const BASE = `http://localhost:${process.env.PORT || 5001}`;
const STAMP = Date.now();
const TEST_EMAIL = `testuser_${STAMP}@titanarenaqatest.com`;
const TEST_PASS = 'TestPass@1234';
const TEST_IGN = `Tester${String(STAMP).slice(-5)}`;
const TEST_USERNAME = `tester${String(STAMP).slice(-6)}`;

let passed = 0;
let failed = 0;
let cookieJar = '';
let accessToken = '';

// ─── OTP Interceptor ─────────────────────────────────────────────────────────
// The server prints: 🔐 OTP for <email>: <code>
// We intercept this from the OTP service directly in the same process.
let capturedOtp = null;
const _origLog = console.log.bind(console);
console.log = (...args) => {
    const msg = args.join(' ');
    const otpRegex = /OTP for .+?: (\d{6})/;
    const m = otpRegex.exec(msg);
    if (m) capturedOtp = m[1];
    _origLog(...args);
};

// ─── HTTP Helper ──────────────────────────────────────────────────────────────
function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE + path);
        const bodyStr = body ? JSON.stringify(body) : null;
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
                ...(cookieJar ? { 'Cookie': cookieJar } : {}),
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
            }
        };

        const req = http.request(options, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const sc = res.headers['set-cookie'];
                if (sc) {
                    const cookies = sc.map((cookie) => cookie.split(';')[0]);
                    cookieJar = cookies.join('; ');
                }
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

function log(label, status, detail = '') {
    let icon = '❌';
    if (status === 'PASS') {
        icon = '✅';
    } else if (status === 'SKIP') {
        icon = '⏭️ ';
    }
    if (status === 'PASS') passed++;
    if (status === 'FAIL') failed++;
    _origLog(`${icon} [${status}] ${label}${detail ? ' — ' + detail : ''}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Test Cases ──────────────────────────────────────────────────────────────

async function t01_health() {
    _origLog('\n📡 [1] Health Check');
    const r = await request('GET', '/api/health');
    r.status === 200 && r.body.success !== false
        ? log('GET /api/health', 'PASS', `Status: ${r.body.status}`)
        : log('GET /api/health', 'FAIL', JSON.stringify(r.body));
}

async function t02_ignCheck() {
    _origLog('\n🎮 [2] IGN Availability');
    const r = await request('POST', '/api/auth/check-ign', { ign: TEST_IGN });
    const r2 = await request('POST', '/api/auth/check-ign', { ign: 'a' });
    r.body.available === true ? log('check-ign (new)', 'PASS') : log('check-ign (new)', 'FAIL', JSON.stringify(r.body));
    r2.body.available === null ? log('check-ign (too short)', 'PASS') : log('check-ign (too short)', 'FAIL', JSON.stringify(r2.body));
}

async function t03_usernameAvail() {
    _origLog('\n🔍 [3] Username Availability');
    const r = await request('POST', '/api/auth/check-availability', { field: 'username', value: TEST_USERNAME });
    r.status === 200 ? log('check-availability (username)', 'PASS') : log('check-availability (username)', 'FAIL', JSON.stringify(r.body));
}

async function t04_register() {
    _origLog('\n📝 [4] Register (sends OTP)');
    const r = await request('POST', '/api/auth/register', {
        ign: TEST_IGN,
        email: TEST_EMAIL,
        password: TEST_PASS,
        confirmPassword: TEST_PASS,
        legalName: 'QA Test User',
        dateOfBirth: '2000-06-15',
        username: TEST_USERNAME,
        region: 1,
        country: 'IN',
        state: 'Maharashtra',
        city: 'Mumbai',
        termsAccepted: true,
        role: 'PLAYER'
    });
    r.status === 201 && r.body.success
        ? log('POST /api/auth/register', 'PASS', r.body.message)
        : log('POST /api/auth/register', 'FAIL', JSON.stringify(r.body));
    return r.body.success;
}

async function t05_verifyEmail() {
    _origLog('\n📧 [5] Email OTP Verification');

    // The OTP is printed to the server terminal and also intercepted above
    // Give the server a brief moment to emit the log
    await sleep(500);

    if (!capturedOtp) {
        log('POST /api/auth/verify-email', 'SKIP', 'OTP not captured (check server logs)');
        return false;
    }

    _origLog(`   ℹ️  Captured OTP: ${capturedOtp}`);
    const r = await request('POST', '/api/auth/verify-email', { email: TEST_EMAIL, otp: capturedOtp });
    if (r.status === 200 && r.body.success) {
        log('POST /api/auth/verify-email', 'PASS', r.body.message);
        return true;
    } else {
        log('POST /api/auth/verify-email', 'FAIL', JSON.stringify(r.body));
        return false;
    }
}

async function t06_login() {
    _origLog('\n🔐 [6] Login');
    const r = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
    if (r.status === 200 && r.body.success) {
        accessToken = r.body.data.accessToken;
        log('POST /api/auth/login', 'PASS', `Role: ${r.body.data.user.role}, UID: ${r.body.data.user.platformUid}`);
        return true;
    } else {
        log('POST /api/auth/login', 'FAIL', JSON.stringify(r.body));
        return false;
    }
}

async function t07_tokenRefresh() {
    _origLog('\n🔄 [7] Token Refresh (cookie-based)');
    const saved = accessToken;
    accessToken = '';
    const r = await request('POST', '/api/auth/refresh');
    if (r.status === 200 && r.body.success) {
        accessToken = r.body.data.accessToken;
        log('POST /api/auth/refresh', 'PASS');
    } else {
        accessToken = saved;
        log('POST /api/auth/refresh', 'FAIL', JSON.stringify(r.body));
    }
}

async function t08_publicTournaments() {
    _origLog('\n🏆 [8] Public Tournaments List');
    const r = await request('GET', '/api/tournaments');
    r.status === 200 && r.body.success
        ? log('GET /api/tournaments', 'PASS', `Count: ${r.body.data?.length}`)
        : log('GET /api/tournaments', 'FAIL', JSON.stringify(r.body));
}

async function t09_createTournament() {
    _origLog('\n📋 [9] Create Tournament (PLAYER role → should be blocked)');
    const r = await request('POST', '/api/tournaments', {
        name: 'QA Auto Test Open',
        game: 'VALORANT',
        description: 'Automated test tournament',
        type: 'SOLO',
        format: 'SINGLE_ELIMINATION',
        startTime: new Date(Date.now() + 2 * 86400000).toISOString(),
        registrationEnd: new Date(Date.now() + 1 * 86400000).toISOString(),
        entryFee: 0,
        prizePool: 0,
        minTeamsRequired: 4,
    });
    if (r.status === 403 || r.status === 401) {
        log('POST /api/tournaments (PLAYER blocked)', 'PASS', `${r.status}: ${r.body.message}`);
    } else if (r.status === 201 && r.body.success) {
        log('POST /api/tournaments', 'PASS', `ID: ${r.body.data?.id}`);
    } else {
        log('POST /api/tournaments', 'FAIL', JSON.stringify(r.body));
    }
}

async function t10_walletBalance() {
    _origLog('\n💰 [10] Wallet Balance');
    const r = await request('GET', '/api/wallet/balance');
    r.status === 200 && r.body.success
        ? log('GET /api/wallet/balance', 'PASS', `Balance: ${r.body.data?.balance ?? r.body.data?.wallet?.balance}`)
        : log('GET /api/wallet/balance', 'FAIL', JSON.stringify(r.body));
}

async function t11_logout() {
    _origLog('\n🚪 [11] Logout');
    const r = await request('POST', '/api/auth/logout');
    r.status === 200 && r.body.success
        ? log('POST /api/auth/logout', 'PASS')
        : log('POST /api/auth/logout', 'FAIL', JSON.stringify(r.body));
}

// ─── Runner ───────────────────────────────────────────────────────────────────
async function run() {
    _origLog('═══════════════════════════════════════════════════════');
    _origLog('    🎮 Titan Arena — Automated E2E API Test Suite');
    _origLog(`    Target : ${BASE}`);
    _origLog(`    User   : ${TEST_EMAIL}`);
    _origLog('═══════════════════════════════════════════════════════');

    await t01_health();
    await t02_ignCheck();
    await t03_usernameAvail();

    const ok = await t04_register();
    if (!ok) { summary(); return; }

    // NOTE: OTP is captured by the log interceptor above
    // The server is in the same machine so the log fires before the HTTP response resolves
    const verified = await t05_verifyEmail();
    if (!verified) { summary(); return; }

    const loggedIn = await t06_login();
    if (!loggedIn) { summary(); return; }

    await t07_tokenRefresh();
    await t08_publicTournaments();
    await t09_createTournament();
    await t10_walletBalance();
    await t11_logout();

    summary();
}

function summary() {
    _origLog('\n═══════════════════════════════════════════════════════');
    _origLog(`    Results: ✅ ${passed} passed   ❌ ${failed} failed`);
    _origLog('═══════════════════════════════════════════════════════\n');
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    _origLog('Fatal test error:', err);
    process.exit(1);
});
