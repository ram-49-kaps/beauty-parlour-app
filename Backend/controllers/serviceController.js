import { query } from '../config/db.js';

// ===== CACHING SYSTEM FOR RECOMMENDATIONS =====
const recommendationCache = {}; // In-memory cache: { city: { data, timestamp } }
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds
const MINIMUM_BOOKINGS = 10; // Minimum bookings to show city-specific recommendations

// Get all active services
export const getAllServices = async (req, res) => {
  try {
    const services = await query(
      'SELECT * FROM services WHERE is_active = true ORDER BY display_order ASC, created_at DESC'
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
    const { name, description, duration, price, image_url, category } = req.body;

    // 1. INPUT VALIDATION
    if (!name || !duration || !price) {
      return res.status(400).json({ message: 'Missing required fields: name, duration, or price.' });
    }

    // 2. Handle optional fields (undefined -> null)
    const serviceDescription = description === undefined ? null : description;
    const serviceImageUrl = image_url === undefined ? null : image_url;
    const serviceCategory = category === undefined ? null : category;

    // Type conversion
    const serviceDuration = parseInt(duration);
    const servicePrice = parseFloat(price);

    const result = await query(
      'INSERT INTO services (name, description, duration, price, image_url, category) VALUES (?, ?, ?, ?, ?, ?)',
      [name, serviceDescription, serviceDuration, servicePrice, serviceImageUrl, serviceCategory]
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
    const { name, description, duration, price, image_url, category } = req.body;

    // 1. INPUT VALIDATION
    if (!id) {
      return res.status(400).json({ message: 'Service ID is required' });
    }

    // 2. Handle optional fields (undefined -> null) to prevent binding errors
    const serviceDescription = description === undefined ? null : description;
    const serviceImageUrl = image_url === undefined ? null : image_url;
    const serviceCategory = category === undefined ? null : category;

    // Type conversion
    const serviceDuration = duration ? parseInt(duration) : 0;
    const servicePrice = price ? parseFloat(price) : 0.00;

    const result = await query(
      'UPDATE services SET name=?, description=?, duration=?, price=?, image_url=?, category=? WHERE id=?',
      [name, serviceDescription, serviceDuration, servicePrice, serviceImageUrl, serviceCategory, id]
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

    // multer-storage-cloudinary maps secure_url → req.file.path
    const imageUrl = req.file.path || req.file.secure_url;

    res.json({
      message: 'Image uploaded successfully',
      image_url: imageUrl
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

// --------------------- REORDER SERVICES ---------------------
export const reorderServices = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ message: 'orderedIds array is required' });
    }

    // Batch update display_order for each service
    for (let i = 0; i < orderedIds.length; i++) {
      await query('UPDATE services SET display_order = ? WHERE id = ?', [i, orderedIds[i]]);
    }

    res.json({ message: 'Services reordered successfully' });
  } catch (error) {
    console.error('Reorder services error:', error);
    res.status(500).json({ message: 'Error reordering services' });
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

// ===== RECOMMENDATION ENGINE WITH CACHING =====
export const getServiceRecommendations = async (req, res) => {
  try {
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ message: 'City parameter is required' });
    }

    // 1. CHECK CACHE
    const now = Date.now();
    if (recommendationCache[city] && (now - recommendationCache[city].timestamp) < CACHE_TTL) {
      return res.json(recommendationCache[city].data);
    }

    // 2. GET RECOMMENDATIONS FROM DATABASE
    const recommendationsQuery = `
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
    `;

    const cityRecommendations = await query(recommendationsQuery, [city]);

    let recommendations = [];
    if (cityRecommendations.length >= MINIMUM_BOOKINGS) {
      // City has enough bookings - use city-specific rankings
      recommendations = cityRecommendations.map((item, index) => ({
        service_id: item.service_id,
        service_name: item.service_name,
        booking_count: item.booking_count,
        rank: index + 1,
        is_top: index === 0,
        display_text: index === 0
          ? `#1 in ${city} · ${item.booking_count} brides chose this`
          : index <= 2
            ? `Popular in ${city}`
            : `#${index + 1} in ${city}`
      }));
    } else {
      // City has insufficient bookings - fall back to global top services
      const globalQuery = `
        SELECT 
          s.id,
          s.name,
          COUNT(*) as booking_count,
          RANK() OVER (ORDER BY COUNT(*) DESC) as rank
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.status IN ('confirmed', 'completed')
        GROUP BY s.id, s.name
        ORDER BY booking_count DESC
        LIMIT 3
      `;

      const globalRecs = await query(globalQuery);
      recommendations = globalRecs.map((item, index) => ({
        service_id: item.id,
        service_name: item.name,
        booking_count: item.booking_count,
        rank: index + 1,
        is_top: false,
        display_text: `Trending nationwide`
      }));
    }

    // 3. CACHE THE RESULTS (30 min TTL)
    recommendationCache[city] = {
      data: {
        city,
        recommendations,
        updated_at: new Date().toISOString(),
        note: recommendations.length >= MINIMUM_BOOKINGS ? 'City-specific' : 'Global fallback'
      },
      timestamp: now
    };

    res.json(recommendationCache[city].data);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ message: 'Error fetching recommendations' });
  }
};
