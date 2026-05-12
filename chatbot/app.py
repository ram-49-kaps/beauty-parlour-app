"""
FLAWLESS BY DRASHTI - AI SALON ASSISTANT (Production-Grade)
Fixes: date bug, per-session memory, retry logic, improved responses
"""

import os
import re
import json
import time as time_module
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import requests

from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain.agents import create_structured_chat_agent, AgentExecutor
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# ============================================================
# CONFIG
# ============================================================

load_dotenv()
app = Flask(__name__)
CORS(app)

IST = ZoneInfo("Asia/Kolkata")

# Groq LLM with retry
llm = ChatGroq(
    temperature=0.3,
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model_name="llama-3.3-70b-versatile",
    max_retries=3,
    request_timeout=30
)

# ============================================================
# PER-SESSION MEMORY STORE
# ============================================================

session_memories = {}
SESSION_TTL_SECONDS = 3600  # 1 hour

def get_session_memory(session_id):
    """Get or create memory for a session. Cleans expired sessions."""
    now = time_module.time()

    # Cleanup expired sessions (every call, lightweight check)
    expired = [sid for sid, (_, ts) in session_memories.items() if now - ts > SESSION_TTL_SECONDS]
    for sid in expired:
        del session_memories[sid]

    if session_id not in session_memories:
        session_memories[session_id] = (
            ConversationBufferMemory(memory_key="chat_history", return_messages=True),
            now
        )
    else:
        mem, _ = session_memories[session_id]
        session_memories[session_id] = (mem, now)  # refresh timestamp

    return session_memories[session_id][0]


# ============================================================
# DATABASE UTILS (with retry)
# ============================================================

def get_db_connection(retries=2):
    """Get DB connection with retry logic."""
    for attempt in range(retries + 1):
        try:
            conn = mysql.connector.connect(
                host=os.getenv("DB_HOST"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                database=os.getenv("DB_NAME"),
                port=int(os.getenv("DB_PORT", 4000)),
                connection_timeout=10
            )
            return conn
        except Error as e:
            print(f"DB connection attempt {attempt + 1} failed: {e}")
            if attempt < retries:
                time_module.sleep(1)
    return None


# ============================================================
# HELPER: Get current IST datetime (called per-request, NOT cached)
# ============================================================

def now_ist():
    """Always returns the CURRENT date/time in IST."""
    return datetime.now(IST)


def parse_relative_date(text):
    """Parse 'today', 'tomorrow', 'day after tomorrow' into YYYY-MM-DD."""
    today = now_ist().date()
    lower = text.lower().strip()

    if "day after tomorrow" in lower:
        return (today + timedelta(days=2)).strftime("%Y-%m-%d")
    elif "tomorrow" in lower:
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")
    elif "today" in lower:
        return today.strftime("%Y-%m-%d")

    # Try to parse explicit date
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d %B %Y", "%d %b %Y"):
        try:
            return datetime.strptime(text.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    return None


# ============================================================
# TOOLS
# ============================================================

@tool
def list_all_services(query: str = "") -> str:
    """Returns a formatted list of all salon services with category, price, and duration. Use this for menu/pricing questions."""
    conn = get_db_connection()
    if not conn:
        return "Sorry, I cannot access the service list right now. Please try again in a moment."

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT name, category, price, duration FROM services "
            "WHERE is_active = TRUE "
            "ORDER BY FIELD(category, 'Event Package', 'Standard Makeup', 'Add-On'), display_order ASC, name ASC"
        )
        services = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    if not services:
        return "We are currently updating our service menu. Please check back later."

    table = "\n\n| Category | Service Name | Price | Duration |\n| :--- | :--- | :--- | :--- |\n"
    for s in services:
        category = s.get('category') or 'General'
        table += f"| {category} | {s['name']} | Rs. {int(s['price']):,} | {s['duration']} mins |\n"
    return table


@tool
def check_discount(query: str = "") -> str:
    """Returns currently active discount/coupon codes. Use whenever the guest asks about offers, discounts, deals, promo codes, or savings."""
    conn = get_db_connection()
    if not conn:
        return "Sorry, I cannot reach the offers system right now. Please check back shortly."

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT code, discount_percent, is_new_user_only "
            "FROM coupons WHERE is_active = TRUE"
        )
        coupons = cursor.fetchall()
        cursor.close()
    except Exception as e:
        conn.close()
        return f"Could not load offers: {str(e)}"
    finally:
        conn.close()

    if not coupons:
        return "There are no active offers at the moment. Please ask again soon."

    lines = ["Current active offers:\n"]
    for c in coupons:
        eligibility = "first-time customers only" if c.get('is_new_user_only') else "all guests"
        lines.append(f"- **{c['code']}** — {c['discount_percent']}% off ({eligibility})")
    lines.append("\nApply your code on the booking page at checkout: https://flawlessbydrashti.in/booking")
    return "\n".join(lines)


@tool
def search_salon_info(query: str = "") -> str:
    """Provides general information like location, operating hours, and contact details."""
    return """**Flawless by Drashti**

Location: Surat, Gujarat, India
Hours: 10:00 AM - 8:00 PM (Monday - Sunday)
Contact: Refer to the website for direct calls
Specialties: Luxury Hair Treatments, Bridal Makeup, and Professional Nail Art"""


@tool
def check_availability(booking_date: str) -> str:
    """Checks for available time slots on a specific date (YYYY-MM-DD or relative like 'tomorrow'). Returns interactive slot tags."""
    # Parse relative dates
    parsed = parse_relative_date(booking_date)
    if not parsed:
        # Try direct format
        try:
            datetime.strptime(booking_date, "%Y-%m-%d")
            parsed = booking_date
        except ValueError:
            return "I could not understand that date. Please provide a date like 'tomorrow', '15 May 2026', or '2026-05-15'."

    # Validate not in the past
    today = now_ist().date()
    check_date = datetime.strptime(parsed, "%Y-%m-%d").date()
    if check_date < today:
        return f"That date ({check_date.strftime('%-d %B %Y')}) is in the past. Please choose today or a future date."

    conn = get_db_connection()
    if not conn:
        return "Database connection failed. Please try again."

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT booking_time FROM bookings WHERE booking_date = %s AND status != 'rejected'",
            (parsed,)
        )
        booked = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    booked_times = [str(b['booking_time'])[:5] for b in booked]
    all_slots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]

    # If checking today, filter out past slots
    if check_date == today:
        current_hour = now_ist().hour
        all_slots = [s for s in all_slots if int(s.split(':')[0]) > current_hour]

    available = [s for s in all_slots if s not in booked_times]

    friendly_date = check_date.strftime("%-d %B %Y")

    if not available:
        return f"I am sorry, we are fully booked on {friendly_date}. Would you like to check another day?"

    return f"Available slots for {friendly_date}:\n\n||SLOTS: {', '.join(available)}||"


@tool
def create_booking(name: str, email: str, phone: str, service_name: str, booking_date: str, booking_time: str) -> str:
    """Creates a booking. IMPORTANT: action_input MUST be a JSON object with keys: name, email, phone, service_name, booking_date, booking_time. Example: {"name": "Ram", "email": "ram@gmail.com", "phone": "9409699664", "service_name": "Haldi Ceremony Package", "booking_date": "2026-05-13", "booking_time": "19:00"}"""
    placeholders = ["awaiting", "unknown", "placeholder", "n/a", "not provided", "tbd"]
    if any(p in name.lower() or p in email.lower() or p in phone.lower() for p in placeholders):
        return "I need your actual name, email, and phone number to finalize the booking. Please provide them."

    # Validate email format
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return "That email address does not look valid. Please provide a correct email."

    # Validate phone (at least 10 digits)
    digits = re.sub(r'\D', '', phone)
    if len(digits) < 10:
        return "Please provide a valid phone number with at least 10 digits."

    # Parse date
    parsed_date = parse_relative_date(booking_date) or booking_date
    try:
        datetime.strptime(parsed_date, "%Y-%m-%d")
    except ValueError:
        return "Invalid date format. Please use YYYY-MM-DD or say 'tomorrow'."

    conn = get_db_connection()
    if not conn:
        return "Booking system is currently offline. Please try again shortly."

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, price FROM services WHERE name LIKE %s LIMIT 1", (f"%{service_name}%",))
        service = cursor.fetchone()

        if not service:
            cursor.close()
            return f"I could not find a service matching '{service_name}'. Please check the menu and try again."

        sql = """INSERT INTO bookings 
                 (customer_name, customer_email, customer_phone, service_id, booking_date, booking_time, total_amount, status) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')"""
        cursor.execute(sql, (name, email, phone, service['id'], parsed_date, booking_time, service['price']))
        conn.commit()
        booking_id = cursor.lastrowid
        cursor.close()

        friendly_date = datetime.strptime(parsed_date, "%Y-%m-%d").strftime("%-d %B %Y")
        # Format time
        h, m = booking_time.split(':')
        hour = int(h)
        ampm = "PM" if hour >= 12 else "AM"
        h12 = hour - 12 if hour > 12 else (12 if hour == 0 else hour)
        friendly_time = f"{h12}:{m} {ampm}"

        return f"Your appointment for {service_name} has been scheduled for {friendly_date} at {friendly_time}.\n\n||ID:{booking_id}||\n\nTo confirm your slot, please pay the 50% advance (Rs. {int(service['price']) // 2:,}) via Razorpay:\n\n||PAY:{booking_id}:{int(service['price'])}||"
    except Exception as e:
        return f"Technical error while creating booking: {str(e)}"
    finally:
        conn.close()


@tool
def get_booking_details(booking_id: str) -> str:
    """Retrieves status and details for an existing booking ID. Accepts formats like: 1, FBD-0001, #FBD-0001."""
    clean_id = booking_id.strip().upper().replace('#', '').replace('FBD-', '').replace('FBD', '')
    numeric_match = re.search(r'\d+', clean_id)
    if numeric_match:
        clean_id = str(int(numeric_match.group()))
    else:
        return f"Invalid booking ID format: {booking_id}. Please provide a valid ID like #FBD-0001."

    conn = get_db_connection()
    if not conn:
        return "Database unavailable. Please try again."

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT b.id, b.customer_name, b.customer_email, b.customer_phone,
                   b.booking_date, b.booking_time, b.status, b.payment_status,
                   b.total_amount, b.advance_amount, b.remaining_amount,
                   b.coupon_code, b.discount_amount, b.razorpay_payment_id,
                   s.name as service_name, s.duration
            FROM bookings b 
            JOIN services s ON b.service_id = s.id 
            WHERE b.id = %s
        """, (clean_id,))
        booking = cursor.fetchone()
        cursor.close()
    finally:
        conn.close()

    if not booking:
        return f"I could not find any booking with ID #FBD-{clean_id.zfill(4)}. Please double-check the ID."

    def fmt_date(d):
        try:
            date_obj = datetime.strptime(str(d)[:10], "%Y-%m-%d") if isinstance(d, str) else d
            return date_obj.strftime("%-d %B %Y")
        except:
            return str(d)

    def fmt_time(t):
        try:
            parts = str(t).split(':')
            h, m = int(parts[0]), parts[1] if len(parts) > 1 else '00'
            ampm = 'PM' if h >= 12 else 'AM'
            h12 = h - 12 if h > 12 else (12 if h == 0 else h)
            return f"{h12}:{m} {ampm}"
        except:
            return str(t)

    status_labels = {"pending": "Pending Approval", "confirmed": "Confirmed", "completed": "Completed", "rejected": "Rejected", "cancelled": "Cancelled"}
    payment_labels = {"advance_paid": "50% Advance Paid", "fully_paid": "Fully Paid", None: "Pending"}

    ref = f"#FBD-{str(booking['id']).zfill(4)}"

    result = f"""Booking {ref}

Service: {booking['service_name']} ({booking['duration']} minutes)
Date: {fmt_date(booking['booking_date'])}
Time: {fmt_time(booking['booking_time'])}
Status: {status_labels.get(booking['status'], booking['status'])}
Payment: {payment_labels.get(booking['payment_status'], booking['payment_status'] or 'Pending')}

Customer: {booking['customer_name']}
Email: {booking['customer_email']}
Phone: {booking['customer_phone']}

Total Amount: Rs. {float(booking['total_amount']):,.0f}"""

    if booking.get('coupon_code'):
        result += f"\nDiscount: {booking['coupon_code']} (- Rs. {float(booking['discount_amount']):,.0f})"
        final = float(booking['total_amount']) - float(booking['discount_amount'])
        result += f"\nFinal Amount: Rs. {final:,.0f}"
    if booking.get('advance_amount') and float(booking['advance_amount']) > 0:
        result += f"\nAdvance Paid: Rs. {float(booking['advance_amount']):,.0f}"
    if booking.get('remaining_amount') and float(booking['remaining_amount']) > 0:
        result += f"\nBalance Due: Rs. {float(booking['remaining_amount']):,.0f}"
    if booking.get('razorpay_payment_id'):
        result += f"\nPayment ID: {booking['razorpay_payment_id']}"

    return result


@tool
def resend_booking_email(booking_id: str) -> str:
    """Resends the booking confirmation email for a given booking ID. The email is sent to the address already on file."""
    clean_id = booking_id.strip().upper().replace('#', '').replace('FBD-', '').replace('FBD', '')
    numeric_match = re.search(r'\d+', clean_id)
    if numeric_match:
        clean_id = str(int(numeric_match.group()))
    else:
        return f"Invalid booking ID: {booking_id}"

    backend_url = os.getenv("BACKEND_URL", "https://beauty-parlour-app.onrender.com")
    try:
        response = requests.post(
            f"{backend_url}/api/bookings/{clean_id}/resend-email",
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        if response.status_code == 200:
            data = response.json()
            return f"Confirmation email has been successfully resent to {data.get('email', 'the registered email address')}."
        else:
            return "Sorry, I was unable to resend the email right now. Please try again later."
    except Exception as e:
        print(f"Resend email error: {e}")
        return "I am having trouble connecting to the email service. Please try again in a moment."


tools = [list_all_services, search_salon_info, check_availability, create_booking, get_booking_details, check_discount, resend_booking_email]


# ============================================================
# AGENT SETUP (Dynamic prompt - date injected per-request)
# ============================================================

def build_system_prompt():
    """Generate system prompt with CURRENT date/time (called per request)."""
    current = now_ist()
    return f"""You are Lily, the professional AI receptionist for Flawless by Drashti, a premium beauty studio in Surat, Gujarat.

Today's Date: {current.strftime('%A, %-d %B %Y')}
Current Time: {current.strftime('%-I:%M %p')} IST
Website: https://flawlessbydrashti.in
Booking Page: https://flawlessbydrashti.in/booking

CORE DUTIES:
- Help guests discover services and prices
- Check date/time availability
- Complete bookings (requires: name, phone, email, service, date, time)
- Inform guests about active discounts and the payment flow
- Look up existing bookings and resend confirmation emails

DATE HANDLING (CRITICAL):
- Today is {current.strftime('%A, %-d %B %Y')}
- "Tomorrow" means {(current + timedelta(days=1)).strftime('%A, %-d %B %Y')}
- "Day after tomorrow" means {(current + timedelta(days=2)).strftime('%A, %-d %B %Y')}
- ALWAYS use the check_availability tool with the correct computed date
- NEVER guess or hardcode dates

PAYMENT FLOW:
- We collect a 50% advance online via Razorpay to confirm the slot
- The remaining 50% is paid in person at the studio
- Payments cannot be processed inside this chat
- After collecting all booking details, direct the guest to https://flawlessbydrashti.in/booking

RESPONSE QUALITY RULES:
- Be professional, warm, and concise
- Format booking details cleanly with proper line breaks
- Always use human-friendly formats:
  * Dates: "21 May 2026" (NOT "2026-05-21")
  * Times: "2:00 PM" (NOT "14:00" or "14:00:00")
  * Currency: "Rs. 3,500" (NOT "3500.00")
- Use Markdown tables ONLY for service lists
- Use interactive tags for time slots: ||SLOTS: 10:00, 11:00||
- Add a blank line between paragraphs for readability

CRITICAL RULES:
- NEVER re-ask for data you already have from a tool result
- When a tool returns data, include it FULLY in your response
- NEVER summarize or omit tool output
- If check_availability returns ||SLOTS:...||, include that exact tag

BOOKING FLOW:
1. Ask which service they want
2. Ask for preferred date
3. Call check_availability with the correct date
4. Present available slots (include the ||SLOTS:...|| tag)
5. After they pick a time, collect name, phone, email
6. Call create_booking with ALL details
7. Show confirmation with ||ID:X|| tag
8. Direct to payment page

MEMORY: Remember details from previous messages in this conversation. Do not re-ask."""


def build_structured_prompt(system_text):
    """Build the structured prompt template with the given system text."""
    return ChatPromptTemplate.from_messages([
        ("system", system_text + """

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
4. For tools with MULTIPLE parameters (like create_booking), action_input MUST be a JSON OBJECT with named keys, NOT a comma-separated string
5. For tools with a SINGLE parameter (like check_availability), action_input can be a plain string
6. NEVER output raw text outside the JSON structure
7. Valid actions: {tool_names}, "Final Answer"

EXAMPLE - Using a single-input tool:
```json
{{
  "action": "check_availability",
  "action_input": "2026-05-13"
}}
```

EXAMPLE - Using a multi-input tool (CRITICAL - use a JSON object, NOT a string):
```json
{{
  "action": "create_booking",
  "action_input": {{"name": "Ram Kapadia", "email": "ram@gmail.com", "phone": "9409699664", "service_name": "Haldi Ceremony Package", "booking_date": "2026-05-13", "booking_time": "19:00"}}
}}
```

EXAMPLE - Final response:
```json
{{
  "action": "Final Answer",
  "action_input": "Here are the available slots for 13 May 2026:\\n\\n||SLOTS: 10:00, 11:00, 14:00||\\n\\nWhich time works best for you?"
}}
```

Begin! Always respond with valid JSON only."""),
        MessagesPlaceholder("chat_history", optional=True),
        ("human", "{input}\n\n{agent_scratchpad}")
    ])


def _handle_parsing_error(error) -> str:
    """Extract usable text from failed LLM output instead of looping."""
    error_str = str(error)

    if "Could not parse LLM output:" in error_str:
        raw_output = error_str.replace("Could not parse LLM output: `", "").rstrip("`")
        if len(raw_output) > 20 and "action" not in raw_output.lower():
            return raw_output

    return "I apologize for the confusion. Could you please rephrase your question?"


# ============================================================
# FLASK ENDPOINT
# ============================================================

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.json
    user_message = data.get("message", "").strip()
    is_logged_in = data.get("isLoggedIn", data.get("is_logged_in", False))
    session_id = data.get("sessionId", request.remote_addr or "default")

    if not user_message:
        return jsonify({"reply": "I did not catch that. How can I help you?"}), 400

    if user_message.lower() == "reset":
        if session_id in session_memories:
            del session_memories[session_id]
        return jsonify({"reply": "Conversation reset. How may I assist you today?"})

    # Deterministic login gate
    booking_keywords = ["book", "appointment", "schedule", "reserve", "slot", "booking"]
    check_keywords = ["check", "status", "already", "my booking", "my appointment", "existing", "cancel", "reschedule", "view", "see my", "show my"]

    wants_to_book = any(kw in user_message.lower() for kw in booking_keywords)
    is_checking_existing = any(kw in user_message.lower() for kw in check_keywords)

    if not is_logged_in and wants_to_book and not is_checking_existing:
        return jsonify({"reply": "To proceed with booking, please log in first.\n\n||LOGIN_REQUIRED||"})

    try:
        # Build fresh prompt with current date/time
        system_text = build_system_prompt()
        prompt = build_structured_prompt(system_text)

        # Get per-session memory
        memory = get_session_memory(session_id)

        # Create agent fresh each request (prompt has current date)
        agent = create_structured_chat_agent(
            llm=llm,
            tools=tools,
            prompt=prompt
        )

        agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            memory=memory,
            verbose=True,
            handle_parsing_errors=_handle_parsing_error,
            max_iterations=4,
            early_stopping_method="force"
        )

        # Login context
        if is_logged_in:
            login_context = "[SYSTEM: Guest is LOGGED IN. Do NOT mention login. Proceed normally.]"
        else:
            login_context = "[SYSTEM: Guest is browsing without login. They can ask about services/pricing. Do NOT mention login.]"

        contextual_message = f"{login_context}\n{user_message}"
        response = agent_executor.invoke({"input": contextual_message})

        reply = response.get("output", "I apologize, something went wrong. Please try again.")

        # Clean up any residual agent artifacts
        reply = reply.strip()
        if reply.startswith("Agent stopped"):
            reply = "I apologize, I had trouble processing that. Could you please try again?"

        return jsonify({"reply": reply})

    except Exception as e:
        print(f"Chat Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"reply": "I apologize, but I am having trouble connecting right now. Please try again in a moment."}), 500


@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "online", "agent": "Lily", "version": "2.0"})


@app.route('/health', methods=['GET'])
def health():
    """Health check with DB verification."""
    conn = get_db_connection(retries=1)
    if conn:
        conn.close()
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "timestamp": now_ist().isoformat(),
            "active_sessions": len(session_memories)
        }), 200
    return jsonify({"status": "unhealthy", "database": "disconnected"}), 500


# ============================================================
# SELF-PING (Keep Render alive)
# ============================================================

PORT = int(os.getenv("PORT", 8000))


def self_ping_service():
    """Periodically pings the service to prevent cold start on Render free tier."""
    endpoint = f"http://127.0.0.1:{PORT}/health"
    time_module.sleep(30)

    while True:
        try:
            response = requests.get(endpoint, timeout=10)
            if response.status_code != 200:
                print(f"Self-ping warning: Status {response.status_code}")
        except Exception as e:
            print(f"Self-ping error: {e}")
        time_module.sleep(14 * 60)


if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
    pinger = threading.Thread(target=self_ping_service, daemon=True)
    pinger.start()

if __name__ == "__main__":
    print(f"Lily API Server running on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
