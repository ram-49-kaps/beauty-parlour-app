import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/kapadia/Desktop/Beauty_Parlour/Backend/.env' });

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      ssl: { rejectUnauthorized: true }
    });
    
    console.log("Connected to DB");
    
    const [rows] = await connection.execute(`
      SELECT 
        b.service_id,
        s.name as service_name,
        s.id,
        COUNT(*) as booking_count,
        RANK() OVER (ORDER BY COUNT(*) DESC) as rank
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.customer_city = ? 
        AND b.status IN ('confirmed', 'completed')
      GROUP BY b.service_id, s.name, s.id
      ORDER BY booking_count DESC
      LIMIT 10
    `, ['Surat']);
    console.log(rows);
    await connection.end();
  } catch (e) {
    console.error("DB Error:", e);
  }
}
test();
