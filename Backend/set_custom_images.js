import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const mapping = {
    'Lens': '/Gallery/Lense.jpeg',
    'Eyelashes': '/Gallery/IMG_1242.PNG',
    'Natural Radiance Makeup': '/Gallery/IMG_0331.PNG',
    'Signature Glamour Look': '/Gallery/SS1.png',
    'HD Flawless Finish': '/Gallery/IMG_3913.PNG'
};

(async () => {
    let connection;
    try {
        console.log("🔌 Connecting to DB to Set Custom Images...");
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            ssl: { rejectUnauthorized: false }
        });

        for (const [serviceName, imagePath] of Object.entries(mapping)) {
            console.log(`🖼 Setting '${serviceName}' -> '${imagePath}'`);

            // Using LIKE to match partial names if needed, or exact match
            // The service names I saw were exact, so = is safer, but name might have whitespace.
            // I'll use trim().
            const [result] = await connection.query(
                "UPDATE services SET image_url = ? WHERE name = ?",
                [imagePath, serviceName]
            );
            console.log(`   Updated ${result.affectedRows} rows.`);
        }

        console.log("✅ Custom Images Set!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
})();
