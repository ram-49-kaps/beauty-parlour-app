import pool from './Backend/config/db.js';

(async () => {
    try {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM services");
        console.log("✅ Services Count:", rows[0].count);

        if (rows[0].count > 0) {
            const [services] = await pool.query("SELECT * FROM services LIMIT 3");
            console.log("🔍 Sample Services:", services);
        } else {
            console.log("⚠️ Database table 'services' is EMPTY!");
        }
    } catch (err) {
        console.error("❌ DB Error:", err);
    } finally {
        process.exit();
    }
})();
