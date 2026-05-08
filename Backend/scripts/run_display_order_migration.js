import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const run = async () => {
  console.log('🔌 Connecting to TiDB Cloud...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });
  console.log('✅ Connected!\n');

  // Step 1: Check if display_order column exists
  const [cols] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'services' AND COLUMN_NAME = 'display_order'`,
    [process.env.DB_NAME]
  );

  if (cols.length > 0) {
    console.log('ℹ️  Column "display_order" already exists.');
  } else {
    console.log('📂 Adding display_order column to services...');
    await connection.execute('ALTER TABLE services ADD COLUMN display_order INT DEFAULT 0 AFTER category');
    console.log('✅ Column added!');
  }

  // Step 2: Set initial display_order based on current ID order
  const [services] = await connection.execute('SELECT id FROM services ORDER BY id');
  console.log(`\n📋 Setting display_order for ${services.length} services...`);
  
  for (let i = 0; i < services.length; i++) {
    await connection.execute('UPDATE services SET display_order = ? WHERE id = ?', [i, services[i].id]);
    console.log(`  ✅ Service ID ${services[i].id} → display_order: ${i}`);
  }

  console.log('\n🎉 Display order migration complete!');
  await connection.end();
};

run().catch(err => { console.error('❌ Failed:', err.message); process.exit(1); });
