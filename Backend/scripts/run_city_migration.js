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

  // Step 1: Check if column already exists
  const [columns] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'customer_city'`,
    [process.env.DB_NAME]
  );

  if (columns.length > 0) {
    console.log('ℹ️  Column "customer_city" already exists. Skipping ALTER TABLE.');
  } else {
    console.log('📍 Adding customer_city column...');
    await connection.execute('ALTER TABLE bookings ADD COLUMN customer_city VARCHAR(100) AFTER customer_phone');
    console.log('✅ Column added!');
  }

  // Step 2: Add indexes (safe — IF NOT EXISTS not supported, so we catch errors)
  const indexes = [
    { name: 'idx_bookings_city', sql: 'CREATE INDEX idx_bookings_city ON bookings (customer_city)' },
    { name: 'idx_bookings_service_city', sql: 'CREATE INDEX idx_bookings_service_city ON bookings (service_id, customer_city)' },
    { name: 'idx_bookings_status_city', sql: 'CREATE INDEX idx_bookings_status_city ON bookings (status, customer_city)' },
  ];

  for (const idx of indexes) {
    try {
      await connection.execute(idx.sql);
      console.log(`✅ Index "${idx.name}" created`);
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME' || err.message.includes('Duplicate')) {
        console.log(`ℹ️  Index "${idx.name}" already exists. Skipping.`);
      } else {
        console.error(`❌ Error creating index "${idx.name}":`, err.message);
      }
    }
  }

  // Step 3: Verify
  console.log('\n📋 Verifying...');
  const [result] = await connection.execute('SHOW COLUMNS FROM bookings WHERE Field = "customer_city"');
  if (result.length > 0) {
    console.log('✅ Verification passed! Column details:', result[0]);
  } else {
    console.log('❌ Verification failed — column not found!');
  }

  const [idxResult] = await connection.execute('SHOW INDEX FROM bookings WHERE Key_name LIKE "idx_bookings_%"');
  console.log(`✅ ${idxResult.length} recommendation indexes found.\n`);

  console.log('🎉 Migration complete! Your database is ready for city-based recommendations.');
  
  await connection.end();
};

run().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
