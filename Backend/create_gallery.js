
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'booking_db'
};

const createGalleryTable = async () => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB...");

        const sql = `
      CREATE TABLE IF NOT EXISTS gallery (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image_url VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        category VARCHAR(50),
        type ENUM('image', 'video') DEFAULT 'image',
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

        await connection.query(sql);
        console.log("✅ Gallery Table Created Successfully!");
        await connection.end();
    } catch (err) {
        console.error("❌ Error:", err);
    }
};

createGalleryTable();
