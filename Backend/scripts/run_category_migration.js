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

  // Step 1: Check if category column exists
  const [cols] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'services' AND COLUMN_NAME = 'category'`,
    [process.env.DB_NAME]
  );

  if (cols.length > 0) {
    console.log('ℹ️  Column "category" already exists.');
  } else {
    console.log('📂 Adding category column to services...');
    await connection.execute('ALTER TABLE services ADD COLUMN category VARCHAR(50) DEFAULT NULL AFTER image_url');
    console.log('✅ Column added!');
  }

  // Step 2: Show all services for categorization
  const [services] = await connection.execute('SELECT id, name, category FROM services ORDER BY id');
  console.log(`\n📋 Found ${services.length} services:\n`);
  services.forEach(s => console.log(`  [${s.id}] ${s.name} → category: ${s.category || '(none)'}`));

  // Step 3: Auto-categorize based on name keywords
  console.log('\n🏷️  Auto-categorizing services...');
  
  const categoryRules = [
    { keywords: ['bridal', 'bride', 'wedding', 'haldi', 'mehendi', 'reception', 'engagement', 'sangeet'], category: 'Bridal' },
    { keywords: ['hair', 'keratin', 'smoothening', 'straightening', 'blow', 'cut', 'color', 'highlight'], category: 'Hair' },
    { keywords: ['facial', 'skin', 'cleanup', 'clean-up', 'peel', 'glow', 'hydra', 'derma'], category: 'Skincare' },
    { keywords: ['makeup', 'make-up', 'make up', 'party look', 'glam'], category: 'Makeup' },
    { keywords: ['combo', 'package', 'bundle', 'complete'], category: 'Combo' },
    { keywords: ['lash', 'lens', 'nail', 'wax', 'thread', 'mani', 'pedi', 'bleach', 'detan'], category: 'Other' },
  ];

  let updated = 0;
  for (const service of services) {
    if (service.category) continue; // skip if already categorized
    
    const nameLower = service.name.toLowerCase();
    let matched = false;
    
    for (const rule of categoryRules) {
      if (rule.keywords.some(kw => nameLower.includes(kw))) {
        await connection.execute('UPDATE services SET category = ? WHERE id = ?', [rule.category, service.id]);
        console.log(`  ✅ [${service.id}] "${service.name}" → ${rule.category}`);
        updated++;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      await connection.execute('UPDATE services SET category = ? WHERE id = ?', ['Other', service.id]);
      console.log(`  ⚪ [${service.id}] "${service.name}" → Other (default)`);
      updated++;
    }
  }

  console.log(`\n✅ Categorized ${updated} services.`);

  // Step 4: Verify
  const [final] = await connection.execute('SELECT id, name, category FROM services ORDER BY category, id');
  console.log('\n📊 Final categories:');
  const groups = {};
  final.forEach(s => {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s.name);
  });
  Object.entries(groups).forEach(([cat, names]) => {
    console.log(`  ${cat}: ${names.length} services — ${names.join(', ')}`);
  });

  console.log('\n🎉 Category migration complete!');
  await connection.end();
};

run().catch(err => { console.error('❌ Failed:', err.message); process.exit(1); });
