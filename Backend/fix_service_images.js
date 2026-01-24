import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const updates = [
    {
        pattern: 'lash',
        image: 'https://images.unsplash.com/photo-1588665975246-814a7a8d8794?w=800&q=80'
    },
    {
        pattern: 'lens',
        image: 'https://images.unsplash.com/photo-1597223506659-02f58f997328?w=800&q=80'
    },
    {
        pattern: 'hair',
        image: 'https://images.unsplash.com/photo-1593702295094-aea8c5c93112?w=800&q=80'
    },
    {
        pattern: 'facial',
        image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80'
    },
    {
        pattern: 'cleanup',
        image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80'
    },
    {
        pattern: 'wax',
        image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80'
    },
    {
        pattern: 'bridal',
        image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&q=80'
    },
    {
        pattern: 'makeup',
        image: 'https://images.unsplash.com/photo-1487412947132-26c5c1b1511d?w=800&q=80'
    },
    {
        pattern: 'thread',
        image: 'https://images.unsplash.com/photo-1522337360705-2b1d8487394d?w=800&q=80'
    }
];

const fallbackImage = 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=80';

(async () => {
    let connection;
    try {
        console.log("🔌 Connecting to DB to Fix Images...");
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            ssl: { rejectUnauthorized: false }
        });

        // 1. Get All Services
        const [services] = await connection.query("SELECT id, name FROM services");
        console.log(`🔍 checking ${services.length} services...`);

        // 2. Update Loop
        for (const s of services) {
            let newImage = fallbackImage;
            const nameLower = s.name.toLowerCase();

            for (const u of updates) {
                if (nameLower.includes(u.pattern)) {
                    newImage = u.image;
                    break;
                }
            }

            console.log(`🖼 Updating ${s.name} -> ${newImage.substring(0, 30)}...`);
            await connection.query("UPDATE services SET image_url = ? WHERE id = ?", [newImage, s.id]);
        }

        console.log("✅ All Images Updated Successfully!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
})();
