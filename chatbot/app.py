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

# ✅ LangChain Imports (Lightweight)
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage


# ═══════════════════════════════════════════════════════════════
# 1️⃣ CONFIGURATION
# ═══════════════════════════════════════════════════════════════

load_dotenv()
app = Flask(__name__)
CORS(app) 

if not os.getenv("GROQ_API_KEY"):
    raise ValueError("❌ Missing GROQ_API_KEY in .env file")

print("🚀 Flawless AI System Starting (Port 8000)...")

DB_CONFIG = {
    'host': os.getenv("DB_HOST", "localhost"),
    'user': os.getenv("DB_USER", "root"),
    'password': os.getenv("DB_PASSWORD", "Ramkaps2004"),
    'database': os.getenv("DB_NAME", "beauty_parlour"),
    'port': int(os.getenv("DB_PORT", 3306)),
    'ssl_disabled': False
}


# ✅ Using the NEW Supported Model
llm = ChatGroq(model="meta-llama/llama-4-maverick-17b-128e-instruct", temperature=1)
# ❌ REMOVED EMBEDDINGS to save RAM

# ═══════════════════════════════════════════════════════════════
# 2️⃣ DATABASE FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def get_db_connection():
    try:
        if DB_CONFIG.get('ssl_disabled') is False:
             conn = mysql.connector.connect(**DB_CONFIG) # SSL handled by env/config inside library usually or pass ssl params explicitly if needed
        else:
             conn = mysql.connector.connect(**DB_CONFIG)
             
        return conn
    except Error as e:
        print(f"❌ Database Connection Error: {e}")
        return None

def fetch_all_services():
    try:
        conn = get_db_connection()
        if conn is None: return []
        
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, description, duration, price FROM services WHERE is_active = 1 ORDER BY name")
        services = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return services if services else []
        
    except Error as e:
        print(f"❌ Error fetching services: {e}")
        return []

def get_service_by_name(service_name):
    try:
        conn = get_db_connection()
        if not conn: return None
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, price FROM services WHERE LOWER(name) LIKE LOWER(%s) AND is_active = 1 LIMIT 1", (f"%{service_name}%",))
        service = cursor.fetchone()
        cursor.close()
        conn.close()
        return service
    except Exception as e:
        print(f"Error finding service: {e}")
        return None

# ═══════════════════════════════════════════════════════════════
# 3️⃣ KNOWLEDGE BASE (Simplified)
# ═══════════════════════════════════════════════════════════════

# ❌ REMOVED FAISS / VECTOR DB

# ═══════════════════════════════════════════════════════════════
# 4️⃣ TOOLS
# ═══════════════════════════════════════════════════════════════

@tool
def list_all_services() -> str:
    """Returns a complete list of all available salon services and their prices."""
    try:
        services = fetch_all_services()
        if not services:
            return "No services found in the database."
        
        # Markdown Table Format
        text = "| Service | Duration | Price |\n| :--- | :--- | :--- |\n"
        for s in services:
            name = s.get('name', 'Unknown')
            price = s.get('price', 'N/A')
            duration = s.get('duration', '?')
            text += f"| {name} | {duration} mins | ₹{price} |\n"
        return text
    except Exception as e:
        return f"Error listing services: {str(e)}"

@tool
def search_salon_info(query: str) -> str:
    """Search for general info like location, hours, or policies."""
    # Lightweight static info return (saves memory by removing FAISS)
    return "LOCATION: Gangotri Society Bhatar, Surat\nHOURS: Mon-Sat 10am-7pm\nCONTACT: +91 98765 43210"

@tool
def check_availability(date_str: str) -> str:
    """Check slots for YYYY-MM-DD."""
    try:
        booking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        if booking_date.weekday() == 6: return "Closed on Sundays."
        
        conn = get_db_connection()
        if not conn: return "Database error checking slots."
        
        cursor = conn.cursor()
        cursor.execute("SELECT booking_time FROM bookings WHERE booking_date = %s AND status IN ('pending', 'confirmed')", (date_str,))
        booked = [str(row[0])[:5] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        
        all_slots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
        available = [s for s in all_slots if s not in booked]
        return json.dumps({"date": date_str, "available_slots": available})
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def get_booking_details(booking_id: str) -> str:
    """Check the status and details of a specific booking by its ID."""
    try:
        conn = get_db_connection()
        if not conn: return "Database connection error."
        
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT b.id, b.booking_date, b.booking_time, b.status, b.customer_name, s.name as service_name
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE b.id = %s
        """
        cursor.execute(query, (booking_id,))
        
        booking = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if booking:
            return f"Booking #{booking['id']}\nService: {booking['service_name']}\nDate: {booking['booking_date']}\nTime: {booking['booking_time']}\nStatus: {booking['status'].upper()}\nName: {booking['customer_name']}"
        else:
            return "Booking ID not found."
    except Exception as e:
        return f"Error fetching booking: {str(e)}"

@tool
def create_booking(customer_name: str, customer_email: str, customer_phone: str, service_name: str, booking_date: str, booking_time: str) -> str:
    """Create a salon booking by calling the main Backend API. This ensures emails and WhatsApp messages are sent."""
    import requests # Local import to avoid touching file header
    try:
        service = get_service_by_name(service_name)
        if not service:
            return "Service not found. Ask user for exact service name."
        
        # 1. Prepare Payload
        payload = {
            "customer_name": customer_name,
            "customer_email": customer_email,
            "customer_phone": customer_phone,
            "service_id": service['id'],
            "booking_date": booking_date,
            "booking_time": booking_time,
            "user_id": None # Guest booking via Chatbot
        }
        
        # 2. Call Backend API
        # Determine API URL - in Production use the render backend URL
        # For now, default to local if not set, but in prod it must be set.
        # Actually, if both are on Render, use the https URL.
        # But this code runs ON server. It calls backend.
        api_url = os.getenv("BACKEND_API_URL", "http://localhost:5001/api/bookings")
        
        # If we are on Render, localhost:5001 won't work to reach the OTHER service.
        # We need the user to set BACKEND_API_URL in chatbot env if they want this to work perfectly cross-service, 
        # OR just use the public URL: https://beauty-parlour-app.onrender.com/api/bookings
        if "onrender" in os.getenv("RENDER_EXTERNAL_URL", ""):
             # Heuristic to switch to prod URL if not set? 
             # Better to rely on env var or just hardcode the public one if we know it.
             # User's backend is: https://beauty-parlour-app.onrender.com
             if "localhost" in api_url:
                 api_url = "https://beauty-parlour-app.onrender.com/api/bookings"

        response = requests.post(api_url, json=payload)
        
        if response.status_code == 201:
            data = response.json()
            booking = data.get('booking', {})
            booking_id = booking.get('id', 'Unknown')
            return f"Booking Successful. ||ID:{booking_id}||"
        elif response.status_code == 409:
             return "That time slot is already booked. Ask the guest to pick a different time."
        else:
            return f"Booking Failed: {response.text}"

    except Exception as e:
        return f"Error connecting to booking system: {str(e)}"

# ═══════════════════════════════════════════════════════════════
# 5️⃣ AGENT SETUP
# ═══════════════════════════════════════════════════════════════

SYSTEM_PROMPT = \"\"\"You are the professional and polite AI receptionist for Flawless by Drashti, a premium beauty studio in Surat.

Your job is to help guests:
- Discover services and prices.
- Check date and time availability.
- Secure a booking with name, phone, and email.

STYLE:
- Professional, concise, and elegant.
- DO NOT use emojis. Maintain a high-end salon aesthetic text style.
- Use Markdown tables for lists (especially services).
- Use bold for emphasis.

TOOLS:
1) For any question about services, pricing, or menu, always call list_all_services first.
2) For location, hours, or general information, prefer search_salon_info.
3) For booking:
   - Ask for service, date (YYYY-MM-DD), preferred time (HH:MM), name, phone, and email.
   - Call check_availability before confirming a slot.
   - If a booking is successful, the tool returns a confirmation with a hidden ID tag (||ID:123||). YOU MUST INCLUDE this tag in your final response unchanged, or the confirmation email will fail.
   - If a time is not available or the tool says the slot is already booked, clearly tell the guest and suggest nearby available times.
   - Only call create_booking when you have all required details and a free slot.
   - When listing available time slots, DO NOT use bullet points. Format them exactly like this: ||SLOTS: 10:00, 11:00, 14:00, ...|| asking the user to pick one.
4) To check the status of a specific booking, use get_booking_details(booking_id).

BOOKING CONFIRMATION:
- After a successful booking, properly summarize the details (Service, Date, Time, Name).
- Always embed the exact phrase: ||ID:<id>|| at the end of your confirmation message so that the system can send an email.

CONVERSATION:
- Ask one or two things at a time, not everything at once.
- If the user is just exploring, do not force a booking.

LOGIN RULE (CRITICAL):
- I will inform you if the user is [LOGGED_IN: True] or [LOGGED_IN: False] at the start of their message.
- If the user explicitly wants to "book" or "reserve" or "schedule" an appointment:
  1. Check if [LOGGED_IN: False].
  2. If they are NOT logged in, you MUST reply with exactly: "To proceed with booking, please login first. ||LOGIN_REQUIRED||"
  3. Do NOT ask for any details (name, date, service) if they are not logged in.
  4. If they ARE logged in ([LOGGED_IN: True]), proceed with the booking flow normally.
- If the user simply asks to "check booking status" or "details for booking ID X", you may proceed regardless of login status, as long as they provide the ID.

MEMORY & CONTEXT (EXTREMELY IMPORTANT):
- You must REMEMBER details provided in previous turns (Service, Date, Time).
- Do NOT ask for information the user has already provided.
- If the user provides multiple details at once (e.g., "Book Eyelashes for tomorrow at 5pm"), capture ALL of them.
- When asking for the final confirmation (Name, Phone, Email), you MUST mentally recall the Service, Date, and Time from the history to build the final booking.

OUTPUT FORMATTING:
- **Time Slots**: NEVER list slots as bullet points. ALWAYS use the interactive tag: ||SLOTS: 10:00, 11:00, 12:00||.
\"\"\"

tools = [list_all_services, search_salon_info, check_availability, create_booking, get_booking_details]

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("placeholder", "{chat_history}"),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, handle_parsing_errors=True)

# ✅ CRITICAL FIX: Initialize as an Empty List, NOT None
chat_history = [] 

# ═══════════════════════════════════════════════════════════════
# 6️⃣ FLASK ENDPOINT
# ═══════════════════════════════════════════════════════════════

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    global chat_history
    try:
        # ✅ SAFETY CHECK: If chat_history ever becomes None, force it to []
        if chat_history is None:
            chat_history = []
            
        data = request.json
        user_message = data.get('message', '')
        
        if user_message.lower() == "reset":
            chat_history = []
            return jsonify({"reply": "Memory cleared."})

        is_logged_in = data.get('is_logged_in', False)
        print(f"📨 Input: {user_message} | LoggedIn: {is_logged_in}")
        
        # Contextual Input
        contextual_input = f"[LOGGED_IN: {is_logged_in}] {user_message}"

        # Invoke Agent
        response = agent_executor.invoke({
            "chat_history": chat_history, 
            "input": contextual_input
        })
        
        output_text = response["output"]
        print(f"🤖 Output: {output_text}")
        
        # Save History
        chat_history.append(HumanMessage(content=user_message))
        chat_history.append(AIMessage(content=output_text))
        
        # Limit Memory to last 30 turns (approx 15 exchanges) to prevent amnesia
        if len(chat_history) > 30: chat_history = chat_history[-30:]
        
        return jsonify({"reply": output_text})

    except Exception as e:
        print(f"❌ SYSTEM ERROR: {e}")
        # Reset memory on error just in case it caused the crash
        chat_history = []
        return jsonify({"reply": "I'm having a brief brain freeze. Please try asking again."})

if __name__ == "__main__":
    print("🚀 API Server running on http://localhost:8000")
    app.run(port=8000, debug=True)
