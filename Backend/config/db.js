import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true // TiDB Cloud supports public CAs
  }
});

export async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function withTransaction(callback) {
  const connection = await pool.getConnection();

  const txQuery = async (sql, params = []) => {
    const [rows] = await connection.execute(sql, params);
    return rows;
  };

  try {
    await connection.beginTransaction();
    const result = await callback(txQuery, connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
