import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Smile } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { ChatMessage } from '@/types/demo';

export function ChatWidget() {
  const { chatMessages, addChatMessage } = useAppContext();
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input };
    addChatMessage(msg);
    setInput('');

    // simulate typing
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 500));

    const lowerMessage = input.toLowerCase();

    if (lowerMessage.includes('salesforce')) {
      // Salesforce: acknowledge without error
      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Hi Alex, I'm Lee!\n\nYou can connect Salesforce to track your demo views."
      });
    } else if (lowerMessage.includes('hubspot') || lowerMessage.includes('google analytics')) {
      // snippet error example
      addChatMessage({
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "It seems there was an OAuth error. Please try connecting again."
      });
    } else {
      addChatMessage({
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: "I'm here to help! Can you give me more details?"
      });
    }

    setIsTyping(false);
  };

  return (
    <div className="fixed bottom-4 right-4 w-80">
      <div className="flex justify-between items-center bg-primary/90 p-2 rounded-t-lg text-white cursor-pointer" onClick={() => setIsOpen(o => !o)}>
        <span>Lee Chat</span>
        <X className="h-4 w-4" />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-white rounded-b-lg shadow-lg overflow-hidden">
            <div className="p-2 max-h-96 overflow-y-auto">
              {chatMessages.map(m => (
                <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                  <div className={`inline-block px-3 py-1 rounded-lg my-1 ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-black'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="text-left">
                  <div className="inline-block px-3 py-1 rounded-lg my-1 bg-gray-100 text-black">Lee is typing...</div>
                </div>
              )}
            </div>
            <div className="flex p-2 border-t">
              <input
                className="flex-1 border rounded px-2 py-1 mr-2"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              />
              <button onClick={handleSend} className="bg-primary text-white px-3 py-1 rounded"><Send className="h-4 w-4 inline" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
