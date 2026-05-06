import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const createConnection = () => mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 4000,
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

const indexExists = async (connection, tableName, indexName) => {
  const [rows] = await connection.execute(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
     LIMIT 1`,
    [process.env.DB_NAME, tableName, indexName]
  );
  return rows.length > 0;
};

const hasDuplicateValues = async (connection, tableName, columnName) => {
  const [rows] = await connection.execute(
    `SELECT ${columnName}, COUNT(*) as count
     FROM ${tableName}
     WHERE ${columnName} IS NOT NULL AND ${columnName} <> ''
     GROUP BY ${columnName}
     HAVING COUNT(*) > 1
     LIMIT 5`
  );
  return rows;
};

const createIndexIfMissing = async (connection, { table, name, sql, duplicateColumn }) => {
  if (await indexExists(connection, table, name)) {
    console.log(`Index "${name}" already exists.`);
    return;
  }

  if (duplicateColumn) {
    const duplicates = await hasDuplicateValues(connection, table, duplicateColumn);
    if (duplicates.length > 0) {
      console.warn(`Skipped unique index "${name}" because duplicate ${duplicateColumn} values already exist.`);
      console.warn(duplicates);
      return;
    }
  }

  await connection.execute(sql);
  console.log(`Created index "${name}".`);
};

const createCompositeUniqueIndexIfMissing = async (connection, { table, name, sql, duplicateCheckSql }) => {
  if (await indexExists(connection, table, name)) {
    console.log(`Index "${name}" already exists.`);
    return;
  }

  const [duplicates] = await connection.execute(duplicateCheckSql);
  if (duplicates.length > 0) {
    console.warn(`Skipped unique index "${name}" because duplicate rows already exist.`);
    console.warn(duplicates);
    return;
  }

  await connection.execute(sql);
  console.log(`Created index "${name}".`);
};

const run = async () => {
  console.log('Connecting to database...');
  const connection = await createConnection();

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS booking_date_locks (
        booking_date DATE NOT NULL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('booking_date_locks table is ready.');

    const indexes = [
      {
        table: 'bookings',
        name: 'idx_bookings_date_status',
        sql: 'CREATE INDEX idx_bookings_date_status ON bookings (booking_date, status)'
      },
      {
        table: 'bookings',
        name: 'uniq_bookings_razorpay_payment_id',
        sql: 'CREATE UNIQUE INDEX uniq_bookings_razorpay_payment_id ON bookings (razorpay_payment_id)',
        duplicateColumn: 'razorpay_payment_id'
      },
      {
        table: 'bookings',
        name: 'uniq_bookings_razorpay_order_id',
        sql: 'CREATE UNIQUE INDEX uniq_bookings_razorpay_order_id ON bookings (razorpay_order_id)',
        duplicateColumn: 'razorpay_order_id'
      }
    ];

    for (const index of indexes) {
      await createIndexIfMissing(connection, index);
    }

    await createCompositeUniqueIndexIfMissing(connection, {
      table: 'coupon_usage',
      name: 'uniq_coupon_usage_user_coupon',
      sql: 'CREATE UNIQUE INDEX uniq_coupon_usage_user_coupon ON coupon_usage (user_id, coupon_id)',
      duplicateCheckSql: `
        SELECT user_id, coupon_id, COUNT(*) as count
        FROM coupon_usage
        GROUP BY user_id, coupon_id
        HAVING COUNT(*) > 1
        LIMIT 5
      `
    });

    console.log('Booking concurrency migration complete.');
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error('Booking concurrency migration failed:', error.message);
  process.exit(1);
});
