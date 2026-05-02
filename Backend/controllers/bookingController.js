import { query } from '../config/db.js';
import emailService from '../utils/emailService.js';
import whatsappService from '../utils/whatsappService.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// --- Razorpay Instance ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// --- Helper Function ---
const calculateEndTime = (date, time, duration) => {
  const startDateTimeString = `${date}T${time}`;
  const startDate = new Date(startDateTimeString);

  if (isNaN(startDate.getTime())) {
    return null;
  }

  const endDate = new Date(startDate.getTime() + duration * 60000);
  return endDate;
};


// --------------------- GET BOOKED SLOTS (For UI Blocking) ---------------------
export const getBookedSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const queryStr = `
      SELECT booking_time, s.duration 
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE booking_date = ? 
      AND b.status NOT IN ('rejected', 'cancelled')
    `;

    const bookings = await query(queryStr, [date]);

    // Return simple array of blocked times
    const slots = bookings.map(b => ({
      time: b.booking_time, // e.g., "10:00:00"
      duration: b.duration
    }));

    res.json(slots);
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ message: 'Error fetching blocks' });
  }
};


// --------------------- CREATE RAZORPAY ORDER (Step 1) ---------------------
export const createPaymentOrder = async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, service_id, booking_date, booking_time, notes, user_id, coupon_code, add_on_ids } = req.body;

    // 1. Input Validation
    if (!customer_name || !customer_email || !service_id || !booking_date || !booking_time) {
      return res.status(400).json({ message: 'Missing required fields: name, email, service, date, or time.' });
    }

    // 2. Get service details
    const services = await query('SELECT * FROM services WHERE id = ?', [service_id]);
    if (services.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    const service = services[0];
    const serviceDuration = service.duration;

    // 3. Calculate add-on prices
    let addOnTotal = 0;
    let addOnNames = [];
    if (add_on_ids && add_on_ids.length > 0) {
      const placeholders = add_on_ids.map(() => '?').join(',');
      const addOns = await query(`SELECT id, name, price FROM services WHERE id IN (${placeholders})`, add_on_ids);
      addOnTotal = addOns.reduce((sum, a) => sum + parseFloat(a.price), 0);
      addOnNames = addOns.map(a => a.name);
    }

    // 4. Calculate total
    let totalAmount = parseFloat(service.price) + addOnTotal;

    // 5. Apply coupon if provided
    let discountAmount = 0;
    let discountPercent = 0;
    let validatedCouponCode = null;

    if (coupon_code) {
      const normalizedCode = coupon_code.trim().toUpperCase();
      const coupons = await query('SELECT * FROM coupons WHERE code = ? AND is_active = TRUE', [normalizedCode]);

      if (coupons.length > 0) {
        const coupon = coupons[0];
        const registeredUserId = user_id || req.user?.id;

        // Validate new-user-only
        if (coupon.is_new_user_only && registeredUserId) {
          const bookingCount = await query(
            "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status NOT IN ('cancelled', 'rejected')",
            [registeredUserId]
          );

          const usageCheck = await query(
            'SELECT COUNT(*) as count FROM coupon_usage WHERE user_id = ? AND coupon_id = ?',
            [registeredUserId, coupon.id]
          );

          if (bookingCount[0].count === 0 && usageCheck[0].count === 0) {
            discountPercent = parseFloat(coupon.discount_percent);
            discountAmount = Math.round((totalAmount * discountPercent) / 100 * 100) / 100;
            validatedCouponCode = normalizedCode;
          }
        } else if (!coupon.is_new_user_only) {
          discountPercent = parseFloat(coupon.discount_percent);
          discountAmount = Math.round((totalAmount * discountPercent) / 100 * 100) / 100;
          validatedCouponCode = normalizedCode;
        }
      }
    }

    const finalTotal = totalAmount - discountAmount;
    const advanceAmount = Math.ceil(finalTotal / 2);  // 50% rounded up
    const remainingAmount = finalTotal - advanceAmount;

    // 6. Conflict Check
    const proposedBookingStart = calculateEndTime(booking_date, booking_time, 0);
    const proposedBookingEnd = calculateEndTime(booking_date, booking_time, serviceDuration);

    if (!proposedBookingStart || !proposedBookingEnd) {
      return res.status(400).json({ message: 'Invalid date or time format provided.' });
    }

    const conflictCheckQuery = `
        SELECT b.*, s.duration 
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.booking_date = ? 
        AND b.status NOT IN ('rejected', 'cancelled')
    `;

    const existingBookings = await query(conflictCheckQuery, [booking_date]);

    const proposedStartMs = proposedBookingStart.getTime();
    const proposedEndMs = proposedBookingEnd.getTime();

    const isConflict = existingBookings.some(existing => {
      const existingStart = calculateEndTime(existing.booking_date, existing.booking_time, 0);
      const existingEnd = calculateEndTime(existing.booking_date, existing.booking_time, existing.duration);
      if (!existingStart || !existingEnd) return false;
      return proposedStartMs < existingEnd.getTime() && proposedEndMs > existingStart.getTime();
    });

    if (isConflict) {
      return res.status(409).json({ message: 'This time slot overlaps with an existing appointment.' });
    }

    // 7. Create Razorpay Order (for 50% advance)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(advanceAmount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: `booking_${Date.now()}`,
      notes: {
        customer_name,
        customer_email,
        service: service.name,
        booking_date,
        booking_time
      }
    });

    // 8. Return order details to frontend
    res.json({
      order_id: razorpayOrder.id,
      amount: advanceAmount,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID,
      booking_details: {
        service_name: service.name,
        service_price: parseFloat(service.price),
        add_on_total: addOnTotal,
        add_on_names: addOnNames,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        discount_percent: discountPercent,
        coupon_code: validatedCouponCode,
        final_total: finalTotal,
        advance_amount: advanceAmount,
        remaining_amount: remainingAmount
      }
    });

  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({ message: 'Error creating payment order' });
  }
};


// --------------------- VERIFY PAYMENT & CREATE BOOKING (Step 2) ---------------------
export const verifyPaymentAndBook = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer_name,
      customer_email,
      customer_phone,
      service_id,
      booking_date,
      booking_time,
      notes,
      user_id,
      coupon_code,
      total_amount,
      discount_amount,
      advance_amount,
      remaining_amount,
      add_on_names
    } = req.body;

    // 1. Verify Razorpay Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
    }

    // 2. Get service details
    const services = await query('SELECT * FROM services WHERE id = ?', [service_id]);
    if (services.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    const service = services[0];

    // 3. Create booking with payment info
    const bookingNotes = notes === undefined ? null : notes;
    const bookingPhone = customer_phone === undefined ? null : customer_phone;
    const registeredUserId = user_id === undefined ? null : user_id;

    // Build notes with add-ons
    let finalNotes = bookingNotes;
    if (add_on_names && add_on_names.length > 0) {
      const addOnStr = add_on_names.join(', ');
      finalNotes = `Extras: ${addOnStr}. \nUser Notes: ${bookingNotes || ''}`;
    }

    const result = await query(
      `INSERT INTO bookings (customer_name, customer_email, customer_phone, service_id, 
       booking_date, booking_time, notes, total_amount, discount_amount, coupon_code,
       advance_amount, remaining_amount, payment_status,
       razorpay_order_id, razorpay_payment_id, status, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_name, customer_email, bookingPhone, service_id,
        booking_date, booking_time, finalNotes, total_amount, discount_amount, coupon_code || null,
        advance_amount, remaining_amount, 'advance_paid',
        razorpay_order_id, razorpay_payment_id, 'pending', registeredUserId
      ]
    );

    const booking = {
      id: result.insertId,
      customer_name,
      customer_email,
      customer_phone: bookingPhone,
      service_id,
      booking_date,
      booking_time,
      notes: finalNotes,
      total_amount,
      discount_amount,
      coupon_code: coupon_code || null,
      advance_amount,
      remaining_amount,
      payment_status: 'advance_paid',
      razorpay_order_id,
      razorpay_payment_id,
      status: 'pending',
      user_id: registeredUserId
    };

    // 4. Record coupon usage
    if (coupon_code && registeredUserId) {
      const coupons = await query('SELECT id FROM coupons WHERE code = ?', [coupon_code.trim().toUpperCase()]);
      if (coupons.length > 0) {
        await query(
          'INSERT INTO coupon_usage (user_id, coupon_id, booking_id) VALUES (?, ?, ?)',
          [registeredUserId, coupons[0].id, result.insertId]
        );
        await query('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?', [coupons[0].id]);
      }
    }

    // 5. Response Sent Immediately
    res.status(201).json({
      message: 'Payment verified & booking created successfully',
      booking: { ...booking, service_name: service.name }
    });

    // 6. Send Notifications (Async Background Process)
    (async () => {
      try {
        await emailService.sendBookingNotification(booking, service.name);

        if (bookingPhone) {
          const bookingForNotify = { ...booking, service_name: service.name };
          await whatsappService.sendBookingStatusMessage(bookingForNotify, 'pending');
        }
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
      }
    })();

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Error verifying payment' });
  }
};


// --------------------- LEGACY CREATE BOOKING (Kept for backward compatibility) ---------------------
export const createBooking = async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, service_id, booking_date, booking_time, notes, user_id } = req.body;

    // 1. Input Validation
    if (!customer_name || !customer_email || !service_id || !booking_date || !booking_time) {
      return res.status(400).json({ message: 'Missing required fields: name, email, service, date, or time.' });
    }

    // 2. Get service details
    const services = await query('SELECT * FROM services WHERE id = ?', [service_id]);

    if (services.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    const service = services[0];
    const serviceDuration = service.duration;

    // 3. Calculate Proposed Booking Times
    const proposedBookingStart = calculateEndTime(booking_date, booking_time, 0);
    const proposedBookingEnd = calculateEndTime(booking_date, booking_time, serviceDuration);

    if (!proposedBookingStart || !proposedBookingEnd) {
      return res.status(400).json({ message: 'Invalid date or time format provided.' });
    }

    // --- 4. ROBUST CONFLICT CHECK ---
    const conflictCheckQuery = `
        SELECT 
            b.*, 
            s.duration 
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.booking_date = ? 
        AND b.status != 'rejected'
    `;

    const existingBookings = await query(conflictCheckQuery, [booking_date]);

    const proposedStartMs = proposedBookingStart.getTime();
    const proposedEndMs = proposedBookingEnd.getTime();

    const isConflict = existingBookings.some(existing => {
      const existingStart = calculateEndTime(existing.booking_date, existing.booking_time, 0);
      const existingEnd = calculateEndTime(existing.booking_date, existing.booking_time, existing.duration);

      if (!existingStart || !existingEnd) return false;

      const existingStartMs = existingStart.getTime();
      const existingEndMs = existingEnd.getTime();

      return proposedStartMs < existingEndMs && proposedEndMs > existingStartMs;
    });


    if (isConflict) {
      return res.status(409).json({ message: 'This time slot overlaps with an existing appointment.' });
    }

    // 5. Create booking
    const bookingNotes = notes === undefined ? null : notes;
    const bookingPhone = customer_phone === undefined ? null : customer_phone;
    const registeredUserId = user_id === undefined ? null : user_id;

    const result = await query(
      `INSERT INTO bookings (customer_name, customer_email, customer_phone, service_id, 
       booking_date, booking_time, notes, total_amount, status, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_name, customer_email, bookingPhone, service_id, booking_date, booking_time, bookingNotes, service.price, 'pending', registeredUserId]
    );

    const booking = {
      id: result.insertId,
      customer_name,
      customer_email,
      customer_phone: bookingPhone,
      service_id,
      booking_date,
      booking_time,
      notes: bookingNotes,
      total_amount: service.price,
      status: 'pending',
      user_id: registeredUserId
    };

    // ✅ Response Sent Immediately (Fix for stuck loader)
    res.status(201).json({
      message: 'Booking created successfully',
      booking: { ...booking, service_name: service.name }
    });

    // 📩 Send Notifications (Async Background Process)
    (async () => {
      try {
        // 1. Email
        await emailService.sendBookingNotification(booking, service.name);

        // 2. WhatsApp
        if (bookingPhone) {
          // Prepare object with service name for the template
          const bookingForNotify = { ...booking, service_name: service.name };
          await whatsappService.sendBookingStatusMessage(bookingForNotify, 'pending');
        }
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
      }
    })();

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Error creating booking' });
  }
};


// --------------------- GET ALL BOOKINGS (Admin) ---------------------
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await query(`
      SELECT b.*, s.name as service_name, s.duration, s.image_url
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `);

    res.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};


// --------------------- GET USER BOOKINGS (New Feature) ---------------------
export const getUserBookings = async (req, res) => {
  try {
    // req.user is populated by the authenticateToken middleware
    const userId = req.user.id;

    const bookings = await query(`
      SELECT 
        b.id, 
        b.customer_name,
        b.customer_email,
        b.customer_phone,
        b.booking_date as date, 
        b.booking_time as time, 
        b.status,
        b.notes,
        b.total_amount,
        b.discount_amount,
        b.coupon_code,
        b.advance_amount,
        b.remaining_amount,
        b.payment_status,
        b.razorpay_order_id,
        b.razorpay_payment_id,
        b.created_at,
        s.name as service_name, 
        s.price,
        s.duration
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `, [userId]);

    res.json(bookings);
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ message: 'Error fetching your bookings' });
  }
};


// --------------------- UPDATE BOOKING STATUS ---------------------
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    const allowedStatuses = ['pending', 'confirmed', 'rejected', 'completed', 'cancelled'];

    if (!status) {
      return res.status(400).json({ message: 'Missing required field: status.' });
    }
    const finalStatus = status.toLowerCase();

    if (!allowedStatuses.includes(finalStatus)) {
      return res.status(400).json({ message: `Invalid status provided. Must be one of: ${allowedStatuses.join(', ')}.` });
    }

    const bookings = await query(`
      SELECT b.*, s.name as service_name
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.id = ?
    `, [id]);

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = bookings[0];

    let finalReason = null;
    if (finalStatus === 'rejected') {
      finalReason = rejection_reason === undefined ? null : rejection_reason;
    }

    // If marking as completed, auto-update payment to fully_paid
    let paymentUpdate = '';
    let queryParams = [finalStatus, finalReason];

    if (finalStatus === 'completed') {
      paymentUpdate = ', payment_status = ?, remaining_amount = 0';
      queryParams.push('fully_paid');
    }

    queryParams.push(id);
    await query(`UPDATE bookings SET status = ?, rejection_reason = ?${paymentUpdate} WHERE id = ?`, queryParams);

    // ✅ Response Sent Immediately (Fix for stuck loader in Admin)
    res.json({
      message: `Booking ${finalStatus} successfully`,
      booking: { ...booking, status: finalStatus, payment_status: finalStatus === 'completed' ? 'fully_paid' : booking.payment_status }
    });

    // 📩 Send Notifications (Async Background Process)
    (async () => {
      try {
        const phoneToSend = booking.customer_phone?.startsWith('+') ? booking.customer_phone : '+91' + booking.customer_phone;

        // Update the booking object in memory so the PDF/Notification has the NEW status
        const updatedBooking = { ...booking, status: finalStatus };
        // Also update the reason if rejected, for the notification template
        if (finalStatus === ('rejected')) updatedBooking.rejection_reason = finalReason;

        if (finalStatus === 'confirmed') {
          // 1. Email (Now generates PDF internally with 'confirmed' status)
          await emailService.sendBookingConfirmation(updatedBooking, updatedBooking.service_name);

          // 2. WhatsApp (Rich Template)
          await whatsappService.sendBookingStatusMessage(updatedBooking, 'confirmed');

        } else if (finalStatus === 'rejected') {
          // 1. Email - Now we attach PDF even for rejection per user request
          await emailService.sendBookingRejection(updatedBooking, updatedBooking.service_name, finalReason);

          // 2. WhatsApp
          await whatsappService.sendBookingStatusMessage(updatedBooking, 'rejected');
        }
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
      }
    })();

  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Error updating booking' });
  }
};


// --------------------- UPDATE PAYMENT STATUS (Admin - Mark Remaining Paid) ---------------------
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    const allowedStatuses = ['advance_paid', 'fully_paid'];

    if (!payment_status || !allowedStatuses.includes(payment_status)) {
      return res.status(400).json({ message: 'Invalid payment status. Must be: advance_paid or fully_paid' });
    }

    const bookings = await query('SELECT * FROM bookings WHERE id = ?', [id]);
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookings[0];

    if (payment_status === 'fully_paid') {
      await query(
        'UPDATE bookings SET payment_status = ?, remaining_amount = 0 WHERE id = ?',
        ['fully_paid', id]
      );
    } else {
      await query('UPDATE bookings SET payment_status = ? WHERE id = ?', [payment_status, id]);
    }

    res.json({
      message: `Payment status updated to ${payment_status}`,
      booking: { ...booking, payment_status, remaining_amount: payment_status === 'fully_paid' ? 0 : booking.remaining_amount }
    });

  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ message: 'Error updating payment status' });
  }
};


// NEW: Reschedule an existing booking
export const rescheduleBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { booking_date, booking_time } = req.body;
    const userId = req.user.id; // Get logged in user ID

    // 1. Validate inputs
    if (!booking_date || !booking_time) {
      return res.status(400).json({ message: 'New date and time are required.' });
    }

    // 2. Check if booking exists and belongs to user (Security Check)
    const bookingCheck = await query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [id, userId]);

    if (bookingCheck.length === 0) {
      return res.status(404).json({ message: 'Booking not found or unauthorized.' });
    }

    // 3. Update the booking
    // We also set status to 'pending' so admin sees the change needs approval
    await query(
      'UPDATE bookings SET booking_date = ?, booking_time = ?, status = ? WHERE id = ?',
      [booking_date, booking_time, 'pending', id]
    );

    // 4. Return success
    res.json({
      message: 'Appointment rescheduled successfully',
      booking: { id, booking_date, booking_time, status: 'pending' }
    });

  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({ message: 'Server error while rescheduling' });
  }
};

// --------------------- DASHBOARD STATS ---------------------
export const getDashboardStats = async (req, res) => {
  try {
    const totalBookings = await query('SELECT COUNT(*) as count FROM bookings');
    const pendingBookings = await query('SELECT COUNT(*) as count FROM bookings WHERE status = ?', ['pending']);
    const confirmedBookings = await query('SELECT COUNT(*) as count FROM bookings WHERE status = ?', ['confirmed']);
    const totalEarnings = await query('SELECT SUM(total_amount - discount_amount) as total FROM bookings WHERE status IN (?, ?)', ['confirmed', 'completed']);
    const advanceCollected = await query('SELECT SUM(advance_amount) as total FROM bookings WHERE payment_status IN (?, ?)', ['advance_paid', 'fully_paid']);
    const pendingPayments = await query('SELECT SUM(remaining_amount) as total FROM bookings WHERE payment_status = ?', ['advance_paid']);

    const recentBookings = await query(`
      SELECT b.*, s.name as service_name
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    res.json({
      totalBookings: totalBookings[0].count,
      pendingBookings: pendingBookings[0].count,
      confirmedBookings: confirmedBookings[0].count,
      totalEarnings: totalEarnings[0].total || 0,
      advanceCollected: advanceCollected[0].total || 0,
      pendingPayments: pendingPayments[0].total || 0,
      recentBookings
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};

// --------------------- DELETE BOOKING (Admin Only) ---------------------
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    // Execute Delete Query
    const result = await query('DELETE FROM bookings WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: 'Booking deleted permanently' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ message: 'Error deleting booking' });
  }
};

// --------------------- RESET ALL DATA (Production Ready) ---------------------
export const resetAllBookings = async (req, res) => {
  try {
    // ⚠️ DANGER: This wipes the entire table
    await query('TRUNCATE TABLE bookings');
    res.json({ message: 'All bookings wiped. Revenue reset to 0.' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ message: 'Error resetting data' });
  }
};