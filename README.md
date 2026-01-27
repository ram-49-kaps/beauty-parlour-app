#  Flawless By Drashti - Premium Beauty Studio Platform

![Flawless Logo](frontend/public/Gallery/logo.jpg)

**Flawless By Drashti** is a state-of-the-art beauty salon management platform that blends premium aesthetics with advanced AI technology. It provides a seamless booking experience for customers and a powerful management dashboard for the business owner.

##  Live Demo
- **Frontend Website:** [View Live Site](https://flawlessbydrashti.vercel.app/)
- **AI Chatbot API:** [Render Service](https://beauty-parlour-chatbot.onrender.com)

---

##  Key Features

###  For Customers
- **"Lily" AI Concierge:** A smart AI assistant (Python/LangChain) that can answer queries, check price lists, and **book appointments** in real-time.
- **Premium UI/UX:** A sleek, fully responsive dark-mode design with glassmorphism effects and smooth animations.
- **Real-Time Booking:** Integrated calendar system that syncs across the website and chatbot.
- **Secure Authentication:** User signup/login with JWT protection.

### For Administrators
- **Booking Management:** View, approve, or cancel appointments.
- **Service Management:** Add, edit, or remove beauty services dynamically.

---

##  Technology Stack

### **Frontend**
- **React.js** (Vite)
- **Tailwind CSS** (Styling & Animations)
- **Framer Motion** (Micro-interactions)
- **Lucide React** (Icons)

### **Backend**
- **Node.js & Express** (Main API Gateway)
- **Python (Flask)** (AI Chatbot Service)
- **LangChain & Groq** (LLM Logic for "Lily")
- **MySQL** (Relational Database for users & bookings)

### **Deployment**
- **Vercel** (Frontend)
- **Render** (Node Backend & Python AI Service)
- **TiDB Cloud** (MySQL Database)

---

##  Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ram-49-kaps/beauty-parlour-app.git
   cd beauty-parlour-app
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd Backend
   npm install
   # Create .env file with DB credentials
   node server.js
   ```

4. **AI Chatbot Setup**
   ```bash
   cd chatbot
   pip install -r requirements.txt
   # Set GROQ_API_KEY in .env
   python app.py
   ```

---

##  Privacy & Security
- **Cookie Consent:** GDPR-compliant cookie banner.
- **Password Hashing:** Bcrypt for user passwords.
- **Role-Based Access:** Strict Admin vs Customer separation.

---

Created with  by **Ram Kapadia**
