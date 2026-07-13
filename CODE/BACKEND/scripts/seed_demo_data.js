/**
 * Seed Demo Data for Titan Arena
 * 
 * This script seeds realistic-looking games, players, MMR ratings, 
 * tournaments, teams, and social posts to make the web app look full and active.
 * 
 * Run with: node scripts/seed_demo_data.js
 */
require('dotenv').config();
const { db } = require('../src/db');
const { 
    users, 
    wallets, 
    playerProfiles, 
    uidCounters, 
    games, 
    tournaments, 
    teams, 
    teamMembers, 
    posts, 
    mmrRatings 
} = require('../src/db/schema');
const { eq, or, like, sql, and, ne } = require('drizzle-orm');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const PASS = 'Admin@1234';

async function generateUid() {
    await db.update(uidCounters)
        .set({ lastValue: sql`${uidCounters.lastValue} + 1` })
        .where(eq(uidCounters.region, 1));

    const [row] = await db.select().from(uidCounters).where(eq(uidCounters.region, 1));
    return '1' + String(row.lastValue).padStart(9, '0');
}

async function cleanOldDemoData() {
    console.log('🧹 Cleaning old demo data...');
    
    // Find all users ending with @titan.test, but exclude HawkeyeOG to keep their host account intact
    const demoUsers = await db.select({ id: users.id })
        .from(users)
        .where(and(
            like(users.email, '%@titan.test'),
            ne(users.username, 'HawkeyeOG')
        ));
    const demoUserIds = demoUsers.map(u => u.id);

    if (demoUserIds.length > 0) {
        // 1. Delete posts by demo users (resolves foreign key posts_user_id_users_id_fk)
        await db.delete(posts).where(sql`${posts.userId} IN ${demoUserIds}`);

        // 2. Clear MMR ratings for demo users
        await db.delete(mmrRatings).where(sql`${mmrRatings.userId} IN ${demoUserIds}`);
        
        // 3. Clear profiles
        await db.delete(playerProfiles).where(sql`${playerProfiles.userId} IN ${demoUserIds}`);
        
        // 4. Clear wallets
        await db.delete(wallets).where(sql`${wallets.userId} IN ${demoUserIds}`);
        
        // 5. Find teams by demo captains
        const demoTeams = await db.select({ id: teams.id }).from(teams).where(sql`${teams.captainId} IN ${demoUserIds}`);
        const demoTeamIds = demoTeams.map(t => t.id);
        if (demoTeamIds.length > 0) {
            await db.delete(teamMembers).where(sql`${teamMembers.teamId} IN ${demoTeamIds}`);
            await db.delete(teams).where(sql`${teams.id} IN ${demoTeamIds}`);
        }

        // 6. Clear tournaments hosted by demo users
        await db.delete(tournaments).where(sql`${tournaments.hostId} IN ${demoUserIds}`);

        // 7. Delete users
        await db.delete(users).where(sql`${users.id} IN ${demoUserIds}`);
    }

    // Delete demo games
    await db.delete(games).where(or(
        eq(games.slug, 'valorant'),
        eq(games.slug, 'bgmi'),
        eq(games.slug, 'cs2'),
        eq(games.slug, 'lol')
    ));

    console.log('✨ Database clean complete.');
}

async function main() {
    // 1. Clean old demo data
    await cleanOldDemoData();

    console.log('🌱 Seeding new demo data...');

    // 2. Initialize UID counters if not exists
    const existingCounter = await db.select().from(uidCounters).where(eq(uidCounters.region, 1)).limit(1);
    if (!existingCounter[0]) {
        await db.insert(uidCounters).values({ region: 1, lastValue: 100 });
    }

    const hash = await bcrypt.hash(PASS, 12);

    // 3. Find or Create Host User (HawkeyeOG)
    let hostId;
    const [existingHawkeye] = await db.select().from(users).where(eq(users.username, 'HawkeyeOG')).limit(1);
    
    if (existingHawkeye) {
        console.log('✅ Found existing HawkeyeOG user in DB.');
        hostId = existingHawkeye.id;
        
        // Ensure they have the HOST role
        await db.update(users)
            .set({ role: 'HOST', hostStatus: 'VERIFIED' })
            .where(eq(users.id, hostId));
            
        // Ensure they have a wallet
        const [existingWallet] = await db.select().from(wallets).where(eq(wallets.userId, hostId)).limit(1);
        if (!existingWallet) {
            await db.insert(wallets).values({
                id: crypto.randomUUID(),
                userId: hostId,
                balance: 5000000,
                locked: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
    } else {
        console.log('🌱 HawkeyeOG user not found. Creating a new HawkeyeOG demo user...');
        hostId = crypto.randomUUID();
        const hostUid = await generateUid();
        await db.insert(users).values({
            id: hostId,
            platformUid: hostUid,
            username: 'HawkeyeOG',
            email: 'hawkeye@titan.test',
            passwordHash: hash,
            emailVerified: true,
            role: 'HOST',
            hostStatus: 'VERIFIED',
            countryCode: 'IN',
            state: 'MH',
            legalName: 'Hawkeye OG',
            dateOfBirth: new Date('1990-01-01'),
            regionCode: 1,
            registrationCompleted: true,
            termsAccepted: true,
        });
        await db.insert(wallets).values({
            id: crypto.randomUUID(),
            userId: hostId,
            balance: 5000000, // ₹50,000.00
            locked: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        await db.insert(playerProfiles).values({
            userId: hostId,
            ign: 'HawkeyeOG',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
            country: 'India',
            bio: 'Official Host for Titan Esports Tournaments.'
        });
    }

    // 4. Create Players
    const playersData = [
        { email: 'qa_player@titan.test', username: 'qa_player', ign: 'QAPlayer01', rating: 1550, wins: 30, losses: 20, tier: 'GOLD' },
        { email: 'mortal@titan.test', username: 'mortal_op', ign: 'Mortal', rating: 2200, wins: 85, losses: 25, tier: 'DIAMOND' },
        { email: 'scout@titan.test', username: 'scout_op', ign: 'ScoutOP', rating: 2050, wins: 70, losses: 35, tier: 'PLATINUM' },
        { email: 'jonathan@titan.test', username: 'jonathan_gaming', ign: 'JONATHAN', rating: 2450, wins: 110, losses: 15, tier: 'CHAMPION' },
        { email: 'mavi@titan.test', username: 'mavi_op', ign: 'Mavi', rating: 1800, wins: 50, losses: 30, tier: 'PLATINUM' },
        { email: 'viper@titan.test', username: 'viper_gaming', ign: 'Viper', rating: 1650, wins: 40, losses: 25, tier: 'GOLD' },
    ];

    const seededPlayers = [];

    for (const player of playersData) {
        const pId = crypto.randomUUID();
        const pUid = await generateUid();
        
        await db.insert(users).values({
            id: pId,
            platformUid: pUid,
            username: player.username,
            email: player.email,
            passwordHash: hash,
            emailVerified: true,
            role: 'PLAYER',
            hostStatus: 'NOT_VERIFIED',
            countryCode: 'IN',
            state: 'MH',
            legalName: player.ign + ' Live',
            dateOfBirth: new Date('1998-05-20'),
            regionCode: 1,
            registrationCompleted: true,
            termsAccepted: true,
        });

        await db.insert(wallets).values({
            id: crypto.randomUUID(),
            userId: pId,
            balance: 100000, // ₹1,000.00
            locked: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await db.insert(playerProfiles).values({
            userId: pId,
            ign: player.ign,
            avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?q=80&w=200&auto=format&fit=crop`,
            country: 'India',
            bio: `Competitive esports player. Gaming is a passion and career.`
        });

        await db.insert(mmrRatings).values({
            userId: pId,
            rating: player.rating,
            gamesPlayed: player.wins + player.losses,
            wins: player.wins,
            losses: player.losses,
            peakRating: player.rating + 100,
            currentStreak: 3,
            tier: player.tier,
            updatedAt: new Date()
        });

        seededPlayers.push({ id: pId, ...player });
    }

    console.log(`✅ Seeded ${seededPlayers.length} players & MMR profiles.`);

    // 5. Create Games
    const gameList = [
        {
            name: 'VALORANT',
            slug: 'valorant',
            shortName: 'VAL',
            logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200&auto=format&fit=crop',
            bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
            description: 'A 5v5 character-based tactical shooter where precise gunplay meets unique agent abilities.'
        },
        {
            name: 'BATTLEGROUNDS MOBILE INDIA',
            slug: 'bgmi',
            shortName: 'BGMI',
            logoUrl: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=200&auto=format&fit=crop',
            bannerUrl: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=800&auto=format&fit=crop',
            description: 'The premier mobile battle royale game in India. Drop in, gear up, and survive.'
        },
        {
            name: 'COUNTER-STRIKE 2',
            slug: 'cs2',
            shortName: 'CS2',
            logoUrl: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=200&auto=format&fit=crop',
            bannerUrl: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=800&auto=format&fit=crop',
            description: 'The next era of competitive tactical shooters, built on the Source 2 engine.'
        },
        {
            name: 'LEAGUE OF LEGENDS',
            slug: 'lol',
            shortName: 'LOL',
            logoUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=200&auto=format&fit=crop',
            bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop',
            description: 'A fast-paced, competitive, event-driven multiplayer online battle arena (MOBA).'
        }
    ];

    for (const g of gameList) {
        await db.insert(games).values({
            id: crypto.randomUUID(),
            name: g.name,
            slug: g.slug,
            shortName: g.shortName,
            logoUrl: g.logoUrl,
            bannerUrl: g.bannerUrl,
            description: g.description,
            isActive: true
        });
    }
    console.log('✅ Seeded 4 major competitive games.');

    // 6. Create Teams
    const teamsData = [
        { name: 'Team Soul', captain: 'Mortal' },
        { name: 'GodLike Esports', captain: 'JONATHAN' },
        { name: 'Team XSpark', captain: 'ScoutOP' },
        { name: 'QA United', captain: 'QAPlayer01' },
    ];

    const seededTeams = [];

    for (const t of teamsData) {
        const teamId = crypto.randomUUID();
        const captain = seededPlayers.find(p => p.ign === t.captain);

        await db.insert(teams).values({
            id: teamId,
            name: t.name,
            captainId: captain.id,
            maxMembers: 5,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Insert Captain as member
        await db.insert(teamMembers).values({
            id: crypto.randomUUID(),
            userId: captain.id,
            teamId: teamId,
            role: 'CAPTAIN'
        });

        seededTeams.push({ id: teamId, name: t.name, captainId: captain.id });
    }
    console.log('✅ Seeded 4 competitive e-sports teams.');

    // 7. Create Tournaments
    const tournamentsData = [
        // ─── VALORANT ──────────────────────────────────────────────────────────
        {
            name: 'Titan Valorant Cup S1',
            game: 'VALORANT',
            description: 'Compete against India\'s elite Valorant squads in Season 1 of the Titan Cup. ₹2 Lakh Prize Pool, single-elimination brackets. Top 3 matches broadcasted live.',
            rules: '1. Standard 5v5 map drafts. 2. Map pool: Bind, Haven, Split, Ascent. 3. No toxicity or unapproved software.',
            type: 'TEAM',
            format: 'SINGLE_ELIMINATION',
            entryFee: 10000, // ₹100.00
            prizePool: 20000000, // ₹2,00,000.00
            minTeamsRequired: 4,
            maxParticipants: 16,
            status: 'ONGOING', // Mapped from LIVE
            startTime: new Date(),
            registrationEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // ended yesterday
            bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
            streamUrl: 'https://twitch.tv/titan_arena',
            streamIsLive: true,
            streamPlatform: 'TWITCH'
        },
        {
            name: 'Valorant Challengers League',
            game: 'VALORANT',
            description: 'The road to professional Valorant. Teams compete in a single-elimination bracket for ₹3 Lakh prize pool and promotion to the Major league.',
            rules: '1. All players must use registered accounts. 2. Standard map pick-ban process.',
            type: 'TEAM',
            format: 'SINGLE_ELIMINATION',
            entryFee: 15000, // ₹150.00
            prizePool: 30000000, // ₹3,00,000.00
            minTeamsRequired: 4,
            maxParticipants: 32,
            status: 'REGISTRATION', // Mapped from UPCOMING
            startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
            registrationEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop'
        },
        // ─── BGMI ──────────────────────────────────────────────────────────────
        {
            name: 'BGMI Ultimate Showdown',
            game: 'BATTLEGROUNDS MOBILE INDIA',
            description: 'The ultimate battleground challenge is here. Register now to claim your share of the ₹5 Lakh prize pool. Open registrations close soon!',
            rules: '1. Mobile only, emulator prohibited. 2. Points system standard Esport guidelines. 3. 4 matches total.',
            type: 'TEAM',
            format: 'SINGLE_ELIMINATION',
            entryFee: 25000, // ₹250.00
            prizePool: 50000000, // ₹5,00,000.00
            minTeamsRequired: 8,
            maxParticipants: 32,
            status: 'REGISTRATION', // Mapped from UPCOMING
            startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            registrationEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            bannerUrl: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=800&auto=format&fit=crop'
        },
        {
            name: 'BGMI Masters Series',
            game: 'BATTLEGROUNDS MOBILE INDIA',
            description: 'Catch the intense action live as elite squads battle it out in Erangel, Miramar, and Sanhok for the Master trophy and ₹1.5 Lakh prize pool.',
            rules: '1. Team rosters must match registered players. 2. Standard battle royale scoring rules.',
            type: 'TEAM',
            format: 'SINGLE_ELIMINATION',
            entryFee: 5000, // ₹50.00
            prizePool: 15000000, // ₹1,50,000.00
            minTeamsRequired: 4,
            maxParticipants: 16,
            status: 'ONGOING', // Mapped from LIVE
            startTime: new Date(),
            registrationEnd: new Date(Date.now() - 12 * 60 * 60 * 1000),
            bannerUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?q=80&w=800&auto=format&fit=crop',
            streamUrl: 'https://youtube.com',
            streamIsLive: true,
            streamPlatform: 'YOUTUBE'
        },
        // ─── CS2 ───────────────────────────────────────────────────────────────
        {
            name: 'CS2 Champions League',
            game: 'COUNTER-STRIKE 2',
            description: 'The premium CS2 tournament for professional and amateur clans. Relive the epic Grand Finals where GodLike Esports claimed the championship trophy!',
            rules: '1. Standard active duty map pools. 2. MR12 round formats.',
            type: 'TEAM',
            format: 'SINGLE_ELIMINATION',
            entryFee: 50000, // ₹500.00
            prizePool: 100000000, // ₹10,00,000.00
            minTeamsRequired: 4,
            maxParticipants: 8,
            status: 'COMPLETED',
            startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            registrationEnd: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            bannerUrl: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=800&auto=format&fit=crop',
            winnerId: seededTeams.find(t => t.name === 'GodLike Esports').id
        },
        {
            name: 'CS2 Esports Open S2',
            game: 'COUNTER-STRIKE 2',
            description: 'CS2 Esports Open Season 2 is open for registrations. Bring your team to compete for ₹2 Lakh prize pool on low-latency 128-tick tournament servers.',
            rules: '1. Valve Anti-Cheat (VAC) clean accounts only. 2. Max team members = 5.',
            type: 'TEAM',
            format: 'SINGLE_ELIMINATION',
            entryFee: 10000, // ₹100.00
            prizePool: 20000000, // ₹2,00,000.00
            minTeamsRequired: 4,
            maxParticipants: 16,
            status: 'REGISTRATION', // Mapped from UPCOMING
            startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
            registrationEnd: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
            bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop'
        },
        // ─── LEAGUE OF LEGENDS ──────────────────────────────────────────────────
        {
            name: 'LoL Summoners Rift Invitational',
            game: 'LEAGUE OF LEGENDS',
            description: 'The ultimate MOBA showdown on the Summoner\'s Rift. Watch the top 8 regional teams execute perfect draft phase strategies for the ₹4 Lakh prize.',
            rules: '1. Standard tournament draft mode. 2. Pause time limits enforce strict rules.',
            type: 'TEAM',
            format: 'SINGLE_ELIMINATION',
            entryFee: 20000, // ₹200.00
            prizePool: 40000000, // ₹4,00,000.00
            minTeamsRequired: 4,
            maxParticipants: 8,
            status: 'ONGOING', // Mapped from LIVE
            startTime: new Date(),
            registrationEnd: new Date(Date.now() - 36 * 60 * 60 * 1000),
            bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop',
            streamUrl: 'https://twitch.tv',
            streamIsLive: true,
            streamPlatform: 'TWITCH'
        },
        {
            name: 'League of Legends Winter Split',
            game: 'LEAGUE OF LEGENDS',
            description: 'Relive the League of Legends Winter Split where Team Soul dominated the finals with a flawless 3-0 sweep to lift the Winter trophy!',
            rules: '1. Double-elimination format for split play. 2. Standard LCS rules apply.',
            type: 'TEAM',
            format: 'SINGLE_ELIMINATION',
            entryFee: 30000, // ₹300.00
            prizePool: 60000000, // ₹6,00,000.00
            minTeamsRequired: 4,
            maxParticipants: 8,
            status: 'COMPLETED',
            startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
            registrationEnd: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
            winnerId: seededTeams.find(t => t.name === 'Team Soul').id
        }
    ];

    for (const t of tournamentsData) {
        await db.insert(tournaments).values({
            id: crypto.randomUUID(),
            name: t.name,
            game: t.game,
            description: t.description,
            rules: t.rules,
            type: t.type,
            format: t.format,
            hostId: hostId,
            entryFee: t.entryFee,
            prizePool: t.prizePool,
            minTeamsRequired: t.minTeamsRequired,
            maxParticipants: t.maxParticipants,
            status: t.status,
            startTime: t.startTime,
            registrationEnd: t.registrationEnd,
            winnerId: t.winnerId || null,
            bannerUrl: t.bannerUrl,
            streamUrl: t.streamUrl || null,
            streamIsLive: t.streamIsLive || false,
            streamPlatform: t.streamPlatform || 'OTHER',
            collected: t.entryFee * t.minTeamsRequired,
            hostProfit: Math.floor(t.entryFee * t.minTeamsRequired * 0.1)
        });
    }
    console.log('✅ Seeded Live, Upcoming, and Completed tournaments.');

    // 8. Create Social Feed Posts / Highlights
    const postsData = [
        {
            userId: seededPlayers.find(p => p.ign === 'Mortal').id,
            content: 'Incredible matches today! GG to Team XSpark, that final 1v3 clutch on Bind was absolutely insane. We are prepped and ready for the grand finals tomorrow! #TitanValorantCup',
            type: 'GENERAL',
            mediaUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
            likesCount: 1450
        },
        {
            userId: seededPlayers.find(p => p.ign === 'JONATHAN').id,
            content: 'Champions! GodLike Esports takes home the CS2 Champions League trophy! 🏆 Outstanding performance by the boys. Huge thanks to Titan Arena for hosting such a low-latency, flawless tournament.',
            type: 'ACHIEVEMENT',
            mediaUrl: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=800&auto=format&fit=crop',
            likesCount: 3200
        },
        {
            userId: hostId,
            content: '🔥 The BGMI Ultimate Showdown registrations are filling up fast! 24 spots are already locked in. Head to the Tournaments page, register your squad, and get ready to drop. ₹5 Lakh prize pool awaits!',
            type: 'TOURNAMENT_UPDATE',
            mediaUrl: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=800&auto=format&fit=crop',
            likesCount: 450
        }
    ];

    for (const p of postsData) {
        await db.insert(posts).values({
            id: crypto.randomUUID(),
            userId: p.userId,
            content: p.content,
            type: p.type,
            mediaUrl: p.mediaUrl,
            likesCount: p.likesCount,
            isDeleted: false,
            createdAt: new Date()
        });
    }
    console.log('✅ Seeded social feed posts & community updates.');

    console.log('\n🌟 Seeding complete! All dummy data populated successfully.');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
