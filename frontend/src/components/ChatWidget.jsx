// src/components/ChatWidget.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config'; // Import Config
import { MessageCircle, X, Send, Loader2, LogIn, RotateCcw, Volume2, Square } from 'lucide-react';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hello. I am Lily, your AI Concierge. How may I assist you with services, pricing, or bookings today?", isBot: true }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null); // Track which message is speaking

  const { user } = useAuth();
  const navigate = useNavigate();

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputText]);

  // Load voices on mount
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Clean up speech on unmount
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // 🗣️ TEXT TO SPEECH HANDLER (Improved)
  const handleSpeak = (text, index) => {
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
    } else {
      window.speechSynthesis.cancel();

      let cleanText = text
        .replace(/\|\|.*?\|\|/g, '')
        .replace(/\|/g, '')
        .replace(/\*\*/g, '')
        .replace(/---/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // ⚡ FASTER SPEED: 1.0 is too slow, 1.2 is natural
      utterance.rate = 1.2;
      utterance.pitch = 1.0; // Natural female pitch

      // 👩 FORCE FEMALE VOICE selection strategy
      const preferredVoice = voices.find(v => v.name.includes("Google US English")) || // Best on Chrome
        voices.find(v => v.name.includes("Samantha")) ||          // Best on Mac
        voices.find(v => v.name.includes("Microsoft Zira")) ||    // Best on Windows
        voices.find(v => v.name.includes("Female")) ||            // Generic Female
        voices.find(v => v.lang.startsWith("en-"));               // Fallback English

      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);

      window.speechSynthesis.speak(utterance);
      setSpeakingIndex(index);
    }
  };

  // 🔄 REFRESH CHAT FUNCTION
  const handleRefresh = async () => {
    setIsLoading(true);
    window.speechSynthesis.cancel(); // Stop speech on refresh
    setSpeakingIndex(null);
    try {
      // 1. Tell Backend to Clear Memory
      await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "reset" }),
      });

      // 2. Reset Frontend UI
      setMessages([
        { text: "Hello. I am Lily, your AI Concierge. How may I assist you with services, pricing, or bookings today?", isBot: true }
      ]);

    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e, textOverride = null) => {
    e?.preventDefault();
    const textToSend = textOverride || inputText;
    if (!textToSend.trim()) return;

    window.speechSynthesis.cancel(); // Stop speech on new message
    setSpeakingIndex(null);

    // 1. Add User Message immediately
    const userMsg = { text: textToSend, isBot: false };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          isLoggedIn: !!user // 🟢 Send Login Status
        }),
      });

      const data = await response.json();

      // 3. Add AI Response
      setMessages(prev => [...prev, { text: data.reply, isBot: true }]);

    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { text: "I apologize, but I am having trouble connecting to the system right now.", isBot: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 🧱 Helper to Render Markdown Tables or Text
  const renderMessageContent = (text) => {
    // 1. Check for Login Wall
    if (text.includes("||LOGIN_REQUIRED||")) {
      return (
        <div className="flex flex-col gap-3">
          <p>{text.replace("||LOGIN_REQUIRED||", "")}</p>
          <button
            onClick={() => { setIsOpen(false); navigate('/login'); }}
            className="flex items-center justify-center gap-2 bg-stone-900 hover:bg-black text-white py-2 px-4 rounded border border-stone-700 text-xs font-bold uppercase transition-colors"
          >
            <LogIn size={14} /> Login to Continue
          </button>
        </div>
      );
    }

    // 2A. Check for Time Slots (||SLOTS: 10:00, 11:00||)
    if (text.includes("||SLOTS:")) {
      const parts = text.split("||SLOTS:");
      const messagePart = parts[0];
      const slotsPart = parts[1].split("||")[0];
      const slots = slotsPart.split(',').map(s => s.trim()).filter(s => s);

      return (
        <div className="space-y-3">
          {messagePart && messagePart.split('\n').map((line, i) => <p key={i}>{line}</p>)}

          <div className="flex flex-wrap gap-2 mt-2">
            {slots.map((slot, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(slot);
                  setTimeout(() => {
                    const fakeEvent = { preventDefault: () => { } };
                    handleSend(fakeEvent, slot);
                  }, 0);
                }}
                className="bg-stone-700 hover:bg-stone-600 border border-stone-600 text-white text-xs px-3 py-2 rounded-lg transition-colors"
                title={`Select ${slot}`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 2B. Check for Markdown Table (simple detection: starts with |)
    if (text.includes("|") && text.includes("---")) {
      const lines = text.split('\n');
      const tableRows = lines.filter(line => line.trim().startsWith('|'));
      const otherLines = lines.filter(line => !line.trim().startsWith('|') && line.trim() !== '');

      if (tableRows.length > 2) {
        // Parse Header
        const headers = tableRows[0].split('|').map(h => h.trim()).filter(h => h);
        // Skip separator line (tableRows[1])
        const rows = tableRows.slice(2).map(row =>
          row.split('|').map(cell => cell.trim()).filter(cell => cell)
        );

        return (
          <div className="space-y-2">
            {otherLines.map((line, i) => <p key={i}>{line}</p>)}
            <div className="overflow-x-auto rounded border border-stone-300/20 mt-2">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-900/10 font-bold text-stone-300">
                  <tr>
                    {headers.map((h, i) => <th key={i} className="p-2 border-b border-stone-300/10">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300/10">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      {row.map((cell, j) => <td key={j} className="p-2">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
    }

    // 3. Default Text Rendering (with Bold parsing)
    return text.split('\n').map((line, i) => {
      // Split by bold pattern **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="mb-1 last:mb-0 min-h-[1em]">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-bold text-white">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans flex flex-col items-end">

      {/* 🟢 CHAT WINDOW */}
      {isOpen && (
        <div className="mb-2 w-[90vw] max-w-[400px] h-[70vh] max-h-[600px] bg-stone-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out]">

          {/* Header */}
          <div className="bg-stone-950 p-4 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-stone-700 overflow-hidden bg-white">
                <img src="/Gallery/logo.jpg?v=3" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold tracking-widest uppercase">Lily</h3>
                <p className="text-stone-500 text-[10px] uppercase tracking-widest">Your Beauty Assistant</p>
              </div>
            </div>
            {/* Header Actions */}
            <div className="flex gap-1">
              <button
                onClick={handleRefresh}
                className="p-2 text-stone-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Reset Conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-stone-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[90%] ${msg.isBot ? 'bg-transparent pl-0' : 'bg-stone-800 px-4 py-3 rounded-2xl rounded-tr-sm text-white'}`}>

                  {msg.isBot && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-stone-500 uppercase tracking-widest">Lily</span>
                      {/* 🔊 SPEAKER BUTTON */}
                      <button
                        onClick={() => handleSpeak(msg.text, idx)}
                        className="p-1 text-stone-500 hover:text-white transition-colors ml-2"
                        title={speakingIndex === idx ? "Stop Reading" : "Read Aloud"}
                      >
                        {speakingIndex === idx ? <Square size={10} fill="currentColor" /> : <Volume2 size={12} />}
                      </button>
                    </div>
                  )}

                  <div className={`text-sm leading-relaxed ${msg.isBot ? 'text-stone-300' : 'text-white'}`}>
                    {renderMessageContent(msg.text)}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-stone-800 p-3 rounded-2xl rounded-tl-none border border-white/5">
                  <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-stone-900 border-t border-stone-800">
            <div className="relative flex items-end gap-2 bg-black border border-stone-800 rounded-xl p-2 focus-within:border-stone-600 transition-colors">
              <textarea
                ref={textareaRef}
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="flex-1 bg-transparent text-white text-sm px-3 py-2 max-h-32 focus:outline-none resize-none placeholder:text-stone-700 custom-scrollbar"
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !inputText.trim()}
                className="p-2 bg-white text-black rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-0.5"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[9px] text-stone-600 uppercase tracking-widest">Powered by Flawless Engine</span>
            </div>
          </div>

        </div>
      )}

      {/* 🔴 FLOATING BUTTON (Open) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center gap-3 bg-stone-950 text-white pl-5 pr-6 h-14 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:scale-105 transition-all duration-300 z-50 border border-white/10"
        >
          {/* Subtle Ripple/Pulse behind */}
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20"></div>

          <MessageCircle className="w-5 h-5" />
          <span className="font-bold text-sm tracking-widest uppercase">Ask Lily</span>
        </button>
      )}

      {/* Animations */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ChatWidget;