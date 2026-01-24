import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
    let connection;
    try {
        console.log("🔌 Connecting to DB...");
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            ssl: { rejectUnauthorized: false }
        });
        console.log("✅ Connected!");

        // CHECK DATA
        const [rows] = await connection.query("SELECT id, name, is_active FROM services");
        console.log("📊 Services Found:", rows.length);
        if (rows.length > 0) {
            console.table(rows);
        } else {
            console.log("⚠️ Table 'services' is empty.");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
})();
