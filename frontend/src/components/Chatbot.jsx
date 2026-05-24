import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, User, Bot, RefreshCw } from 'lucide-react';
import { aiAPI } from '../api';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('obe_chat_history');
    return saved ? JSON.parse(saved) : [
      {
        role: 'assistant',
        content: 'Hello! I am your MIT AOE AI Assistant. Ask me anything about outcome-based education, syllabus alignment, course outcomes, or student attainment calculations.'
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Quick prompt suggestion chips
  const suggestions = [
    "What is Bloom's Taxonomy?",
    "How to map CO to PO?",
    "Explain Direct Attainment",
    "Identify Curriculum Gaps"
  ];

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('obe_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    if (!textToSend) {
      setInput('');
    }

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Map frontend messages role formats to what backend expects if necessary, 
      // but backend expects list of dict: req.history is List[dict] with role and content.
      const historyForBackend = newMessages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const res = await aiAPI.chat(text, historyForBackend);
      if (res.data && res.data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an empty response.' }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Oops! I failed to connect to the AI engine. Please ensure the backend server is running.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Clear conversation history?")) {
      const reset = [
        {
          role: 'assistant',
          content: 'Hello! I am your MIT AOE AI Assistant. Ask me anything about outcome-based education, syllabus alignment, course outcomes, or student attainment calculations.'
        }
      ];
      setMessages(reset);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 transition-all duration-300 hover:scale-110 active:scale-95 group focus:outline-none"
        >
          {/* Animated pulse ring */}
          <span className="absolute -inset-1 rounded-full bg-blue-500/25 animate-ping opacity-75 group-hover:opacity-100 duration-1000" />
          <MessageSquare className="w-6 h-6 relative z-10" />
          
          {/* Unread badge/dot */}
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full animate-bounce" />
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fadeIn">
          {/* Header Panel */}
          <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-100" />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight">MIT AOE AI Assistant</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-blue-100 font-semibold uppercase">OBE Sandbox Expert</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleClearChat}
                className="p-1 rounded-md hover:bg-white/10 text-blue-100 hover:text-white transition-colors text-[10px] font-bold"
                title="Reset Chat"
              >
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-blue-100 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scrollbox */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div key={index} className={`flex gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs ${
                    isUser 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-slate-400'
                  }`}>
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    isUser 
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/10' 
                      : 'bg-white dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })}

            {/* AI Loading/Typing State */}
            {loading && (
              <div className="flex gap-2.5 max-w-[85%]">
                <div className="w-7 h-7 rounded-full shrink-0 bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-slate-400 flex items-center justify-center">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-3 bg-white dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 rounded-2xl rounded-tl-none text-xs text-slate-400 flex items-center gap-1.5 shadow-sm">
                  <span>Generating answer...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          {messages.length === 1 && !loading && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/10">
              <p className="text-[10px] font-bold text-slate-450 uppercase mb-1.5">Try asking:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900 rounded-lg text-slate-600 dark:text-slate-350 transition-colors font-medium cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Panel */}
          <div className="p-3.5 border-t border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex gap-2">
            <input
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-850 dark:text-slate-100 placeholder-slate-450 transition-all"
            />
            
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/10 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
