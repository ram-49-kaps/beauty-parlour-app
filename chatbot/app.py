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
    model_name="llama-3.1-70b-versatile",  # Better balance of speed + quality
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
    """Returns a formatted list of all salon services, prices, and durations. Use this for menu/pricing questions."""
    conn = get_db_connection()
    if not conn: return "Sorry, I can't access the service list right now."
    
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT name, price, duration FROM services")
    services = cursor.fetchall()
    cursor.close()
    conn.close()
    
    if not services: return "We are currently updating our service menu. Please check back later!"
    
    table = "\n\n| Service Name | Price | Duration |\n| :--- | :--- | :--- |\n"
    for s in services:
        table += f"| {s['name']} | ₹{s['price']} | {s['duration']} mins |\n"
    return table

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

tools = [list_all_services, search_salon_info, check_availability, create_booking, get_booking_details]


# ═══════════════════════════════════════════════════════════════
# 5️⃣ AGENT SETUP
# ═══════════════════════════════════════════════════════════════

def get_system_prompt():
    """Generate system prompt with current date/time."""
    return f"""You are Lily, the professional AI receptionist for Flawless by Drashti, a premium beauty studio in Surat.

Today's Date: {datetime.now().strftime('%A, %Y-%m-%d')}
Current Time: {datetime.now().strftime('%H:%M')}
Website: https://flawlessbydrashti.in

CORE DUTIES:
- Help guests discover services and prices.
- Check date/time availability.
- Complete bookings (requires: name, phone, email, service, date, time).

STYLE RULES:
- Professional, concise, elegant. No emojis.
- Use Markdown tables for service lists.
- Use interactive tags for time slots: ||SLOTS: 10:00, 11:00||

CRITICAL - TOOL OUTPUT RULE:
When a tool returns data (like services table or time slots), you MUST include that EXACT output in your final response.
- If list_all_services returns a table, include THE FULL TABLE in your answer
- If check_availability returns slots, include THE SLOTS TAG in your answer
- NEVER summarize or omit tool output. Always show the complete data to the user.

TOOL USAGE:
1. list_all_services - For menu/pricing questions. ALWAYS show the returned table.
2. search_salon_info - For location/hours
3. check_availability - Before confirming any slot. Include the ||SLOTS:...|| tag.
4. create_booking - Only when ALL details are collected
5. get_booking_details - To check existing booking status

LOGIN RULE:
- Messages start with [LOGGED_IN: True/False]
- If user wants to BOOK and [LOGGED_IN: False]: Reply exactly "To proceed with booking, please login first. ||LOGIN_REQUIRED||"
- If [LOGGED_IN: True]: Proceed normally

BOOKING FLOW:
1. Ask which service they want
2. Ask for preferred date
3. Call check_availability to get slots
4. Ask for preferred time from available slots
5. Collect name, phone, email
6. Call create_booking
7. Include ||ID:X|| tag in confirmation

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
    try:
        data = request.json
        user_message = data.get('message', '')
        
        if not user_message.strip():
            return jsonify({"reply": "I didn't catch that. How may I assist you?"})
        
        if user_message.lower() == "reset":
            memory.clear()
            return jsonify({"reply": "Memory cleared. How may I help you today?"})

        is_logged_in = data.get('is_logged_in', False)
        print(f"📨 Input: {user_message} | LoggedIn: {is_logged_in}")
        
        contextual_input = f"[LOGGED_IN: {is_logged_in}] {user_message}"

        # Invoke Agent
        response = agent_executor.invoke({
            "input": contextual_input
        })
        
        output_text = response.get("output", "I apologize, something went wrong. Please try again.")
        print(f"🤖 Output: {output_text}")
        
        return jsonify({"reply": output_text})

    except Exception as e:
        print(f"❌ SYSTEM ERROR: {e}")
        error_msg = str(e)
        
        # Rate limit error
        if "429" in error_msg or "Resource exhausted" in error_msg:
            return jsonify({"reply": "I'm currently assisting many guests. Please try again in a moment."}), 429
        
        # Generic fallback
        return jsonify({"reply": "I apologize for the inconvenience. Please try your request again."})

@app.route('/', methods=['GET'])
def home():
    return "Lily is Awake! 🌸"

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Lily API Server running on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)