import { query } from '../config/db.js';

// --------------------- VALIDATE COUPON ---------------------
export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ valid: false, message: 'Coupon code is required.' });
    }

    const normalizedCode = code.trim().toUpperCase();

    // 1. Check if coupon exists and is active
    const coupons = await query('SELECT * FROM coupons WHERE code = ? AND is_active = TRUE', [normalizedCode]);

    if (coupons.length === 0) {
      return res.status(200).json({ valid: false, message: 'Invalid coupon code.' });
    }

    const coupon = coupons[0];

    // 2. Check max uses (if applicable)
    if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) {
      return res.status(200).json({ valid: false, message: 'This coupon has reached its usage limit.' });
    }

    // 3. Check if new-user-only coupon
    if (coupon.is_new_user_only) {
      // Check if user has any previous completed/confirmed bookings
      const bookingCount = await query(
        "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status NOT IN ('cancelled', 'rejected')",
        [userId]
      );

      if (bookingCount[0].count > 0) {
        return res.status(200).json({
          valid: false,
          message: 'This coupon is exclusively for first-time customers. You already have booking history with us.'
        });
      }

      // Check if user has already used this coupon
      const usageCheck = await query(
        'SELECT COUNT(*) as count FROM coupon_usage WHERE user_id = ? AND coupon_id = ?',
        [userId, coupon.id]
      );

      if (usageCheck[0].count > 0) {
        return res.status(200).json({
          valid: false,
          message: 'You have already used this coupon.'
        });
      }
    }

    // 4. Coupon is valid!
    res.json({
      valid: true,
      code: coupon.code,
      discount_percent: parseFloat(coupon.discount_percent),
      message: `${coupon.discount_percent}% discount will be applied to your booking!`
    });

  } catch (error) {
    console.error('Coupon validation error:', error);
    res.status(500).json({ valid: false, message: 'Error validating coupon.' });
  }
};

// --------------------- CHECK ELIGIBILITY ---------------------
export const checkCouponEligibility = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has any previous bookings
    const bookingCount = await query(
      "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status NOT IN ('cancelled', 'rejected')",
      [userId]
    );

    if (bookingCount[0].count > 0) {
      return res.json({ eligible: false, message: 'You already have booking history.' });
    }

    // Check if there's an active new-user coupon
    const coupons = await query(
      'SELECT code, discount_percent FROM coupons WHERE is_new_user_only = TRUE AND is_active = TRUE LIMIT 1'
    );

    if (coupons.length === 0) {
      return res.json({ eligible: false, message: 'No coupons available.' });
    }

    // Check if already used
    const couponFull = await query('SELECT id FROM coupons WHERE code = ?', [coupons[0].code]);
    const usageCheck = await query(
      'SELECT COUNT(*) as count FROM coupon_usage WHERE user_id = ? AND coupon_id = ?',
      [userId, couponFull[0].id]
    );

    if (usageCheck[0].count > 0) {
      return res.json({ eligible: false, message: 'You have already used the welcome coupon.' });
    }

    res.json({
      eligible: true,
      coupon: {
        code: coupons[0].code,
        discount_percent: parseFloat(coupons[0].discount_percent)
      },
      message: `You're eligible for ${coupons[0].discount_percent}% off on your first booking!`
    });

  } catch (error) {
    console.error('Eligibility check error:', error);
    res.status(500).json({ eligible: false, message: 'Error checking eligibility.' });
  }
};
