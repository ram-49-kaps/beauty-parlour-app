# Add-Ons Feature Guide

## 🎯 Overview

The Add-Ons feature allows you to offer optional services that customers can add to their main booking (e.g., Eyelashes, Lens, Hair Extensions, Saree Draping).

---

## 📊 Database Structure

### Tables Created:

#### 1. **add_ons** Table

```sql
- id (Primary Key)
- name (String) - Add-on name
- description (Text) - Details about the add-on
- price (Decimal) - Price of the add-on
- image_url (String) - Cloudinary image URL
- is_active (Boolean) - Whether add-on is available
- created_at (Timestamp)
```

#### 2. **booking_addons** Table (Linking Table)

```sql
- id (Primary Key)
- booking_id (Foreign Key → bookings)
- addon_id (Foreign Key → add_ons)
- addon_name (String) - Copy of add-on name at time of booking
- addon_price (Decimal) - Copy of price at time of booking
- created_at (Timestamp)
```

This linking table lets you track which add-ons were added to which bookings.

---

## 🛠️ Admin API Endpoints

### Manage Add-Ons

**Get All Add-Ons**

```
GET /api/add-ons
Response: [{ id, name, description, price, image_url, is_active }]
```

**Create Add-On**

```
POST /api/add-ons
Auth: Admin Token Required
Body: { name, description, price, image_url? }
```

**Update Add-On**

```
PUT /api/add-ons/:id
Auth: Admin Token Required
Body: { name, description, price, image_url? }
```

**Delete Add-On**

```
DELETE /api/add-ons/:id
Auth: Admin Token Required
```

**Upload Add-On Image**

```
POST /api/add-ons/upload
Auth: Admin Token Required
Body: FormData with 'image' file
Response: { image_url: "cloudinary_url" }
```

---

## 📋 Booking Add-Ons Management

### Get Add-Ons for Booking

```
GET /api/bookings/:bookingId/add-ons
Auth: User Token Required
Response: Array of add-ons linked to this booking
```

### Add Add-Ons to Booking

```
POST /api/bookings/:bookingId/add-ons
Auth: User Token Required
Body: { addonIds: [1, 2, 3] }
Response: { message, addonsAdded, totalAddonPrice }

✨ AUTOMATIC:
- Booking total_amount is updated (+addon prices)
- Add-on names/prices are saved at booking time
```

### Remove Add-On from Booking

```
DELETE /api/bookings/:bookingId/add-ons/:addonId
Auth: User Token Required
Response: { message }

✨ AUTOMATIC:
- Booking total_amount is updated (-addon price)
```

---

## 🎨 Frontend Integration

### Services Available in `api.js`:

```javascript
// Admin Operations
getAllAddons(); // Get all add-ons
createAddon(addonData); // Create new add-on
updateAddon(id, addonData); // Update add-on
deleteAddon(id); // Delete add-on
uploadAddonImage(formData); // Upload image to Cloudinary

// Customer Booking
getBookingAddons(bookingId); // Get add-ons for booking
addAddonsToBooking(bookingId, addonIds); // Add add-ons to booking
removeAddonFromBooking(bookingId, addonId); // Remove add-on from booking
```

---

## 🚀 How to Use

### Step 1: Add Add-Ons from Admin Panel

Your admin panel can use this to create add-ons:

```javascript
import { createAddon, uploadAddonImage } from "../services/api";

// Upload image first
const imageUrl = await uploadAddonImage(imageFormData);

// Create add-on
await createAddon({
  name: "Eyelashes",
  description: "High-quality strip lashes",
  price: 200,
  image_url: imageUrl,
});
```

### Step 2: Customer Adds Add-Ons to Booking

When booking, show available add-ons:

```javascript
import { getAllAddons, addAddonsToBooking } from "../services/api";

// Fetch available add-ons
const addons = await getAllAddons();

// Customer selects add-ons (e.g., IDs: [1, 3])
await addAddonsToBooking(bookingId, [1, 3]);

// Booking total is automatically updated!
```

### Step 3: View/Edit Add-Ons in Booking

```javascript
import { getBookingAddons, removeAddonFromBooking } from "../services/api";

// Get add-ons for this booking
const bookingAddons = await getBookingAddons(bookingId);

// Remove an add-on if needed
await removeAddonFromBooking(bookingId, addonId);
```

---

## 📝 Initial Add-Ons (Seed Data)

Run this SQL to add your default add-ons:

```sql
INSERT INTO add_ons (name, description, price, image_url) VALUES
('Eyelashes', 'High-quality strip lashes to add instant volume and drama', 200.00, NULL),
('Lens', 'Hygienic application of cosmetic contact lenses to enhance eye color', 300.00, NULL),
('Hair Extensions', 'Premium hair extensions (must be returned next day)', 500.00, NULL),
('Saree Draping', 'Professional saree draping service', 200.00, NULL);
```

Or let your admin panel do it!

---

## ✨ Key Features

✅ **Automatic Price Calculation** - Total amount updates when add-ons are added/removed  
✅ **Image Support** - Upload images via Cloudinary for each add-on  
✅ **Booking History** - Captures add-on name/price at booking time  
✅ **Easy Management** - Admin can create/edit/delete add-ons  
✅ **Customer Choice** - Customers can select from available add-ons

---

## 🔧 Migration Steps

1. **Run SQL Migration**:

   ```
   mysql -u user -p database < Backend/scripts/add_addons_feature.sql
   ```

2. **Update Render Environment** (if using Cloudinary):
   - Already done in `.env`

3. **Deploy Backend**:

   ```
   git add .
   git commit -m "Add add-ons feature"
   git push origin main
   ```

4. **Redeploy on Render**:
   - New tables + endpoints automatically available

---

## 💡 Example Usage Flow

```
1. Admin logs in → Add-Ons Admin Panel
2. Admin creates: "Eyelashes - ₹200" with image
3. Customer books service → Sees "Add-Ons Available"
4. Customer selects "Eyelashes" → Price updates (Service + Add-on)
5. Booking saved with both service + add-on details
6. Invoice shows: Service ₹3500 + Eyelashes ₹200 = ₹3700
```

---

## 🎯 Your Services + Add-Ons List

### Services (Main):

- Haldi Package: ₹3,500
- Mehndi Package: ₹4,500
- Satak Package: ₹5,000
- Sangeet Package: ₹7,500
- Reception Package: ₹8,000
- Wedding (without Jewellery): ₹15,000
- Wedding (with Jewellery): ₹20,000
- Natural Radiance Makeup: ₹3,500
- HD Flawless Finish: ₹4,500
- Signature Glamour Look: ₹5,500

### Add-Ons (Optional):

- Saree Draping: ₹200
- Lens: ₹300
- Hair Extensions: ₹500
- Eyelashes: ₹200

---

All set! 🎉 Your add-ons feature is ready to use!
