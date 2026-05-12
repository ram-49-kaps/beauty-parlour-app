// src/components/ChatWidget.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { MessageCircle, X, Send, Loader2, LogIn, RotateCcw, Volume2, Square, Calendar, Sparkles, Clock, IndianRupee } from 'lucide-react';

// Generate a unique session ID per browser tab
const generateSessionId = () => {
  const stored = sessionStorage.getItem('lily_session_id');
  if (stored) return stored;
  const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  sessionStorage.setItem('lily_session_id', id);
  return id;
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Hello! I am Lily, your AI Concierge. How may I assist you with services, pricing, or bookings today?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [sessionId] = useState(generateSessionId);

  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputText]);

  const [voices, setVoices] = useState([]);
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

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
      utterance.rate = 1.2;
      utterance.pitch = 1.0;

      const preferredVoice = voices.find(v => v.name.includes("Google US English")) ||
        voices.find(v => v.name.includes("Samantha")) ||
        voices.find(v => v.name.includes("Microsoft Zira")) ||
        voices.find(v => v.name.includes("Female")) ||
        voices.find(v => v.lang.startsWith("en-"));

      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = () => setSpeakingIndex(null);

      window.speechSynthesis.speak(utterance);
      setSpeakingIndex(index);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    window.speechSynthesis.cancel();
    setSpeakingIndex(null);
    try {
      await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "reset", sessionId }),
      });

      setMessages([
        {
          text: "Conversation reset. How may I assist you today?",
          isBot: true,
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = useCallback(async (e, textOverride = null) => {
    e?.preventDefault();
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || isLoading) return;

    window.speechSynthesis.cancel();
    setSpeakingIndex(null);

    const userMsg = { text: textToSend, isBot: false, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          isLoggedIn: !!user,
          sessionId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      setMessages(prev => [...prev, { text: data.reply, isBot: true, timestamp: new Date() }]);

    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg = error.name === 'AbortError'
        ? "The request took too long. Please try again."
        : "I apologize, but I am having trouble connecting right now. Please try again.";
      setMessages(prev => [...prev, { text: errorMsg, isBot: true, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, user, sessionId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (text) => {
    const fakeEvent = { preventDefault: () => {} };
    handleSend(fakeEvent, text);
  };

  // Quick reply suggestions shown after first bot message
  const quickReplies = [
    { label: "View Services", icon: Sparkles },
    { label: "Book Appointment", icon: Calendar },
    { label: "Check Availability", icon: Clock },
  ];

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const renderMessageContent = (text) => {
    // Login required
    if (text.includes("||LOGIN_REQUIRED||")) {
      return (
        <div className="flex flex-col gap-3">
          <p>{text.replace("||LOGIN_REQUIRED||", "").trim()}</p>
          <button
            onClick={() => { setIsOpen(false); navigate('/login'); }}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}
          >
            <LogIn size={14} /> Login to Continue
          </button>
        </div>
      );
    }

    // Time slots
    if (text.includes("||SLOTS:")) {
      const parts = text.split("||SLOTS:");
      const messagePart = parts[0];
      const slotsPart = parts[1].split("||")[0];
      const slots = slotsPart.split(',').map(s => s.trim()).filter(s => s);

      return (
        <div className="space-y-3">
          {messagePart && messagePart.split('\n').filter(l => l.trim()).map((line, i) => (
            <p key={i}>{line}</p>
          ))}

          <p className={`text-xs font-medium uppercase tracking-wide mt-2 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
            Select a time slot:
          </p>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {slots.map((slot, idx) => {
              // Format slot for display
              const h = parseInt(slot.split(':')[0]);
              const ampm = h >= 12 ? 'PM' : 'AM';
              const h12 = h > 12 ? h - 12 : h;
              const displaySlot = `${h12}:${slot.split(':')[1]} ${ampm}`;

              return (
                <button
                  key={idx}
                  onClick={() => handleQuickReply(slot)}
                  className={`text-xs px-2 py-2.5 rounded-lg font-medium transition-all duration-200 border ${isDark
                    ? 'bg-stone-800 hover:bg-stone-700 border-white/10 text-white hover:border-white/30'
                    : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-800 hover:border-gray-400'
                  }`}
                >
                  {displaySlot}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Booking ID tag with payment button
    if (text.includes("||ID:")) {
      const cleanText = text.replace(/\|\|ID:\d+\|\|/g, '').replace(/\|\|PAY:\d+:\d+\|\|/g, '').trim();
      const idMatch = text.match(/\|\|ID:(\d+)\|\|/);
      const payMatch = text.match(/\|\|PAY:(\d+):(\d+)\|\|/);
      const bookingId = idMatch ? idMatch[1] : null;
      const payAmount = payMatch ? parseInt(payMatch[2]) : null;
      const advanceAmount = payAmount ? Math.ceil(payAmount / 2) : null;

      return (
        <div className="space-y-3">
          <div className={`p-3 rounded-lg border ${isDark ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
              Booking Created
            </p>
            {bookingId && (
              <p className={`text-sm font-mono ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                Ref: #FBD-{String(bookingId).padStart(4, '0')}
              </p>
            )}
          </div>
          {cleanText.split('\n').filter(l => l.trim()).map((line, i) => (
            <p key={i}>{renderInlineFormatting(line)}</p>
          ))}
          {bookingId && (
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(`/booking?id=${bookingId}`);
              }}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-wide transition-all duration-200 ${isDark
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <IndianRupee size={16} />
              {advanceAmount
                ? `Pay Rs. ${advanceAmount.toLocaleString('en-IN')} Advance Now`
                : 'Complete Payment'}
            </button>
          )}
        </div>
      );
    }

    // Table rendering
    if (text.includes("|") && text.includes("---")) {
      const lines = text.split('\n');
      const tableRows = lines.filter(line => line.trim().startsWith('|'));
      const otherLines = lines.filter(line => !line.trim().startsWith('|') && line.trim() !== '' && !line.trim().match(/^-+$/));

      if (tableRows.length > 2) {
        const headers = tableRows[0].split('|').map(h => h.trim()).filter(h => h && !h.match(/^:?-+:?$/));
        const dataRows = tableRows.slice(2).map(row =>
          row.split('|').map(cell => cell.trim()).filter(cell => cell)
        );

        return (
          <div className="space-y-2">
            {otherLines.map((line, i) => <p key={i}>{renderInlineFormatting(line)}</p>)}
            <div className={`overflow-x-auto rounded-lg border mt-2 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <table className="w-full text-xs text-left">
                <thead className={`font-bold ${isDark ? 'bg-stone-800 text-stone-300' : 'bg-gray-100 text-gray-700'}`}>
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className={`p-2 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                  {dataRows.map((row, i) => (
                    <tr key={i} className={`cursor-pointer transition-colors ${isDark ? 'hover:bg-stone-800' : 'hover:bg-gray-50'}`}
                      onClick={() => {
                        // Click service name to select it
                        if (row[1]) handleQuickReply(row[1]);
                      }}
                    >
                      {row.map((cell, j) => (
                        <td key={j} className="p-2">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`text-[10px] mt-1 ${isDark ? 'text-stone-500' : 'text-gray-400'}`}>
              Tap a service to select it
            </p>
          </div>
        );
      }
    }

    // Default text rendering with line breaks
    return text.split('\n').filter(l => l.trim()).map((line, i) => (
      <p key={i} className="mb-1 last:mb-0 min-h-[1em]">
        {renderInlineFormatting(line)}
      </p>
    ));
  };

  const renderInlineFormatting = (line) => {
    // Handle bold, links
    const parts = line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
    return parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{part.slice(2, -2)}</strong>;
      }
      // Markdown link
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        return (
          <a key={j} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
            className={`underline ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans flex flex-col items-end">

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className={`mb-2 w-[92vw] max-w-[420px] h-[75vh] max-h-[650px] border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out] ${isDark ? 'bg-stone-950 border-white/10' : 'bg-white border-gray-200'}`}>

          {/* Header */}
          <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'bg-stone-900 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full border overflow-hidden shadow-sm ${isDark ? 'border-white/10 bg-stone-800' : 'border-gray-200 bg-white'}`}>
                <img src="/Gallery/logo.jpg?v=3" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className={`text-sm font-bold tracking-widest uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>Lily</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <p className="text-gray-400 text-[10px] uppercase tracking-widest">Online</p>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleRefresh}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-stone-400 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                title="Reset Conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-stone-400 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar ${isDark ? 'bg-stone-950' : 'bg-gray-50/50'}`}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[88%] ${msg.isBot
                  ? 'bg-transparent pl-0'
                  : isDark
                    ? 'bg-white/10 px-4 py-3 rounded-2xl rounded-tr-sm text-white'
                    : 'bg-gray-900 px-4 py-3 rounded-2xl rounded-tr-sm text-white'
                }`}>

                  {msg.isBot && (
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">Lily</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-500">{formatTime(msg.timestamp)}</span>
                        <button
                          onClick={() => handleSpeak(msg.text, idx)}
                          className={`p-1 transition-colors ml-1 ${isDark ? 'text-stone-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                          title={speakingIndex === idx ? "Stop Reading" : "Read Aloud"}
                        >
                          {speakingIndex === idx ? <Square size={10} fill="currentColor" /> : <Volume2 size={12} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {!msg.isBot && (
                    <div className="flex justify-end mb-0.5">
                      <span className="text-[9px] text-white/50">{formatTime(msg.timestamp)}</span>
                    </div>
                  )}

                  <div className={`text-sm leading-relaxed ${msg.isBot ? (isDark ? 'text-stone-300' : 'text-gray-600') : 'text-white'}`}>
                    {renderMessageContent(msg.text)}
                  </div>
                </div>
              </div>
            ))}

            {/* Quick replies after first message if no user messages yet */}
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-wrap gap-2 pt-2">
                {quickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickReply(qr.label === "View Services" ? "Show me all services" : qr.label === "Book Appointment" ? "I want to book an appointment" : "Check availability for tomorrow")}
                    className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-full transition-all duration-200 border ${isDark
                      ? 'bg-stone-800 hover:bg-stone-700 border-white/10 text-stone-300 hover:text-white'
                      : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <qr.icon size={12} />
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className={`px-4 py-3 rounded-2xl rounded-tl-none border ${isDark ? 'bg-stone-800 border-white/10' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-stone-400' : 'bg-gray-400'}`} style={{ animationDelay: '0ms' }}></div>
                    <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-stone-400' : 'bg-gray-400'}`} style={{ animationDelay: '150ms' }}></div>
                    <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-stone-400' : 'bg-gray-400'}`} style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={`p-3 border-t ${isDark ? 'bg-stone-900 border-white/10' : 'bg-white border-gray-200'}`}>
            <div className={`relative flex items-end gap-2 border rounded-xl p-2 transition-colors ${isDark ? 'bg-stone-800 border-white/10 focus-within:border-white/30' : 'bg-gray-50 border-gray-200 focus-within:border-gray-400'}`}>
              <textarea
                ref={textareaRef}
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className={`flex-1 bg-transparent text-sm px-3 py-2 max-h-32 focus:outline-none resize-none placeholder:text-gray-400 custom-scrollbar ${isDark ? 'text-white' : 'text-gray-900'}`}
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !inputText.trim()}
                className={`p-2.5 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed mb-0.5 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[9px] text-gray-400 uppercase tracking-widest">Powered by Flawless Engine</span>
            </div>
          </div>

        </div>
      )}

      {/* FLOATING BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center gap-3 pl-5 pr-6 h-14 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:scale-105 transition-all duration-300 z-50 bg-black text-white border border-gray-700"
        >
          <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isDark ? 'bg-white/20' : 'bg-gray-700/20'}`}></div>
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
