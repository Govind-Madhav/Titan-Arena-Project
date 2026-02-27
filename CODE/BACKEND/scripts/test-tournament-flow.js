/**
 * Titan Arena — Tournament Flow E2E Test
 *
 * Tests the full lifecycle:
 * [HOST]   Login → Create Tournament → List own tournaments → Cancel
 * [PLAYER] Login → List public tournaments → Join → Leave
 *
 * Usage: node scripts/test-tournament-flow.js
 * Prerequisites: node scripts/seed-test-users.js
 */
require('dotenv').config();
const http = require('http');

const BASE = `http://localhost:${process.env.PORT || 5001}`;
const HOST_EMAIL = 'qa_host@titan.test';
const PLAYER_EMAIL = 'qa_player@titan.test';
const PASS = 'Admin@1234';

let passed = 0;
let failed = 0;
let hostToken = '';
let playerToken = '';
let hostCookie = '';
let playerCookie = '';
let tournamentId = '';

// ─── HTTP Helper ──────────────────────────────────────────────────────────────
function request(method, path, body = null, { token = '', cookie = '' } = {}) {
    return new Promise((resolve, reject) => {
        const bodyStr = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'localhost',
            port: Number(process.env.PORT) || 5001,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
                ...(cookie ? { 'Cookie': cookie } : {}),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            }
        };
        const req = http.request(options, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                const sc = res.headers['set-cookie'];
                const jar = sc ? sc.map(c => c.split(';')[0]).join('; ') : null;
                try { resolve({ status: res.statusCode, body: JSON.parse(d), cookie: jar }); }
                catch { resolve({ status: res.statusCode, body: d, cookie: jar }); }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

function log(label, status, detail = '') {
    const icon = status === 'PASS' ? '✅' : status === 'SKIP' ? '⏭️ ' : '❌';
    if (status === 'PASS') passed++;
    if (status === 'FAIL') failed++;
    console.log(`${icon} [${status}] ${label}${detail ? '\n         → ' + detail : ''}`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function loginHost() {
    console.log('\n🔐 HOST Login');
    const r = await request('POST', '/api/auth/login', { email: HOST_EMAIL, password: PASS });
    if (r.status === 200 && r.body.success) {
        hostToken = r.body.data.accessToken;
        hostCookie = r.cookie || '';
        log('HOST login', 'PASS', `Role: ${r.body.data.user.role}  UID: ${r.body.data.user.platformUid}`);
        return true;
    }
    log('HOST login', 'FAIL', JSON.stringify(r.body));
    return false;
}

async function loginPlayer() {
    console.log('\n🔐 PLAYER Login');
    const r = await request('POST', '/api/auth/login', { email: PLAYER_EMAIL, password: PASS });
    if (r.status === 200 && r.body.success) {
        playerToken = r.body.data.accessToken;
        playerCookie = r.cookie || '';
        log('PLAYER login', 'PASS', `Role: ${r.body.data.user.role}  UID: ${r.body.data.user.platformUid}`);
        return true;
    }
    log('PLAYER login', 'FAIL', JSON.stringify(r.body));
    return false;
}

async function createTournament() {
    console.log('\n🏆 Create Tournament (HOST)');
    const r = await request('POST', '/api/tournaments', {
        name: 'QA Pro League S1',
        game: 'VALORANT',
        description: 'Automated test tournament by QA Host',
        type: 'SOLO',
        format: 'SINGLE_ELIMINATION',
        startTime: new Date(Date.now() + 2 * 86400000).toISOString(),
        registrationEnd: new Date(Date.now() + 1 * 86400000).toISOString(),
        entryFee: 0,
        prizePool: 0,
        minTeamsRequired: 4,
        maxParticipants: 16,
    }, { token: hostToken });

    if (r.status === 201 && r.body.success) {
        tournamentId = r.body.data?.id;
        log('POST /api/tournaments (create)', 'PASS', `ID: ${tournamentId}`);
        return true;
    }
    log('POST /api/tournaments (create)', 'FAIL', JSON.stringify(r.body));
    return false;
}

async function listPublicTournaments() {
    console.log('\n📋 List Public Tournaments');
    const r = await request('GET', '/api/tournaments');
    r.status === 200 && r.body.success
        ? log('GET /api/tournaments (public list)', 'PASS', `Total: ${r.body.data?.length}`)
        : log('GET /api/tournaments (public list)', 'FAIL', JSON.stringify(r.body));
}

async function getTournamentById() {
    if (!tournamentId) return;
    console.log('\n🔍 Get Tournament by ID');
    const r = await request('GET', `/api/tournaments/${tournamentId}`);
    r.status === 200 && r.body.success
        ? log(`GET /api/tournaments/${tournamentId}`, 'PASS', `Name: ${r.body.data?.name}  Status: ${r.body.data?.status}`)
        : log(`GET /api/tournaments/${tournamentId}`, 'FAIL', JSON.stringify(r.body));
}

async function hostDashboard() {
    console.log('\n📊 Host Dashboard');
    const r = await request('GET', '/api/tournaments/host/dashboard', null, { token: hostToken });
    r.status === 200 && r.body.success
        ? log('GET /api/tournaments/host/dashboard', 'PASS', `Tournaments: ${r.body.data?.tournaments?.length}`)
        : log('GET /api/tournaments/host/dashboard', 'FAIL', JSON.stringify(r.body));
}

async function updateTournamentToRegistration() {
    if (!tournamentId) return;
    console.log('\n✏️  Update Tournament Status → REGISTRATION (HOST)');
    const r = await request('PUT', `/api/tournaments/${tournamentId}`, {
        status: 'REGISTRATION'
    }, { token: hostToken });
    r.status === 200 && r.body.success
        ? log('PUT /api/tournaments/:id (status→REGISTRATION)', 'PASS')
        : log('PUT /api/tournaments/:id (status→REGISTRATION)', 'FAIL', JSON.stringify(r.body));
}

async function playerJoinTournament() {
    if (!tournamentId) return;
    console.log('\n➕ Player Join Tournament');
    const r = await request('POST', `/api/tournaments/${tournamentId}/join`, {}, { token: playerToken });
    if (r.status === 200 && r.body.success) {
        log(`POST /api/tournaments/:id/join (PLAYER)`, 'PASS', r.body.message);
    } else {
        log(`POST /api/tournaments/:id/join (PLAYER)`, 'FAIL', JSON.stringify(r.body));
    }
}

async function getParticipants() {
    if (!tournamentId) return;
    console.log('\n👥 Get Participants (HOST)');
    const r = await request('GET', `/api/tournaments/${tournamentId}/participants`, null, { token: hostToken });
    r.status === 200 && r.body.success
        ? log('GET /api/tournaments/:id/participants', 'PASS', `Count: ${r.body.data?.length}`)
        : log('GET /api/tournaments/:id/participants', 'FAIL', JSON.stringify(r.body));
}

async function playerLeaveTournament() {
    if (!tournamentId) return;
    console.log('\n➖ Player Leave Tournament');
    const r = await request('DELETE', `/api/tournaments/${tournamentId}/leave`, null, { token: playerToken });
    r.status === 200 && r.body.success
        ? log('DELETE /api/tournaments/:id/leave (PLAYER)', 'PASS', r.body.message)
        : log('DELETE /api/tournaments/:id/leave (PLAYER)', 'FAIL', JSON.stringify(r.body));
}

async function cancelTournament() {
    if (!tournamentId) return;
    console.log('\n🚫 Cancel Tournament (HOST)');
    const r = await request('POST', `/api/tournaments/${tournamentId}/cancel`, {}, { token: hostToken });
    r.status === 200 && r.body.success
        ? log('POST /api/tournaments/:id/cancel', 'PASS', r.body.message)
        : log('POST /api/tournaments/:id/cancel', 'FAIL', JSON.stringify(r.body));
}

async function playerTryJoinAfterCancel() {
    if (!tournamentId) return;
    console.log('\n🔒 Player Join Cancelled Tournament (expect 400)');
    const r = await request('POST', `/api/tournaments/${tournamentId}/join`, {}, { token: playerToken });
    (r.status === 400 || r.status === 403)
        ? log('JOIN cancelled tournament (blocked)', 'PASS', `${r.status}: ${r.body.message}`)
        : log('JOIN cancelled tournament (blocked)', 'FAIL', JSON.stringify(r.body));
}

async function walletBalance(label, token) {
    console.log(`\n💰 Wallet Balance (${label})`);
    const r = await request('GET', '/api/wallet/balance', null, { token });
    r.status === 200 && r.body.success
        ? log(`GET /api/wallet/balance (${label})`, 'PASS', `Balance: ${r.body.data?.balance ?? JSON.stringify(r.body.data)}`)
        : log(`GET /api/wallet/balance (${label})`, 'FAIL', JSON.stringify(r.body));
}

// ─── Runner ───────────────────────────────────────────────────────────────────
async function run() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   🏆 Titan Arena — Tournament Flow E2E Test');
    console.log(`   Target: ${BASE}`);
    console.log('═══════════════════════════════════════════════════════');

    const hostOk = await loginHost();
    const playerOk = await loginPlayer();
    if (!hostOk || !playerOk) { summary(); return; }

    await walletBalance('PLAYER', playerToken);
    await walletBalance('HOST', hostToken);

    await listPublicTournaments();

    const created = await createTournament();
    if (!created) { summary(); return; }

    await getTournamentById();
    await hostDashboard();
    await updateTournamentToRegistration();
    await playerJoinTournament();
    await getParticipants();
    await playerLeaveTournament();
    await cancelTournament();
    await playerTryJoinAfterCancel();

    summary();
}

function summary() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`   Results: ✅ ${passed} passed   ❌ ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════\n');
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
