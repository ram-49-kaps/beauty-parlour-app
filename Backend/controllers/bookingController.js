import { query, withTransaction } from '../config/db.js';
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

const getActiveBookingsForDate = async (dbQuery, bookingDate, { forUpdate = false } = {}) => {
  const lockClause = forUpdate ? ' FOR UPDATE' : '';
  return dbQuery(`
    SELECT b.*, s.duration 
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    WHERE b.booking_date = ? 
    AND b.status NOT IN ('rejected', 'cancelled')
    ${lockClause}
  `, [bookingDate]);
};

const findOverlappingBooking = (existingBookings, bookingDate, bookingTime, duration) => {
  const proposedBookingStart = calculateEndTime(bookingDate, bookingTime, 0);
  const proposedBookingEnd = calculateEndTime(bookingDate, bookingTime, duration);

  if (!proposedBookingStart || !proposedBookingEnd) {
    return { invalidDateTime: true, conflict: null };
  }

  const proposedStartMs = proposedBookingStart.getTime();
  const proposedEndMs = proposedBookingEnd.getTime();

  const conflict = existingBookings.find(existing => {
    const existingStart = calculateEndTime(existing.booking_date, existing.booking_time, 0);
    const existingEnd = calculateEndTime(existing.booking_date, existing.booking_time, existing.duration);
    if (!existingStart || !existingEnd) return false;
    return proposedStartMs < existingEnd.getTime() && proposedEndMs > existingStart.getTime();
  });

  return { invalidDateTime: false, conflict };
};

const getBookingByRazorpayRefs = async (dbQuery, paymentId, orderId, { forUpdate = false } = {}) => {
  const lockClause = forUpdate ? ' FOR UPDATE' : '';
  const bookings = await dbQuery(`
    SELECT b.*, s.name as service_name
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    WHERE b.razorpay_payment_id = ? OR b.razorpay_order_id = ?
    ${lockClause}
  `, [paymentId, orderId]);

  return bookings[0] || null;
};

const lockBookingDate = async (dbQuery, bookingDate) => {
  await dbQuery('INSERT IGNORE INTO booking_date_locks (booking_date) VALUES (?)', [bookingDate]);
  await dbQuery('SELECT booking_date FROM booking_date_locks WHERE booking_date = ? FOR UPDATE', [bookingDate]);
};

const sendBookingCreatedNotifications = async (booking, serviceName) => {
  try {
    await emailService.sendBookingNotification(booking, serviceName);

    if (booking.customer_phone) {
      const bookingForNotify = { ...booking, service_name: serviceName };
      await whatsappService.sendBookingStatusMessage(bookingForNotify, 'pending');
    }
  } catch (notifyError) {
    console.error('Notification error:', notifyError);
  }
};

const normalizeAddOnIds = (addOnIds = []) => {
  if (!Array.isArray(addOnIds)) return [];
  return [...new Set(addOnIds.map(id => Number(id)).filter(Number.isInteger))];
};

const getAddOnDetails = async (dbQuery, addOnIds) => {
  const normalizedIds = normalizeAddOnIds(addOnIds);
  if (normalizedIds.length === 0) {
    return { addOnTotal: 0, addOnNames: [] };
  }

  const placeholders = normalizedIds.map(() => '?').join(',');
  const addOns = await dbQuery(`SELECT id, name, price FROM services WHERE id IN (${placeholders})`, normalizedIds);

  if (addOns.length !== normalizedIds.length) {
    const addOnError = new Error('One or more selected add-ons are invalid.');
    addOnError.statusCode = 400;
    throw addOnError;
  }

  return {
    addOnTotal: addOns.reduce((sum, addOn) => sum + parseFloat(addOn.price), 0),
    addOnNames: addOns.map(addOn => addOn.name)
  };
};

const calculateCouponDiscount = async (dbQuery, { couponCode, totalAmount, userId, lockCoupon = false }) => {
  if (!couponCode) {
    return { discountAmount: 0, discountPercent: 0, validatedCouponCode: null };
  }

  const normalizedCode = couponCode.trim().toUpperCase();
  const coupons = await dbQuery(
    `SELECT * FROM coupons WHERE code = ? AND is_active = TRUE${lockCoupon ? ' FOR UPDATE' : ''}`,
    [normalizedCode]
  );

  if (coupons.length === 0) {
    return { discountAmount: 0, discountPercent: 0, validatedCouponCode: null };
  }

  const coupon = coupons[0];

  if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) {
    return { discountAmount: 0, discountPercent: 0, validatedCouponCode: null };
  }

  if (coupon.is_new_user_only) {
    if (!userId) {
      return { discountAmount: 0, discountPercent: 0, validatedCouponCode: null };
    }

    const bookingCount = await dbQuery(
      "SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status NOT IN ('cancelled', 'rejected')",
      [userId]
    );

    const usageCheck = await dbQuery(
      'SELECT COUNT(*) as count FROM coupon_usage WHERE user_id = ? AND coupon_id = ?',
      [userId, coupon.id]
    );

    if (bookingCount[0].count > 0 || usageCheck[0].count > 0) {
      return { discountAmount: 0, discountPercent: 0, validatedCouponCode: null };
    }
  }

  const discountPercent = parseFloat(coupon.discount_percent);
  const discountAmount = Math.round((totalAmount * discountPercent) / 100 * 100) / 100;

  return {
    discountAmount,
    discountPercent,
    validatedCouponCode: normalizedCode
  };
};

const calculateBookingPricing = async (dbQuery, { service, addOnIds, couponCode, userId, lockCoupon = false }) => {
  const { addOnTotal, addOnNames } = await getAddOnDetails(dbQuery, addOnIds);
  const totalAmount = parseFloat(service.price) + addOnTotal;
  const { discountAmount, discountPercent, validatedCouponCode } = await calculateCouponDiscount(dbQuery, {
    couponCode,
    totalAmount,
    userId,
    lockCoupon
  });
  const finalTotal = totalAmount - discountAmount;
  const advanceAmount = Math.ceil(finalTotal / 2);
  const remainingAmount = finalTotal - advanceAmount;

  return {
    addOnTotal,
    addOnNames,
    totalAmount,
    discountAmount,
    discountPercent,
    validatedCouponCode,
    finalTotal,
    advanceAmount,
    remainingAmount
  };
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
    const { customer_name, customer_email, customer_phone, customer_city, service_id, booking_date, booking_time, notes, coupon_code, add_on_ids } = req.body;
    const authenticatedUserId = req.user?.id;

    // 1. Input Validation
    if (!customer_name || !customer_email || !service_id || !booking_date || !booking_time) {
      return res.status(400).json({ message: 'Missing required fields: name, email, service, date, or time.' });
    }

    // 1a. Validate Name (2-100 chars, no special characters)
    const trimmedName = customer_name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ message: 'Name must be between 2 and 100 characters.' });
    }

    // 1b. Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // 1c. Validate Phone (10 digits)
    if (!customer_phone || !/^[0-9]{10}$/.test(customer_phone)) {
      return res.status(400).json({ message: 'Please provide a valid 10-digit phone number.' });
    }

    // 1d. Validate City
    const validCities = ['Surat', 'Mumbai', 'Ahmedabad', 'Vadodara', 'Bharuch', 'Rajkot', 'Pune', 'Delhi', 'Bengaluru', 'Other'];
    if (!customer_city || !validCities.includes(customer_city)) {
      return res.status(400).json({ message: 'Please select a valid city.' });
    }

    // 1e. Validate Date (must be today or future)
    const bookingDateObj = new Date(booking_date);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (isNaN(bookingDateObj.getTime()) || bookingDateObj < todayStart) {
      return res.status(400).json({ message: 'Booking date must be today or a future date.' });
    }

    // 1f. Validate Time format (HH:MM)
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(booking_time)) {
      return res.status(400).json({ message: 'Please provide a valid booking time.' });
    }

    // 2. Get service details
    const services = await query('SELECT * FROM services WHERE id = ?', [service_id]);
    if (services.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    const service = services[0];
    const serviceDuration = service.duration;

    // 3. Calculate add-ons, total and coupon discount using the authenticated user only
    const pricing = await calculateBookingPricing(query, {
      service,
      addOnIds: add_on_ids,
      couponCode: coupon_code,
      userId: authenticatedUserId
    });

    // 6. Conflict Check
    const existingBookings = await getActiveBookingsForDate(query, booking_date);
    const { invalidDateTime, conflict } = findOverlappingBooking(existingBookings, booking_date, booking_time, serviceDuration);

    if (invalidDateTime) {
      return res.status(400).json({ message: 'Invalid date or time format provided.' });
    }

    if (conflict) {
      return res.status(409).json({ message: 'This time slot overlaps with an existing appointment.' });
    }

    // 7. Create Razorpay Order (for 50% advance)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(pricing.advanceAmount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: `booking_${Date.now()}`,
      notes: {
        customer_name,
        customer_email,
        user_id: authenticatedUserId,
        service: service.name,
        booking_date,
        booking_time,
        coupon_code: pricing.validatedCouponCode || ''
      }
    });

    // 8. Return order details to frontend
    res.json({
      order_id: razorpayOrder.id,
      amount: pricing.advanceAmount,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID,
      booking_details: {
        service_name: service.name,
        service_price: parseFloat(service.price),
        add_on_total: pricing.addOnTotal,
        add_on_names: pricing.addOnNames,
        total_amount: pricing.totalAmount,
        discount_amount: pricing.discountAmount,
        discount_percent: pricing.discountPercent,
        coupon_code: pricing.validatedCouponCode,
        final_total: pricing.finalTotal,
        advance_amount: pricing.advanceAmount,
        remaining_amount: pricing.remainingAmount
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
      customer_city,
      service_id,
      booking_date,
      booking_time,
      notes,
      coupon_code,
      add_on_ids
    } = req.body;
    const authenticatedUserId = req.user?.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing Razorpay payment verification fields.' });
    }

    if (!customer_name || !customer_email || !service_id || !booking_date || !booking_time) {
      return res.status(400).json({ message: 'Missing required booking fields.' });
    }

    if (!calculateEndTime(booking_date, booking_time, 0)) {
      return res.status(400).json({ message: 'Invalid date or time format provided.' });
    }

    // 1. Verify Razorpay Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
    }

    const existingProcessedBooking = await getBookingByRazorpayRefs(query, razorpay_payment_id, razorpay_order_id);
    if (existingProcessedBooking) {
      return res.status(200).json({
        message: 'Payment already verified & booking already created',
        booking: existingProcessedBooking
      });
    }

    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);

    const { booking, serviceName, alreadyProcessed } = await withTransaction(async (txQuery) => {
      await lockBookingDate(txQuery, booking_date);

      const existingPaymentBooking = await getBookingByRazorpayRefs(txQuery, razorpay_payment_id, razorpay_order_id, { forUpdate: true });
      if (existingPaymentBooking) {
        return {
          booking: existingPaymentBooking,
          serviceName: existingPaymentBooking.service_name,
          alreadyProcessed: true
        };
      }

      // 2. Get service details and recalculate pricing server-side
      const services = await txQuery('SELECT * FROM services WHERE id = ?', [service_id]);
      if (services.length === 0) {
        const serviceError = new Error('Service not found');
        serviceError.statusCode = 404;
        throw serviceError;
      }
      const service = services[0];
      const pricing = await calculateBookingPricing(txQuery, {
        service,
        addOnIds: add_on_ids,
        couponCode: coupon_code,
        userId: authenticatedUserId,
        lockCoupon: true
      });

      const expectedAdvanceAmount = Math.round(pricing.advanceAmount * 100);
      if (razorpayOrder.currency !== 'INR' || Number(razorpayOrder.amount) !== expectedAdvanceAmount) {
        const amountError = new Error('Payment amount does not match the verified booking total.');
        amountError.statusCode = 400;
        throw amountError;
      }

      // 3. Final conflict check under a per-date DB lock
      const existingBookings = await getActiveBookingsForDate(txQuery, booking_date, { forUpdate: true });
      const { invalidDateTime, conflict } = findOverlappingBooking(existingBookings, booking_date, booking_time, service.duration);

      if (invalidDateTime) {
        const dateError = new Error('Invalid date or time format provided.');
        dateError.statusCode = 400;
        throw dateError;
      }

      if (conflict) {
        const conflictError = new Error('This time slot was just booked by another customer. Please select a different slot.');
        conflictError.statusCode = 409;
        throw conflictError;
      }

      // 4. Create booking with payment info
      const bookingNotes = notes === undefined ? null : notes;
      const bookingPhone = customer_phone === undefined ? null : customer_phone;
      const registeredUserId = authenticatedUserId || null;

      let finalNotes = bookingNotes;
      if (pricing.addOnNames.length > 0) {
        const addOnStr = pricing.addOnNames.join(', ');
        finalNotes = `Extras: ${addOnStr}. \nUser Notes: ${bookingNotes || ''}`;
      }

      const result = await txQuery(
        `INSERT INTO bookings (customer_name, customer_email, customer_phone, customer_city, service_id, 
         booking_date, booking_time, notes, total_amount, discount_amount, coupon_code,
         advance_amount, remaining_amount, payment_status,
         razorpay_order_id, razorpay_payment_id, status, user_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer_name, customer_email, bookingPhone, customer_city, service_id,
          booking_date, booking_time, finalNotes, pricing.totalAmount, pricing.discountAmount, pricing.validatedCouponCode,
          pricing.advanceAmount, pricing.remainingAmount, 'advance_paid',
          razorpay_order_id, razorpay_payment_id, 'pending', registeredUserId
        ]
      );

      const createdBooking = {
        id: result.insertId,
        customer_name,
        customer_email,
        customer_phone: bookingPhone,
        customer_city,
        service_id,
        booking_date,
        booking_time,
        notes: finalNotes,
        total_amount: pricing.totalAmount,
        discount_amount: pricing.discountAmount,
        coupon_code: pricing.validatedCouponCode,
        advance_amount: pricing.advanceAmount,
        remaining_amount: pricing.remainingAmount,
        payment_status: 'advance_paid',
        razorpay_order_id,
        razorpay_payment_id,
        status: 'pending',
        user_id: registeredUserId
      };

      // 5. Record coupon usage
      if (pricing.validatedCouponCode && registeredUserId) {
        const coupons = await txQuery('SELECT id FROM coupons WHERE code = ?', [pricing.validatedCouponCode]);
        if (coupons.length > 0) {
          const couponUsageResult = await txQuery(
            'INSERT INTO coupon_usage (user_id, coupon_id, booking_id) VALUES (?, ?, ?)',
            [registeredUserId, coupons[0].id, result.insertId]
          );
          if (couponUsageResult.affectedRows > 0) {
            await txQuery('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?', [coupons[0].id]);
          }
        }
      }

      return {
        booking: createdBooking,
        serviceName: service.name,
        alreadyProcessed: false
      };
    });

    // 5. Response Sent Immediately
    res.status(alreadyProcessed ? 200 : 201).json({
      message: alreadyProcessed ? 'Payment already verified & booking already created' : 'Payment verified & booking created successfully',
      booking: { ...booking, service_name: serviceName }
    });

    // 6. Send Notifications (Async Background Process)
    if (!alreadyProcessed) {
      sendBookingCreatedNotifications(booking, serviceName);
    }

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Error verifying payment' });
  }
};


// --------------------- LEGACY CREATE BOOKING (Kept for backward compatibility) ---------------------
export const createBooking = async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, service_id, booking_date, booking_time, notes } = req.body;

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

    if (!calculateEndTime(booking_date, booking_time, 0)) {
      return res.status(400).json({ message: 'Invalid date or time format provided.' });
    }

    const booking = await withTransaction(async (txQuery) => {
      await lockBookingDate(txQuery, booking_date);

      const existingBookings = await getActiveBookingsForDate(txQuery, booking_date, { forUpdate: true });
      const { invalidDateTime, conflict } = findOverlappingBooking(existingBookings, booking_date, booking_time, serviceDuration);

      if (invalidDateTime) {
        const dateError = new Error('Invalid date or time format provided.');
        dateError.statusCode = 400;
        throw dateError;
      }

      if (conflict) {
        const conflictError = new Error('This time slot overlaps with an existing appointment.');
        conflictError.statusCode = 409;
        throw conflictError;
      }

      // 5. Create booking
      const bookingNotes = notes === undefined ? null : notes;
      const bookingPhone = customer_phone === undefined ? null : customer_phone;
      const registeredUserId = req.user?.id || null;

      const result = await txQuery(
        `INSERT INTO bookings (customer_name, customer_email, customer_phone, service_id, 
         booking_date, booking_time, notes, total_amount, status, user_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customer_name, customer_email, bookingPhone, service_id, booking_date, booking_time, bookingNotes, service.price, 'pending', registeredUserId]
      );

      return {
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
    });

    // ✅ Response Sent Immediately (Fix for stuck loader)
    res.status(201).json({
      message: 'Booking created successfully',
      booking: { ...booking, service_name: service.name }
    });

    // 📩 Send Notifications (Async Background Process)
    sendBookingCreatedNotifications(booking, service.name);

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Error creating booking' });
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
