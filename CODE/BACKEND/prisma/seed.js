const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const games = [
        {
            name: 'Battlegrounds Mobile India',
            slug: 'bgmi',
            shortName: 'BGMI',
            logoUrl: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhbVpJw4vuTtbOPAJaZfw63W8DlM0ME18j_cSujCuk3hP34L4mNuEfcKrjmUXpV7OWnwSU2H5dru7a-9Ja4A-1U22MT1Ld_9KQyqv4VY-_VfA-Qrkxh8oEdPOzDN4OeP0D6oHoxfYB_HJ4zhXl9BgmGSLsgB8di3i6oA_9uapxxJxcRhtmY3-syfyhyphenhyphenRg/s320/battlegrounds-mobile-india-for-pc-featured.png',
            bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=400&fit=crop',
            description: 'Battlegrounds Mobile India is a player versus player shooter game in which up to one hundred players fight in a battle royale, a type of large-scale last man standing deathmatch.',
            isActive: true,
        },
        {
            name: 'Garena Free Fire',
            slug: 'free-fire',
            shortName: 'Free Fire',
            logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzxd5f6owtc5TnHEQFm04eg1ZMeozaHey9NbeGFW4Ilga6diS49GVi64LkfY0lK8awlObi&s=10',
            bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&h=400&fit=crop',
            description: 'Free Fire is the ultimate survival shooter game available on mobile. Each 10-minute game places you on a remote island where you are pit against 49 other players, all seeking survival.',
            isActive: true,
        },
        {
            name: 'Call of Duty: Mobile',
            slug: 'codm',
            shortName: 'CODM',
            logoUrl: 'https://static.wikia.nocookie.net/callofduty/images/f/f4/App_Icon_CODM_Global.jpg/revision/latest?cb=20200507033012',
            bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&h=400&fit=crop',
            description: 'Call of Duty: Mobile is a free-to-play shooter video game developed by TiMi Studio Group and published by Activision for Android and iOS.',
            isActive: true,
        },
        {
            name: 'Valorant',
            slug: 'valorant',
            shortName: 'Valorant',
            logoUrl: 'https://i.imgur.com/zJUI9c6.png',
            bannerUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=1200&h=400&fit=crop',
            description: 'Valorant is a free-to-play first-person hero shooter developed and published by Riot Games, for Windows.',
            isActive: true,
        },
        {
            name: 'Clash Royale',
            slug: 'clash-royale',
            shortName: 'Clash Royale',
            logoUrl: 'https://yt3.googleusercontent.com/Pj9SLzbMxgdbgFSA5MgfTZXjnoRtAj5qUGP8ubjf8AEJpy2nzWLR9Ik__iwQa44bPdvNw5jv5A=s900-c-k-c0x00ffffff-no-rj',
            bannerUrl: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=1200&h=400&fit=crop',
            description: 'Clash Royale is a free-to-play real-time strategy video game developed and published by Supercell.',
            isActive: true,
        },
        {
            name: 'Pokemon Unite',
            slug: 'pokemon-unite',
            shortName: 'Pokemon Unite',
            logoUrl: 'https://assets-prd.ignimgs.com/2021/07/17/pokmon-unite-button-fin-1626481609674.jpg',
            bannerUrl: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1200&h=400&fit=crop',
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
            console.log(`Created game: ${game.name} `);
        } else {
            await prisma.game.update({
                where: { slug: game.slug },
                data: game
            });
            console.log(`Updated game: ${game.name} `);
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
