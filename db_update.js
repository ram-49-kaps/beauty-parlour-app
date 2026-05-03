import { query } from './Backend/config/db.js';

const runMigration = async () => {
  try {
    console.log('Starting DB migration...');

    // 1. Add category column if not exists
    try {
      await query(`ALTER TABLE services ADD COLUMN category VARCHAR(50) DEFAULT 'Standard Makeup'`);
      console.log('✅ Added category column to services table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ Category column already exists');
      } else {
        throw e;
      }
    }

    // 2. Set categories for existing services
    await query(`UPDATE services SET category = 'Standard Makeup' WHERE name NOT LIKE '%lash%' AND name NOT LIKE '%Lens%' AND category IS NULL`);
    await query(`UPDATE services SET category = 'Add-On' WHERE name LIKE '%lash%' OR name LIKE '%Lens%'`);
    console.log('✅ Updated categories for existing services');

    // 3. Insert new Add-Ons (Saree Draping, Hair Extensions)
    // Check if they exist first
    const existingSaree = await query(`SELECT * FROM services WHERE name = 'Saree Draping'`);
    if (existingSaree.length === 0) {
      await query(`INSERT INTO services (name, description, duration, price, image_url, category) VALUES 
        ('Saree Draping', 'Professional saree draping service.', 20, 200.00, 'https://i.ibb.co/image1.jpg', 'Add-On')`);
    }
    const existingExtensions = await query(`SELECT * FROM services WHERE name = 'Hair Extensions'`);
    if (existingExtensions.length === 0) {
      await query(`INSERT INTO services (name, description, duration, price, image_url, category) VALUES 
        ('Hair Extensions', 'Premium hair extensions (needs to be returned next day).', 15, 500.00, 'https://i.ibb.co/image2.jpg', 'Add-On')`);
    }

    // 4. Insert 2026-27 Event Packages
    const packages = [
      { name: 'Haldi Package', price: 3500 },
      { name: 'Mehndi Package', price: 4500 },
      { name: 'Sangeet Package', price: 7500 },
      { name: 'Satak Package', price: 5000 },
      { name: 'Reception Package', price: 8000 },
      { name: 'Wedding (with Jewellery)', price: 20000 },
      { name: 'Wedding (without Jewellery)', price: 15000 }
    ];

    for (const pkg of packages) {
      const existing = await query(`SELECT * FROM services WHERE name = ?`, [pkg.name]);
      if (existing.length === 0) {
        await query(`INSERT INTO services (name, description, duration, price, image_url, category) VALUES 
          (?, 'Includes HD Makeup, Hairstyling, Eyelashes, and Real Flowers. (Hair accessories needs to be returned next day). High-end products used.', 120, ?, 'https://i.ibb.co/image3.jpg', 'Event Package')`, 
          [pkg.name, pkg.price]);
      }
    }
    console.log('✅ Inserted 2026-27 Event Packages and Add-Ons');

    console.log('🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
