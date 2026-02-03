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
from langchain import hub


# ═══════════════════════════════════════════════════════════════
# 2️⃣ FLASK & LLM SETUP
# ═══════════════════════════════════════════════════════════════

load_dotenv()
app = Flask(__name__)
CORS(app)

# Groq LLM Setup
llm = ChatGroq(
    temperature=0.6,
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model_name="llama-3.3-70b-versatile",
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

SYSTEM_PROMPT = f"""You are Lily, the professional and polite AI receptionist for Flawless by Drashti, a premium beauty studio in Surat.

Today's Date: {datetime.now().strftime('%A, %Y-%m-%d')}
Current Time: {datetime.now().strftime('%H:%M')}
Website Link: https://flawlessbydrashti.in

Your job is to help guests:
- Discover services and prices.
- Check date and time availability.
- Secure a booking with name, phone, and email.

STYLE:
- Professional, concise, and elegant.
- DO NOT use emojis. Maintain a high-end salon aesthetic text style.
- Use Markdown tables for lists (especially services).
- **CRITICAL:** Use bold for emphasis, but keep layouts clean.

FORMATTING RULES (STRICT):
1. **Services & Prices:** ALWAYS use a proper Markdown table.
   - Ensure there is a blank line before and after the table.
   - Do NOT collapse the table into a single line of text.
   - Example format:
     
     | Service Name | Price | Duration |
     | :--- | :--- | :--- |
     | Haircut | ₹500 | 30 mins |
     
2. **Time Slots:** NEVER list slots as bullet points. ALWAYS use the interactive tag: ||SLOTS: 10:00, 11:00, 12:00||.

TOOLS:
1) For any question about services, pricing, or menu, always call list_all_services first.
2) For location, hours, or general information, prefer search_salon_info.
3) For booking:
   - Ask for service, date (YYYY-MM-DD), preferred time (HH:MM), name, phone, and email.
   - Call check_availability before confirming a slot.
   - If a booking is successful, the tool returns a confirmation with a hidden ID tag (||ID:123||). YOU MUST INCLUDE this tag in your final response unchanged, or the confirmation email will fail.
   - If a time is not available or the tool says the slot is already booked, clearly tell the guest and suggest nearby available times.
   - Only call create_booking when you have all required details and a free slot.
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

ROBUSTNESS & INTENT RECOGNITION (CRITICAL - READ CAREFULLY):
- **Aggressive Typo Tolerance**: You are a smart human-like agent. If a user types "i wnt 2 buk tmrw", you MUST understand this as "I want to book for tomorrow".
- **Grammar & Slang**: Ignore bad grammar, missing punctuation, or slang. 
- **Context is King**: If the date is unclear but they say "next friday", calculate it. If they say "hair stuff", assume they mean "Haircut & Styling" or ask for clarification gently.
- **Never Correct the User**: Never say "Did you mean...?". Just proceed with the correct action as if they typed it perfectly.
- **Handle Abbreviations**: 'tmrw' -> Tomorrow, 'tday' -> Today, 'plz' -> Please, 'u' -> You. Treat these as standard language.
"""

# ✅ Initialize Memory
memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

# ✅ Get the structured chat prompt template
try:
    prompt = hub.pull("hwchase17/structured-chat-agent")
except:
    # Fallback if hub is unavailable
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    
    # ⚠️ FALLBACK PROMPT FOR STRUCTURED AGENT (MUST INCLUDE TOOL INSTRUCTIONS)
    fallback_system_msg = SYSTEM_PROMPT + """
    
    You have access to the following tools:

    {tools}

    Use a json blob to specify a tool by providing an action key (tool name) and an action_input key (tool input).
    Valid "action" values: "Final Answer" or {tool_names}

    Provide only ONE action per $JSON_BLOB, as shown:

    ```
    {{
      "action": "tool_name",
      "action_input": "tool_input"
    }}
    ```

    Follow this format:

    Question: input question to answer
    Thought: consider previous and subsequent steps
    Action:
    ```
    $JSON_BLOB
    ```
    Observation: action result
    ... (repeat Thought/Action/Observation N times)
    Thought: I know what to respond
    Action:
    ```
    {{
      "action": "Final Answer",
      "action_input": "Final response to human"
    }}
    ```

    Begin! Reminder to ALWAYS respond with a valid json blob of a single action. Use tools if necessary. Respond directly if appropriate. Format is Action:```$JSON_BLOB```then Observation:.
    """

    prompt = ChatPromptTemplate.from_messages([
        ("system", fallback_system_msg),
        MessagesPlaceholder("chat_history", optional=True),
        ("human", "{input}\n\n{agent_scratchpad}"),
    ])

# ✅ Create Agent with Modern API
agent = create_structured_chat_agent(
    llm=llm,
    tools=tools,
    prompt=prompt
)

# ✅ Create Agent Executor
# We use a custom error handler to prevent crashing on "Could not parse LLM output"
def _handle_error(error) -> str:
    # return str(error).replace("Could not parse LLM output: `", "").replace("`", "")
    return "Output must be a valid JSON blob. Please correct your output format to standard JSON with 'action' and 'action_input' keys."

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,
    verbose=True,
    handle_parsing_errors=_handle_error,
    max_iterations=5
)

# Global memory is now handled by the agent_executor's memory object instance.
# However, since flask is stateless per request if using global var, it persists in memory.
# But for multi-user in prod we need DB memory. For now, simple list/global memory is fine as per original design.
# To support reset, we can clear memory.
 

# ═══════════════════════════════════════════════════════════════
# 6️⃣ FLASK ENDPOINT
# ═══════════════════════════════════════════════════════════════

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    try:
        data = request.json
        user_message = data.get('message', '')
        
        if user_message.lower() == "reset":
            memory.clear()
            return jsonify({"reply": "Memory cleared."})

        is_logged_in = data.get('is_logged_in', False)
        print(f"📨 Input: {user_message} | LoggedIn: {is_logged_in}")
        
        contextual_input = f"[LOGGED_IN: {is_logged_in}] {user_message}"

        # Invoke Agent (Memory is handled internally by ConversationBufferMemory)
        response = agent_executor.invoke({
            "input": contextual_input
        })
        
        output_text = response["output"]
        print(f"🤖 Output: {output_text}")
        
        return jsonify({"reply": output_text})
        

        
        return jsonify({"reply": output_text})

    except Exception as e:
        print(f"❌ SYSTEM ERROR: {e}")
        error_msg = str(e)
        if "429" in error_msg or "Resource exhausted" in error_msg:
             return jsonify({"reply": "I'm currently assisting too many guests! 🌸 Please try again in about a minute."}), 429
        
        return jsonify({"reply": "I'm having a brief brain freeze. Please try asking again."})

@app.route('/', methods=['GET'])
def home():
    return "Lily is Awake! 🌸"

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 API Server running on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)