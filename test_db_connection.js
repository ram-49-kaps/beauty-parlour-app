import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env from Backend/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'Backend/.env') });

async function checkConnection() {
    console.log('Testing connection to:', process.env.DB_HOST);
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            ssl: { rejectUnauthorized: false }
        });

        console.log('✅ Connection Successful!');
        const [rows] = await connection.execute('SELECT 1 as val');
        console.log('Query Result:', rows);

        await connection.end();
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
    }
}

checkConnection();
