import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
    let connection;
    try {
        console.log("🔌 Connecting to DB to Remove Duplicates...");
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            ssl: { rejectUnauthorized: false }
        });

        // 1. Find duplicate names
        const [rows] = await connection.query(`
            SELECT name, COUNT(*) as count 
            FROM services 
            GROUP BY name 
            HAVING count > 1
        `);

        console.log(`🔍 Found ${rows.length} service names with duplicates.`);

        for (const row of rows) {
            console.log(`🗑 Cleaning up duplicates for: ${row.name}`);

            // Keep the one with the lowest ID (or any one)
            const [ids] = await connection.query(
                "SELECT id FROM services WHERE name = ? ORDER BY id ASC",
                [row.name]
            );

            if (ids.length > 1) {
                const keepId = ids[0].id;
                const deleteIds = ids.slice(1).map(item => item.id);

                await connection.query(
                    "DELETE FROM services WHERE id IN (?)",
                    [deleteIds]
                );
                console.log(`   Keeping ID ${keepId}, deleted IDs: ${deleteIds.join(', ')}`);
            }
        }

        console.log("✅ Duplicates Removed!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
})();
