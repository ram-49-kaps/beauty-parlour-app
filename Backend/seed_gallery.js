import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const items = [
    {
        category: 'Makeup Artistry',
        image_url: '/Gallery/IMG_1242.PNG',
        type: 'image'
    },
    {
        category: 'Exquisite Hair Styling',
        image_url: '/Gallery/Public1.MP4',
        type: 'video'
    },
    {
        category: 'Bridal Elegance',
        image_url: '/Gallery/IMG_0331.PNG',
        type: 'image'
    },
    {
        category: 'Salon Ambience',
        image_url: '/Gallery/Public3.MP4',
        type: 'video'
    },
    {
        category: 'Premium Lens Selection',
        image_url: '/Gallery/Lense.jpeg',
        type: 'image'
    },
    {
        category: 'Luxury Treatments',
        image_url: '/Gallery/Public5.MP4',
        type: 'video'
    }
];

(async () => {
    let connection;
    try {
        console.log("🔌 Connecting to DB to Fix and Seed Gallery...");
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            ssl: { rejectUnauthorized: false }
        });

        // 1. Ensure 'type' column exists
        console.log("🛠 Checking/Updating table schema...");
        try {
            await connection.query("ALTER TABLE gallery ADD COLUMN type ENUM('image', 'video') DEFAULT 'image' AFTER image_url");
            console.log("✅ Column 'type' added.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ Column 'type' already exists.");
            } else {
                throw err;
            }
        }

        // 2. Clear existing
        await connection.query("TRUNCATE TABLE gallery");

        // 3. Insert
        console.log("🌱 Inserting gallery items...");
        for (const item of items) {
            await connection.query(
                "INSERT INTO gallery (category, image_url, type) VALUES (?, ?, ?)",
                [item.category, item.image_url, item.type]
            );
        }

        console.log("✅ Gallery Seeded Successfully!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
})();
