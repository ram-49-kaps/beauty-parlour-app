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
from langchain.agents import initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import HumanMessage, AIMessage

# ... [keep everything else until agent setup] ...

# ═══════════════════════════════════════════════════════════════
# 5️⃣ AGENT SETUP
# ═══════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are the professional and polite AI receptionist for Flawless by Drashti, a premium beauty studio in Surat.

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
"""

# ✅ Initialize Memory
memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

# ✅ Initialize Agent (Legacy but Stable Method)
agent_executor = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True,
    handle_parsing_errors=True,
    memory=memory,
    agent_kwargs={
        "prefix": SYSTEM_PROMPT + "\n\n" # Inject system prompt into the agent's prompt
    }
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
        chat_history = []
        return jsonify({"reply": "I'm having a brief brain freeze. Please try asking again."})

if __name__ == "__main__":
    print("🚀 API Server running on http://localhost:8000")
    app.run(port=8000, debug=True)
