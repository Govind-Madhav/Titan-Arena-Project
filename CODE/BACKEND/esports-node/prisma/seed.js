const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const games = [
        {
            name: 'Battlegrounds Mobile India',
            slug: 'bgmi',
            shortName: 'BGMI',
            logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/52/Battlegrounds_Mobile_India_Logo.png/220px-Battlegrounds_Mobile_India_Logo.png',
            bannerUrl: 'https://wallpaperaccess.com/full/6231649.jpg',
            description: 'Battlegrounds Mobile India is a player versus player shooter game in which up to one hundred players fight in a battle royale, a type of large-scale last man standing deathmatch.',
            isActive: true,
        },
        {
            name: 'Garena Free Fire',
            slug: 'free-fire',
            shortName: 'Free Fire',
            logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Garena_Free_Fire_Logo.png/220px-Garena_Free_Fire_Logo.png',
            bannerUrl: 'https://wallpaperaccess.com/full/2264664.jpg',
            description: 'Free Fire is the ultimate survival shooter game available on mobile. Each 10-minute game places you on a remote island where you are pit against 49 other players, all seeking survival.',
            isActive: true,
        },
        {
            name: 'Call of Duty: Mobile',
            slug: 'codm',
            shortName: 'CODM',
            logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1f/Call_of_Duty_Mobile_Logo.png/220px-Call_of_Duty_Mobile_Logo.png',
            bannerUrl: 'https://wallpaperaccess.com/full/1885444.jpg',
            description: 'Call of Duty: Mobile is a free-to-play shooter video game developed by TiMi Studio Group and published by Activision for Android and iOS.',
            isActive: true,
        },
        {
            name: 'Valorant',
            slug: 'valorant',
            shortName: 'Valorant',
            logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Valorant_logo_-_pink_color_version.svg/220px-Valorant_logo_-_pink_color_version.svg.png',
            bannerUrl: 'https://wallpaperaccess.com/full/2822830.jpg',
            description: 'Valorant is a free-to-play first-person hero shooter developed and published by Riot Games, for Windows.',
            isActive: true,
        },
        {
            name: 'Clash Royale',
            slug: 'clash-royale',
            shortName: 'Clash Royale',
            logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c1/Clash_Royale_logo.png/220px-Clash_Royale_logo.png',
            bannerUrl: 'https://wallpaperaccess.com/full/2822830.jpg',
            description: 'Clash Royale is a free-to-play real-time strategy video game developed and published by Supercell.',
            isActive: true,
        },
        {
            name: 'Pokemon Unite',
            slug: 'pokemon-unite',
            shortName: 'Pokemon Unite',
            logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/Pok%C3%A9mon_Unite_logo.png/220px-Pok%C3%A9mon_Unite_logo.png',
            bannerUrl: 'https://wallpaperaccess.com/full/6231649.jpg',
            description: 'Pokémon Unite is a free-to-play, multiplayer online battle arena video game developed by TiMi Studio Group and published by The Pokémon Company.',
            isActive: true,
        }
    ];

    console.log('Start seeding games...');

    for (const game of games) {
        const existingGame = await prisma.game.findUnique({
            where: { slug: game.slug }
        });

        if (!existingGame) {
            await prisma.game.create({
                data: game
            });
            console.log(`Created game: ${game.name}`);
        } else {
            await prisma.game.update({
                where: { slug: game.slug },
                data: game
            });
            console.log(`Updated game: ${game.name}`);
        }
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
