import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from Backend folder
dotenv.config({ path: path.join(__dirname, 'Backend', '.env') });

const services = [
    {
        category: 'Eyebrows',
        name: 'Eyebrow Threading',
        description: 'Precise shaping using thread.',
        price: 50,
        duration: 15,
        image_url: 'threading.jpg'
    },
    {
        category: 'Eyebrows',
        name: 'Forehead Threading',
        description: 'Removal of fine hair from forehead.',
        price: 30,
        duration: 10,
        image_url: 'threading.jpg'
    },
    {
        category: 'Waxing',
        name: 'Full Hand Wax (RICA)',
        description: 'Smooth RICA waxing for full arms.',
        price: 350,
        duration: 30,
        image_url: 'waxing.jpg'
    },
    {
        category: 'Waxing',
        name: 'Full Leg Wax (RICA)',
        description: 'Smooth RICA waxing for full legs.',
        price: 550,
        duration: 45,
        image_url: 'waxing.jpg'
    },
    {
        category: 'Facial',
        name: 'Fruit Cleanup',
        description: 'Natural fruit-based cleanup for glowing skin.',
        price: 400,
        duration: 45,
        image_url: 'facial.jpg'
    },
    {
        category: 'Facial',
        name: 'O3+ Whitening Facial',
        description: 'Premium facial for skin brightening.',
        price: 1500,
        duration: 60,
        image_url: 'facial.jpg'
    },
    {
        category: 'Hair',
        name: 'Hair Spa (L’Oreal)',
        description: 'Nourishing hair spa treatment.',
        price: 800,
        duration: 60,
        image_url: 'hairspa.jpg'
    },
    {
        category: 'Bridal',
        name: 'Bridal Makeup',
        description: 'Complete bridal makeover.',
        price: 5000,
        duration: 180,
        image_url: 'bridal.jpg'
    }
];

(async () => {
    let connection;
    try {
        console.log("🔌 Connecting to DB...");
        // Bypassing SSL check for this script to ensure it runs
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            ssl: { rejectUnauthorized: false }
        });
        console.log("✅ Connected!");

        // 1. Create Table if not exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS services (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category VARCHAR(50),
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                duration INT,
                image_url VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table checked/created.");

        // 2. Check current count
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM services");
        if (rows[0].count > 0) {
            console.log(`⚠️ DB already has ${rows[0].count} services. Skipping seed to avoid duplicates.`);
        } else {
            console.log("🌱 Seeding data...");
            for (const s of services) {
                await connection.query(
                    "INSERT INTO services (category, name, description, price, duration, image_url) VALUES (?, ?, ?, ?, ?, ?)",
                    [s.category, s.name, s.description, s.price, s.duration, s.image_url]
                );
            }
            console.log("✅ Seeded successfully!");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
})();
