import { query } from '../config/db.js';

// Get all add-ons
export const getAllAddons = async (req, res) => {
  try {
    const addons = await query(
      'SELECT * FROM add_ons WHERE is_active = true ORDER BY display_order ASC, created_at ASC'
    );
    res.json(addons);
  } catch (error) {
    console.error('Get add-ons error:', error);
    res.status(500).json({ message: 'Error fetching add-ons' });
  }
};

// Create add-on
export const createAddon = async (req, res) => {
  try {
    const { name, description, price, image_url } = req.body;

    // Validation
    if (!name || !price) {
      return res.status(400).json({ message: 'Missing required fields: name, price' });
    }

    const addonDescription = description === undefined ? null : description;
    const addonImageUrl = image_url === undefined ? null : image_url;
    const addonPrice = parseFloat(price);

    // Get the next display_order
    const maxOrder = await query('SELECT MAX(display_order) as max_order FROM add_ons');
    const nextOrder = (maxOrder[0].max_order || 0) + 1;

    const result = await query(
      'INSERT INTO add_ons (name, description, price, image_url, display_order) VALUES (?, ?, ?, ?, ?)',
      [name, addonDescription, addonPrice, addonImageUrl, nextOrder]
    );

    res.status(201).json({
      message: 'Add-on created successfully',
      addonId: result.insertId
    });
  } catch (error) {
    console.error('Create add-on error:', error);
    res.status(500).json({ message: 'Error creating add-on' });
  }
};

// Update add-on
export const updateAddon = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, image_url } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Add-on ID is required' });
    }

    const addonDescription = description === undefined ? null : description;
    const addonImageUrl = image_url === undefined ? null : image_url;
    const addonPrice = price ? parseFloat(price) : 0.00;

    const result = await query(
      'UPDATE add_ons SET name=?, description=?, price=?, image_url=? WHERE id=?',
      [name, addonDescription, addonPrice, addonImageUrl, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Add-on not found' });
    }

    res.json({ message: 'Add-on updated successfully' });
  } catch (error) {
    console.error('Update add-on error:', error);
    res.status(500).json({ message: 'Error updating add-on' });
  }
};

// Delete add-on
export const deleteAddon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Add-on ID is required' });
    }

    const result = await query('DELETE FROM add_ons WHERE id=?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Add-on not found' });
    }

    res.json({ message: 'Add-on deleted successfully' });
  } catch (error) {
    console.error('Delete add-on error:', error);
    res.status(500).json({ message: 'Error deleting add-on' });
  }
};

// Upload add-on image
export const uploadAddonImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageUrl = req.file.path || req.file.secure_url;

    res.json({
      message: 'Image uploaded successfully',
      image_url: imageUrl
    });
  

// Reorder add-ons
export const reorderAddons = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ message: 'Ordered IDs array is required' });
    }

    // Update display_order for each addon
    for (let i = 0; i < orderedIds.length; i++) {
      await query(
        'UPDATE add_ons SET display_order = ? WHERE id = ?',
        [i + 1, orderedIds[i]]
      );
    }

    res.json({ message: 'Add-ons reordered successfully' });
  } catch (error) {
    console.error('Reorder add-ons error:', error);
    res.status(500).json({ message: 'Error reordering add-ons' });
  }
};} catch (error) {
    console.error('Add-on image upload error:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
};

// Get add-ons for a specific booking
export const getBookingAddons = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const addons = await query(
      'SELECT * FROM booking_addons WHERE booking_id = ?',
      [bookingId]
    );

    res.json(addons);
  } catch (error) {
    console.error('Get booking add-ons error:', error);
    res.status(500).json({ message: 'Error fetching booking add-ons' });
  }
};

// Add add-ons to booking
export const addAddonsToBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { addonIds } = req.body;

    if (!bookingId || !Array.isArray(addonIds) || addonIds.length === 0) {
      return res.status(400).json({ message: 'Booking ID and add-on IDs are required' });
    }

    // Get add-on details
    const placeholders = addonIds.map(() => '?').join(',');
    const addonsData = await query(
      `SELECT id, name, price FROM add_ons WHERE id IN (${placeholders})`,
      addonIds
    );

    // Insert into booking_addons
    for (const addon of addonsData) {
      await query(
        'INSERT INTO booking_addons (booking_id, addon_id, addon_name, addon_price) VALUES (?, ?, ?, ?)',
        [bookingId, addon.id, addon.name, addon.price]
      );
    }

    // Calculate total add-on price and update booking total_amount
    const totalAddonPrice = addonsData.reduce((sum, addon) => sum + parseFloat(addon.price), 0);
    
    const booking = await query('SELECT total_amount FROM bookings WHERE id = ?', [bookingId]);
    if (booking.length > 0) {
      const newTotal = parseFloat(booking[0].total_amount) + totalAddonPrice;
      await query('UPDATE bookings SET total_amount = ? WHERE id = ?', [newTotal, bookingId]);
    }

    res.status(201).json({
      message: 'Add-ons added to booking successfully',
      addonsAdded: addonsData.length,
      totalAddonPrice
    });
  } catch (error) {
    console.error('Add add-ons to booking error:', error);
    res.status(500).json({ message: 'Error adding add-ons to booking' });
  }
};

// Remove add-on from booking
export const removeAddonFromBooking = async (req, res) => {
  try {
    const { bookingId, addonId } = req.params;

    // Get add-on price before deletion
    const bookingAddon = await query(
      'SELECT addon_price FROM booking_addons WHERE booking_id = ? AND addon_id = ?',
      [bookingId, addonId]
    );

    if (bookingAddon.length === 0) {
      return res.status(404).json({ message: 'Add-on not found in this booking' });
    }

    const addonPrice = bookingAddon[0].addon_price;

    // Delete from booking_addons
    await query(
      'DELETE FROM booking_addons WHERE booking_id = ? AND addon_id = ?',
      [bookingId, addonId]
    );

    // Update booking total_amount
    const booking = await query('SELECT total_amount FROM bookings WHERE id = ?', [bookingId]);
    if (booking.length > 0) {
      const newTotal = parseFloat(booking[0].total_amount) - addonPrice;
      await query('UPDATE bookings SET total_amount = ? WHERE id = ?', [newTotal, bookingId]);
    }

    res.json({ message: 'Add-on removed from booking successfully' });
  } catch (error) {
    console.error('Remove add-on from booking error:', error);
    res.status(500).json({ message: 'Error removing add-on from booking' });
  }
};
