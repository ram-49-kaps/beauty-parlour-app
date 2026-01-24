import { query } from '../config/db.js';

// Get all active services
export const getAllServices = async (req, res) => {
  try {
    const services = await query(
      'SELECT * FROM services WHERE is_active = true ORDER BY name'
    );
    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Error fetching services' });
  }
};



// Create a new salon service
export const createService = async (req, res) => {
  try {
    const { name, description, duration, price, image_url } = req.body;

    // 1. INPUT VALIDATION
    if (!name || !duration || !price) {
      return res.status(400).json({ message: 'Missing required fields: name, duration, or price.' });
    }

    // 2. Handle optional fields (undefined -> null)
    const serviceDescription = description === undefined ? null : description;
    const serviceImageUrl = image_url === undefined ? null : image_url;

    // Type conversion
    const serviceDuration = parseInt(duration);
    const servicePrice = parseFloat(price);

    const result = await query(
      'INSERT INTO services (name, description, duration, price, image_url) VALUES (?, ?, ?, ?, ?)',
      [name, serviceDescription, serviceDuration, servicePrice, serviceImageUrl]
    );

    res.status(201).json({
      message: 'Service created successfully',
      serviceId: result.insertId
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Error creating service' });
  }
};

// Update an existing service
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration, price, image_url } = req.body;

    // 1. INPUT VALIDATION
    if (!id) {
      return res.status(400).json({ message: 'Service ID is required' });
    }

    // 2. Handle optional fields (undefined -> null) to prevent binding errors
    const serviceDescription = description === undefined ? null : description;
    const serviceImageUrl = image_url === undefined ? null : image_url;

    // Type conversion
    const serviceDuration = duration ? parseInt(duration) : 0;
    const servicePrice = price ? parseFloat(price) : 0.00;

    const result = await query(
      'UPDATE services SET name=?, description=?, duration=?, price=?, image_url=? WHERE id=?',
      [name, serviceDescription, serviceDuration, servicePrice, serviceImageUrl, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service updated successfully' });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Error updating service' });
  }
};
// --------------------- SERVICE IMAGE UPLOAD ---------------------
export const uploadServiceImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return the relative path or full URL. 
    // Usually relative path is better if our frontend uses getImageUrl helper.
    const imagePath = req.file.filename;

    res.json({
      message: 'Image uploaded successfully',
      image_url: imagePath
    });
  } catch (error) {
    console.error('Service image upload error:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
};

// Delete service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Service ID is required' });
    }

    // 1. First delete any bookings linked to this service
    await query('DELETE FROM bookings WHERE service_id = ?', [id]);

    // 2. Then delete the service itself
    const result = await query('DELETE FROM services WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Error deleting service' });
  }
};

// --------------------- GALLERY MANAGEMENT ---------------------

// Get all active gallery items
export const getGallery = async (req, res) => {
  try {
    const items = await query('SELECT * FROM gallery WHERE is_active = true ORDER BY display_order, created_at DESC');
    res.json(items);
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ message: 'Error fetching gallery' });
  }
};

// Add new gallery item
export const addGalleryItem = async (req, res) => {
  try {
    const { title, category, image_url, type } = req.body;

    if (!image_url || !category) {
      return res.status(400).json({ message: 'Image and Category are required' });
    }

    await query(
      'INSERT INTO gallery (title, category, image_url, type) VALUES (?, ?, ?, ?)',
      [title, category, image_url, type || 'image']
    );

    res.status(201).json({ message: 'Added to gallery successfully' });
  } catch (error) {
    console.error('Add gallery error:', error);
    res.status(500).json({ message: 'Error adding to gallery' });
  }
};

// Delete gallery item
export const deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM gallery WHERE id = ?', [id]);
    res.json({ message: 'Item removed from gallery' });
  } catch (error) {
    console.error('Delete gallery error:', error);
    res.status(500).json({ message: 'Error removing item' });
  }
};
