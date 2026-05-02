// src/components/ChatWidget.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { MessageCircle, X, Send, Loader2, LogIn, RotateCcw, Volume2, Square } from 'lucide-react';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hello. I am Lily, your AI Concierge. How may I assist you with services, pricing, or bookings today?", isBot: true }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);

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
        body: JSON.stringify({ message: "reset" }),
      });

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

    window.speechSynthesis.cancel();
    setSpeakingIndex(null);

    const userMsg = { text: textToSend, isBot: false };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          isLoggedIn: !!user
        }),
      });

      const data = await response.json();
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

  const renderMessageContent = (text) => {
    if (text.includes("||LOGIN_REQUIRED||")) {
      return (
        <div className="flex flex-col gap-3">
          <p>{text.replace("||LOGIN_REQUIRED||", "")}</p>
          <button
            onClick={() => { setIsOpen(false); navigate('/login'); }}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded border text-xs font-bold uppercase transition-colors ${isDark ? 'bg-white text-black hover:bg-gray-200 border-gray-200' : 'bg-gray-900 hover:bg-gray-800 text-white border-gray-700'}`}
          >
            <LogIn size={14} /> Login to Continue
          </button>
        </div>
      );
    }

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
                className={`text-xs px-3 py-2 rounded-lg transition-colors ${isDark ? 'bg-stone-700 hover:bg-stone-600 border border-white/10 text-white' : 'bg-gray-200 hover:bg-gray-300 border border-gray-300 text-gray-800'}`}
                title={`Select ${slot}`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (text.includes("|") && text.includes("---")) {
      const lines = text.split('\n');
      const tableRows = lines.filter(line => line.trim().startsWith('|'));
      const otherLines = lines.filter(line => !line.trim().startsWith('|') && line.trim() !== '');

      if (tableRows.length > 2) {
        const headers = tableRows[0].split('|').map(h => h.trim()).filter(h => h);
        const rows = tableRows.slice(2).map(row =>
          row.split('|').map(cell => cell.trim()).filter(cell => cell)
        );

        return (
          <div className="space-y-2">
            {otherLines.map((line, i) => <p key={i}>{line}</p>)}
            <div className={`overflow-x-auto rounded border mt-2 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <table className="w-full text-xs text-left">
                <thead className={`font-bold ${isDark ? 'bg-stone-800 text-stone-300' : 'bg-gray-100 text-gray-700'}`}>
                  <tr>
                    {headers.map((h, i) => <th key={i} className="p-2 border-b border-gray-200">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row, i) => (
                    <tr key={i} className={isDark ? 'hover:bg-stone-800' : 'hover:bg-gray-50'}>
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

    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="mb-1 last:mb-0 min-h-[1em]">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans flex flex-col items-end">

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className={`mb-2 w-[90vw] max-w-[400px] h-[70vh] max-h-[600px] border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out] ${isDark ? 'bg-stone-950 border-white/10' : 'bg-white border-gray-200'}`}>

          {/* Header */}
          <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'bg-stone-900 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full border overflow-hidden shadow-sm ${isDark ? 'border-white/10 bg-stone-800' : 'border-gray-200 bg-white'}`}>
                <img src="/Gallery/logo.jpg?v=3" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className={`text-sm font-bold tracking-widest uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>Lily</h3>
                <p className="text-gray-400 text-[10px] uppercase tracking-widest">Your Beauty Assistant</p>
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
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar ${isDark ? 'bg-stone-950' : 'bg-gray-50/50'}`}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[90%] ${msg.isBot ? 'bg-transparent pl-0' : isDark ? 'bg-white/10 px-4 py-3 rounded-2xl rounded-tr-sm text-white' : 'bg-gray-900 px-4 py-3 rounded-2xl rounded-tr-sm text-white'}`}>

                  {msg.isBot && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">Lily</span>
                      <button
                        onClick={() => handleSpeak(msg.text, idx)}
                        className={`p-1 transition-colors ml-2 ${isDark ? 'text-stone-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                        title={speakingIndex === idx ? "Stop Reading" : "Read Aloud"}
                      >
                        {speakingIndex === idx ? <Square size={10} fill="currentColor" /> : <Volume2 size={12} />}
                      </button>
                    </div>
                  )}

                  <div className={`text-sm leading-relaxed ${msg.isBot ? (isDark ? 'text-stone-300' : 'text-gray-600') : 'text-white'}`}>
                    {renderMessageContent(msg.text)}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className={`p-3 rounded-2xl rounded-tl-none border ${isDark ? 'bg-stone-800 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                  <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={`p-4 border-t ${isDark ? 'bg-stone-900 border-white/10' : 'bg-white border-gray-200'}`}>
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
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-0.5 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
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

      {/* FLOATING BUTTON (Open) */}
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