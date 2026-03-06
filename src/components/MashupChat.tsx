import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Music, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface MashupChatProps {
  onSendMessage: (text: string) => Promise<void>;
  isProcessing: boolean;
  messages: Message[];
}

export function MashupChat({ onSendMessage, isProcessing, messages }: MashupChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-orbitron text-sm">AI Mashup Assistant</h3>
            <p className="text-xs text-gray-400">Ask me to create a vibe...</p>
          </div>
        </div>
        <Sparkles size={16} className="text-pink-400 animate-pulse" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10 space-y-2">
            <Music size={40} className="mx-auto opacity-50" />
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs">Try: "Make a 10 min slowed reverb mix with Arijit Singh songs"</p>
          </div>
        )}
        
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-pink-600 text-white rounded-tr-none'
                    : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <span className="text-[10px] opacity-50 mt-1 block">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-3 border border-white/5 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-pink-400" />
              <span className="text-xs text-gray-400">Thinking...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your instructions..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors font-rajdhani"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-full transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
