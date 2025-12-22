/**
 * Cache Middleware Usage Examples
 * Demonstrates safe and unsafe caching patterns
 * 
 * CRITICAL: Caching misuse = security bugs, not performance bugs
 * 
 * ⚠️ PRODUCTION TRUTH:
 * - Invalidation patterns must be narrow and deterministic
 * - TTLs alone mask bugs, they don't eliminate them
 * - Admin ≠ uncacheable, Admin = high risk + high discipline
 * - Documentation is not a safety mechanism - code must enforce
 */

const { cacheMiddleware, invalidateCache, generateCacheKey, generateInvalidationPattern } = require('../middleware/cache.middleware');

// ==========================================
// ✅ SAFE USAGE EXAMPLES
// ==========================================

/**
 * Example 1: Public tournament list (no auth required)
 * Safe because: data is public, same for all users
 * TTL: 5min based on update frequency (tournaments change ~hourly)
 */
router.get('/api/tournaments',
    cacheMiddleware(300), // 5 minutes
    getTournaments
);

/**
 * Example 2: Public leaderboard
 * Safe because: data is public
 * TTL: 1min - updated frequently via match completion events
 */
router.get('/api/leaderboard',
    cacheMiddleware(60),
    getLeaderboard
);

/**
 * Example 3: User-specific data WITH user scoping
 * Safe because: includeUserId ensures each user has separate cache
 * 
 * ✅ GUARD RAIL: Middleware will enforce req.user exists when includeUserId=true
 */
router.get('/api/users/:id/profile',
    authMiddleware, // MUST come before cache
    cacheMiddleware(300, null, { includeUserId: true }),
    getUserProfile
);

/**
 * Example 4: Custom key generator for complex routes
 * Safe because: explicitly handles user context + resource permissions
 */
const tournamentKeyGenerator = (req) => {
    const tournamentId = req.params.id;
    const userId = req.user?.id || 'public';
    const role = req.user?.role || 'guest';
    // Different cache per user role (admins see more data)
    return `cache:tournament:${tournamentId}:${role}:${userId}`;
};

router.get('/api/tournaments/:id',
    cacheMiddleware(300, tournamentKeyGenerator),
    getTournamentDetails
);

/**
 * Example 5: Versioned cache keys (production-grade)
 * ✅ BEST PRACTICE: Version-based invalidation instead of wildcards
 * 
 * When tournament updates:
 * - Don't delete cache:tournament:42:*
 * - Instead: increment cache:tournament:42:v{N}
 * - Old cache expires naturally (no Redis KEYS scan)
 */
const versionedTournamentKey = (req) => {
    const tournamentId = req.params.id;
    // Version from database or Redis counter
    const version = req.tournamentVersion || 1; // Set by previous middleware
    return `cache:tournament:${tournamentId}:v${version}`;
};

router.get('/api/tournaments/:id/advanced',
    loadTournamentVersion, // Middleware sets req.tournamentVersion
    cacheMiddleware(3600, versionedTournamentKey), // Long TTL, version controls freshness
    getTournamentAdvanced
);

// ==========================================
// ❌ UNSAFE USAGE EXAMPLES (DON'T DO THIS)
// ==========================================

/**
 * ❌ WRONG: Wallet endpoint without user scoping
 * Problem: User A's balance will be shown to User B (SECURITY BUG)
 */
router.get('/api/wallet/balance',
    authMiddleware,
    cacheMiddleware(300), // ❌ NO! Missing includeUserId
    getWalletBalance
);

/**
 * ❌ WRONG: Auth-required endpoint without user scoping
 * Problem: Data leakage between users
 */
router.get('/api/users/me',
    authMiddleware,
    cacheMiddleware(300), // ❌ NO! Will leak user data
    getCurrentUser
);

/**
 * ❌ WRONG: Admin endpoint with naive caching
 * Problem: Role-specific data without role scoping
 * 
 * Note: Admin CAN be cached, but requires:
 * - Role-scoped keys
 * - Short TTLs
 * - Event-driven invalidation
 */
router.get('/api/admin/stats',
    adminMiddleware,
    cacheMiddleware(300), // ❌ NO! Missing role scoping
    getAdminStats
);

/**
 * ❌ WRONG: Cache before auth middleware
 * Problem: req.user doesn't exist yet, breaks user scoping
 */
router.get('/api/users/:id/private',
    cacheMiddleware(300, null, { includeUserId: true }), // ❌ req.user is undefined!
    authMiddleware, // Too late!
    getUserPrivateData
);

// ==========================================
// ✅ CORRECT: Admin caching (high discipline)
// ==========================================

/**
 * ✅ Admin data CAN be cached with proper scoping
 * Requirements:
 * - Role-specific keys
 * - Audit trail
 * - Event-driven invalidation
 */
const adminStatsKeyGenerator = (req) => {
    const role = req.user.role; // 'admin', 'superadmin', etc.
    const scope = req.query.scope || 'global';
    return `cache:admin:stats:${role}:${scope}`;
};

router.get('/api/admin/stats',
    adminMiddleware,
    cacheMiddleware(60, adminStatsKeyGenerator), // Short TTL + role scoping
    getAdminStats
);

// ==========================================
// CACHE INVALIDATION EXAMPLES
// ==========================================

/**
 * ❌ DANGEROUS: Broad wildcard invalidation
 * Problem: O(N) KEYS operation = Redis cluster suicide under load
 */
router.put('/api/tournaments/:id',
    invalidateCache('cache:*:*/tournaments/*'), // ❌ TOO BROAD
    updateTournament
);

/**
 * ✅ BETTER: Narrow, deterministic invalidation
 */
router.put('/api/tournaments/:id',
    invalidateCache('cache:public:/api/tournaments'), // Narrow list cache only
    updateTournament
);

/**
 * ✅ BEST: Event-driven invalidation (no cache middleware needed)
 * When tournament updates:
 * 1. MySQL commit
 * 2. Publish TOURNAMENT_UPDATED event
 * 3. Worker clears specific Firebase path
 * 4. Frontend gets real-time update
 * 
 * No cache TTL guessing, no wildcard scans
 */
router.put('/api/tournaments/:id',
    async (req, res) => {
        // Update MySQL
        await updateTournamentInDB(req.params.id, req.body);

        // Publish event (worker handles Firebase sync + cache invalidation)
        publishTournamentUpdated({
            tournamentId: req.params.id,
            updatedFields: Object.keys(req.body)
        });

        res.json({ success: true });
    }
);

/**
 * ✅ VERSIONED INVALIDATION: Increment version instead of delete
 */
router.put('/api/tournaments/:id',
    async (req, res) => {
        // Increment version in Redis
        await redis.incr(`tournament:${req.params.id}:version`);

        // Update data
        await updateTournamentInDB(req.params.id, req.body);

        // Old cache (v1, v2, etc.) dies naturally via TTL
        // New requests get v3 with fresh data
        res.json({ success: true });
    }
);

// ==========================================
// GUARD RAILS (Enforce safety at runtime)
// ==========================================

/**
 * ✅ Enhanced middleware with guard rails
 * 
 * Add to cacheMiddleware.js:
 * 
 * if (options.includeUserId && !req.user) {
 *   throw new Error('User-scoped cache requires authenticated user. Add authMiddleware before cacheMiddleware.');
 * }
 * 
 * if (req.route.path.includes('/admin') && !options.customKeyGenerator) {
 *   console.warn('⚠️  Admin route detected without custom key generator. High risk!');
 * }
 * 
 * if (req.route.path.includes('/wallet') || req.route.path.includes('/payment')) {
 *   throw new Error('Wallet/payment routes should NOT use cacheMiddleware');
 * }
 */

// ==========================================
// TTL Strategy (Event-Driven)
// ==========================================

/**
 * ✅ PRODUCTION PATTERN: Align TTLs with event frequency
 * 
 * Resource           | Update Event          | Cache TTL  | Invalidation
 * -------------------|----------------------|------------|-------------
 * Tournaments list   | TOURNAMENT_UPDATED   | 300s       | Event-driven
 * Leaderboard        | MATCH_COMPLETED      | 60s        | Event-driven
 * Match results      | MATCH_COMPLETED      | 3600s      | Event-driven
 * User profiles      | USER_UPDATED         | 600s       | Event-driven
 * 
 * Rule: TTL is backup, not primary freshness mechanism
 * Events ensure consistency, TTL prevents stale data if events fail
 */

module.exports = router;
