"""
🤖 FLAWLESS BY DRASHTI - AI SALON ASSISTANT (Lightweight Version)
"""

import os
import json
from datetime import datetime
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

# ✅ Flask Imports
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import time
import requests

# ✅ LangChain Imports (Modern API)
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain.agents import create_structured_chat_agent, AgentExecutor
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import HumanMessage, AIMessage


# ═══════════════════════════════════════════════════════════════
# 2️⃣ FLASK & LLM SETUP
# ═══════════════════════════════════════════════════════════════

load_dotenv()
app = Flask(__name__)
CORS(app)

# Groq LLM Setup
llm = ChatGroq(
    temperature=0.4,  # Lower for more consistent formatting
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model_name="llama-3.3-70b-versatile",  # Current supported model
    max_retries=2
)


# ═══════════════════════════════════════════════════════════════
# 3️⃣ DATABASE UTILS
# ═══════════════════════════════════════════════════════════════

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            port=int(os.getenv("DB_PORT", 4000))
        )
        return conn
    except Error as e:
        print(f"❌ DB CONNECTION ERROR: {e}")
        return None

# ═══════════════════════════════════════════════════════════════
# 4️⃣ TOOLS DEFINITION
# ═══════════════════════════════════════════════════════════════

@tool
def list_all_services(query: str = "") -> str:
    """Returns a formatted list of all salon services with category, price, and duration. Use this for menu/pricing questions."""
    conn = get_db_connection()
    if not conn: return "Sorry, I can't access the service list right now."

    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT name, category, price, duration FROM services "
        "WHERE is_active = TRUE "
        "ORDER BY FIELD(category, 'Event Package', 'Standard Makeup', 'Add-On'), display_order ASC, name ASC"
    )
    services = cursor.fetchall()
    cursor.close()
    conn.close()

    if not services: return "We are currently updating our service menu. Please check back later!"

    table = "\n\n| Category | Service Name | Price | Duration |\n| :--- | :--- | :--- | :--- |\n"
    for s in services:
        category = s.get('category') or '—'
        table += f"| {category} | {s['name']} | ₹{s['price']} | {s['duration']} mins |\n"
    return table

@tool
def check_discount(query: str = "") -> str:
    """Returns currently active discount/coupon codes (e.g. WELCOME5 for first-time customers). Use whenever the guest asks about offers, discounts, deals, promo codes, or savings."""
    conn = get_db_connection()
    if not conn:
        return "Sorry, I can't reach the offers system right now. Please check back shortly."

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT code, discount_percent, is_new_user_only "
            "FROM coupons WHERE is_active = TRUE"
        )
        coupons = cursor.fetchall()
    except Exception as e:
        cursor.close()
        conn.close()
        return f"Could not load offers: {str(e)}"

    cursor.close()
    conn.close()

    if not coupons:
        return "There are no active offers at the moment. Please ask again soon!"

    lines = ["Current active offers:"]
    for c in coupons:
        eligibility = "first-time customers only" if c.get('is_new_user_only') else "all guests"
        lines.append(f"- **{c['code']}** — {c['discount_percent']}% off ({eligibility})")
    lines.append("\nApply your code on the booking page at checkout: https://flawlessbydrashti.in/booking")
    return "\n".join(lines)

@tool
def search_salon_info(query: str = "") -> str:
    """Provides general information like location, operating hours, and contact details."""
    return """
    **Flawless by Drashti**
    📍 Location: Surat, Gujarat, India.
    ⏰ Hours: 10:00 AM - 8:00 PM (Monday - Sunday)
    📞 Contact: Refer to the website for direct calls.
    ✨ Specialties: Luxury Hair Treatments, Bridal Makeup, and Professional Nail Art.
    """

@tool
def check_availability(booking_date: str) -> str:
    """Checks for available time slots on a specific date (YYYY-MM-DD). Returns interactive tags."""
    try:
        datetime.strptime(booking_date, "%Y-%m-%d")
    except ValueError:
        return "Invalid date format. Please use YYYY-MM-DD."

    conn = get_db_connection()
    if not conn: return "Database connection failed."
    
    cursor = conn.cursor(dictionary=True)
    # Check for bookings that are NOT rejected
    cursor.execute("SELECT booking_time FROM bookings WHERE booking_date = %s AND status != 'rejected'", (booking_date,))
    booked = cursor.fetchall()
    cursor.close()
    conn.close()
    
    # Standard slots from 10 AM to 7 PM
    booked_times = [str(b['booking_time'])[:5] for b in booked]
    all_slots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]
    available = [s for s in all_slots if s not in booked_times]
    
    if not available:
        return f"I'm sorry, we are fully booked on {booking_date}. Would you like to check another day?"
    
    return f"||SLOTS: {', '.join(available)}||"

@tool
def create_booking(name: str, email: str, phone: str, service_name: str, booking_date: str, booking_time: str) -> str:
    """Creates a booking record once ALL details are provided. Details needed: name, email, phone, service, date, time."""
    # Prevent creating bookings with placeholder data
    placeholders = ["awaiting", "unknown", "placeholder", "n/a", "not provided"]
    if any(p in name.lower() or p in email.lower() or p in phone.lower() for p in placeholders):
        return "I need your actual name, email, and phone number to finalize the booking. Please provide them."

    conn = get_db_connection()
    if not conn: return "Booking system is currently offline."
    
    cursor = conn.cursor(dictionary=True)
    # Find service ID and price
    cursor.execute("SELECT id, price FROM services WHERE name LIKE %s LIMIT 1", (f"%{service_name}%",))
    service = cursor.fetchone()
    
    if not service:
        cursor.close()
        conn.close()
        return f"I couldn't find a service matching '{service_name}'. Please check the menu."
    
    try:
        sql = """INSERT INTO bookings 
                 (customer_name, customer_email, customer_phone, service_id, booking_date, booking_time, total_amount, status) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')"""
        cursor.execute(sql, (name, email, phone, service['id'], booking_date, booking_time, service['price']))
        conn.commit()
        booking_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return f"Success! Your appointment for {service_name} is scheduled for {booking_date} at {booking_time}. ||ID:{booking_id}||"
    except Exception as e:
        cursor.close()
        conn.close()
        return f"Technical Error: {str(e)}"

@tool
def get_booking_details(booking_id: str) -> str:
    """Retrieves status and details for an existing booking ID."""
    conn = get_db_connection()
    if not conn: return "Database unavailable."
    
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT b.id, b.customer_name, b.booking_date, b.booking_time, b.status, s.name as service_name 
        FROM bookings b 
        JOIN services s ON b.service_id = s.id 
        WHERE b.id = %s
    """, (booking_id,))
    booking = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not booking: return f"I couldn't find any booking with ID {booking_id}."
    return json.dumps(booking, default=str)

tools = [list_all_services, search_salon_info, check_availability, create_booking, get_booking_details, check_discount]


# ═══════════════════════════════════════════════════════════════
# 5️⃣ AGENT SETUP
# ═══════════════════════════════════════════════════════════════

def get_system_prompt():
    """Generate system prompt with current date/time."""
    return f"""You are Lily, the professional AI receptionist for Flawless by Drashti, a premium beauty studio in Surat.

Today's Date: {datetime.now().strftime('%A, %Y-%m-%d')}
Current Time: {datetime.now().strftime('%H:%M')}
Website: https://flawlessbydrashti.in
Booking Page: https://flawlessbydrashti.in/booking

CORE DUTIES:
- Help guests discover services and prices.
- Check date/time availability.
- Complete bookings (requires: name, phone, email, service, date, time).
- Inform guests about active discounts and the payment flow.

SERVICE CATALOG (always source live data via list_all_services). Categories you should expect:
- **Event Package** — premium curated packages (e.g. Bridal, Reception, Engagement, Haldi/Mehendi).
- **Standard Makeup** — single-occasion looks (e.g. Party, Engagement Guest, Casual Glam).
- **Add-On** — extras that pair with a main service (e.g. Lashes, Saree Draping, Hair Styling).

DISCOUNTS:
- We currently run **WELCOME5**: 5% off the first booking for new customers.
- Always confirm the latest offers via the check_discount tool before quoting any code.
- The coupon must be applied on the website booking page; it is not redeemable inside this chat.

PAYMENT FLOW (READ CAREFULLY):
- We collect a **50% advance** online via **Razorpay** to confirm the slot.
- The **remaining 50%** is paid in person at the studio on the appointment day.
- **Payments cannot be processed inside this chat** (PCI compliance). Razorpay needs the secure browser checkout.
- After collecting all booking details here, ALWAYS direct the guest to https://flawlessbydrashti.in/booking?id=YOUR_BOOKING_ID
  (replace YOUR_BOOKING_ID with the ID you received from create_booking) to complete the secure 50% advance payment. Phrase it warmly, e.g.:
  "To complete your booking with secure payment, please visit https://flawlessbydrashti.in/booking?id=123 — your details are ready and the 50% advance takes under a minute via Razorpay."

STYLE RULES:
- Professional, concise, elegant. No emojis.
- Use Markdown tables for service lists.
- Use interactive tags for time slots: ||SLOTS: 10:00, 11:00||

CRITICAL - TOOL OUTPUT RULE:
When a tool returns data (like services table or time slots), you MUST include that EXACT output in your final response.
- If list_all_services returns a table, include THE FULL TABLE in your answer
- If check_availability returns slots, include THE SLOTS TAG in your answer
- If check_discount returns codes, include them verbatim in your answer
- NEVER summarize or omit tool output. Always show the complete data to the user.

TOOL USAGE:
1. list_all_services - For menu/pricing/category questions. ALWAYS show the returned table.
2. search_salon_info - For location/hours
3. check_availability - Before confirming any slot. Include the ||SLOTS:...|| tag.
4. create_booking - Only when ALL details are collected
5. get_booking_details - To check existing booking status
6. check_discount - For any question about offers, discounts, deals, promo codes, or savings

LOGIN RULE:
- The guest's login status is already verified by the system before your response.
- NEVER ask the guest to log in or mention login requirements. This is handled automatically.
- If the guest is logged in, proceed normally with any booking or service request.
- Focus entirely on helping with services, bookings, and information.

BOOKING FLOW:
1. Ask which service they want
2. Ask for preferred date
3. Call check_availability to get slots
4. Ask for preferred time from available slots
5. Collect name, phone, email
6. Call create_booking
7. Include ||ID:X|| tag in confirmation
8. Conclude by directing the guest to https://flawlessbydrashti.in/booking?id=YOUR_BOOKING_ID to pay the 50% advance via Razorpay
   (mention WELCOME5 if eligible, surfaced via check_discount).

MEMORY: Remember details from previous messages. Don't re-ask.
"""

# ✅ Build a STRICT structured prompt
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

STRUCTURED_PROMPT = ChatPromptTemplate.from_messages([
    ("system", get_system_prompt() + """

AVAILABLE TOOLS:
{tools}

RESPONSE FORMAT (CRITICAL - FOLLOW EXACTLY):
You MUST respond with a JSON blob in this EXACT format:

```json
{{
  "action": "tool_name_or_Final Answer",
  "action_input": "input_string_or_your_response"
}}
```

RULES:
1. ALWAYS wrap your JSON in ```json code blocks
2. Use "Final Answer" as action when responding to user
3. Put your ENTIRE response text inside "action_input" as a single string
4. For Markdown tables, include them INSIDE the action_input string
5. NEVER output raw text outside the JSON structure
6. Valid actions: {tool_names}, "Final Answer"

EXAMPLE - Responding to user:
```json
{{
  "action": "Final Answer",
  "action_input": "Welcome to Flawless by Drashti! How may I assist you today?"
}}
```

EXAMPLE - Using a tool:
```json
{{
  "action": "list_all_services",
  "action_input": ""
}}
```

EXAMPLE - Response with table (note: table is INSIDE the string):
```json
{{
  "action": "Final Answer", 
  "action_input": "Here are our services:\\n\\n| Service | Price | Duration |\\n| :--- | :--- | :--- |\\n| Haircut | ₹500 | 30 mins |"
}}
```

Begin! Always respond with valid JSON only."""),
    MessagesPlaceholder("chat_history", optional=True),
    ("human", "{input}\n\n{agent_scratchpad}")
])

# ✅ Initialize Memory
memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

# ✅ Create Agent
agent = create_structured_chat_agent(
    llm=llm,
    tools=tools,
    prompt=STRUCTURED_PROMPT
)

# ✅ Robust Error Handler - Returns clean response instead of looping
def _handle_parsing_error(error) -> str:
    """Extract usable text from failed LLM output instead of looping."""
    error_str = str(error)
    
    # Try to extract the actual response from the error
    if "Could not parse LLM output:" in error_str:
        # Extract the raw text the LLM tried to output
        raw_output = error_str.replace("Could not parse LLM output: `", "").rstrip("`")
        
        # If it contains useful content, return it directly
        if len(raw_output) > 20 and "action" not in raw_output.lower():
            return raw_output
    
    # Otherwise, give a gentle instruction to retry
    return "I apologize, let me try that again. How may I help you?"

# ✅ Create Agent Executor with reduced iterations
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,
    verbose=True,
    handle_parsing_errors=_handle_parsing_error,
    max_iterations=3,  # Reduced to prevent long loops
    early_stopping_method="generate"  # Stop gracefully
)


# ═══════════════════════════════════════════════════════════════
# 6️⃣ FLASK ENDPOINT
# ═══════════════════════════════════════════════════════════════

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.json
    user_message = data.get("message", "")
    is_logged_in = data.get("isLoggedIn", False)
    
    if not user_message:
        return jsonify({"reply": "I didn't catch that. How can I help you?"}), 400
        
    if user_message.lower() == "reset":
        memory.clear()
        return jsonify({"reply": "Conversation reset."})

    # ── Deterministic login gate (handled in code, NOT by the LLM) ──
    booking_keywords = ["book", "appointment", "schedule", "reserve", "slot", "booking"]
    wants_to_book = any(kw in user_message.lower() for kw in booking_keywords)

    if not is_logged_in and wants_to_book:
        return jsonify({"reply": "To proceed with booking, please login first. ||LOGIN_REQUIRED||"})

    try:
        # Give the LLM clear context about the guest's login status
        login_context = "[SYSTEM NOTE: The guest is logged in and verified. Do NOT ask them to login. Proceed with their request normally.]"
        if not is_logged_in:
            login_context = "[SYSTEM NOTE: The guest is browsing without an account. They can ask about services and pricing, but booking requires login — this is handled automatically, do NOT mention login yourself.]"

        contextual_message = f"{login_context}\n{user_message}"
        response = agent_executor.invoke({"input": contextual_message})
        return jsonify({"reply": response["output"]})
    except Exception as e:
        print(f"Chat Error: {e}")
        return jsonify({"reply": "I apologize, but I am having trouble connecting to the system right now. Please try again later."}), 500

@app.route('/', methods=['GET'])
def home():
    return "Lily is Awake! 🌸"

@app.route('/health', methods=['GET'])
def health():
    """Robust health check that verifies DB connection."""
    conn = get_db_connection()
    if conn:
        conn.close()
        return jsonify({"status": "healthy", "database": "connected", "timestamp": datetime.now().isoformat()}), 200
    return jsonify({"status": "unhealthy", "database": "disconnected"}), 500

def self_ping_service():
    """Periodically pings the service to keep it alive (prevent cold start)."""
    endpoint = f"http://127.0.0.1:{PORT}/health"
    print(f"⏰ Self-ping service started. Target: {endpoint}")
    
    # Initial wait for server to start
    time.sleep(30)
    
    while True:
        try:
            response = requests.get(endpoint)
            # Just touch the endpoint, don't spam logs unless error
            if response.status_code != 200:
                 print(f"⚠️ Self-ping warning: Status {response.status_code}")
        except Exception as e:
            print(f"⚠️ Self-ping error: {e}")
            
        # Ping every 14 minutes (Render sleeps after 15 mins inactive)
        time.sleep(14 * 60)

# ✅ Global PORT definition for Gunicorn
PORT = int(os.getenv("PORT", 8000))

# ✅ Start Self-Ping Thread (Runs on Import for Gunicorn)
# Only start if not already running (simple check to avoid double threads in some setups)
if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
    pinger = threading.Thread(target=self_ping_service, daemon=True)
    pinger.start()

if __name__ == "__main__":
    print(f"🚀 Lily API Server running on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)