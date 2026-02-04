import { query } from '../config/db.js';

export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create the full URL for the image
    // Note: Replace localhost with your production domain when deploying
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const userId = req.user.id;

    // Update Database
    await query('UPDATE users SET profile_image = ? WHERE id = ?', [imageUrl, userId]);

    res.json({
      message: 'Profile image updated',
      profile_image: imageUrl
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during upload' });
  }
};

// --------------------- GET SUBSCRIBERS ---------------------
export const getSubscribers = async (req, res) => {
  try {
    const subscribers = await query('SELECT id, email, phone, created_at FROM users ORDER BY created_at DESC');
    res.json(subscribers);
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const deleteProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;

    // Update database: Set profile_image to NULL
    await query('UPDATE users SET profile_image = NULL WHERE id = ?', [userId]);

    res.json({ message: 'Profile image removed successfully' });

  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ message: 'Server error removing image' });
  }
};