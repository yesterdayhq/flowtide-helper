import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Smile } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function ChatWidget() {
  const {
    chatMessages,
    addChatMessage,
    isTyping,
    setIsTyping,
    isChatOpen,
    setIsChatOpen,
    userSession,
    updateUserSession,
    showSnippet,
    snippetMessage,
    clearSnippet,
  } = useAppContext();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isChatOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    addChatMessage({ role: 'user', content: userMessage });

    const delay = () => new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));

    setIsTyping(true);
    await delay();
    setIsTyping(false);

    const lowerMessage = userMessage.toLowerCase();
    const activeThread = userSession.activeThread;

    // Salesforce-specific response
    if (lowerMessage.includes('salesforce')) {
      addChatMessage({ role: 'assistant', content: "Hi Alex, I'm Lee!\n\nIt looks like you ran into an error while connecting Salesforce. Sorry about that!" });
      await delay();
      addChatMessage({ role: 'assistant', content: "We're aware of the issue and our team is working on it." });

      if (activeThread) {
        updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
      }
      return;
    }

    // Thread-specific handling omitted for brevity (preserve original logic)
    // General conversation
    if (lowerMessage.includes('error') || lowerMessage.includes('broken')) {
      addChatMessage({ role: 'assistant', content: "Can you tell me what error you see or which page you're on?" });
    } else if (lowerMessage.includes('call') || lowerMessage.includes('schedule')) {
      addChatMessage({ role: 'assistant', content: "Here's our calendar: https://cal.com/andrew-simpson-gvo4qi/30min" });
    } else if (lowerMessage.includes('tip') || lowerMessage.includes('help')) {
      addChatMessage({ role: 'assistant', content: "I'm here to help — which step are you on?" });
    } else {
      addChatMessage({ role: 'assistant', content: "I'm here to help with your demo — which step are you on?" });
    }
  };

  // Button handler (show_tip, decline_help, schedule_call, send_tips)
  const handleButtonClick = async (action: string) => {
    const delay = () => new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
    const activeThread = userSession.activeThread;

    setIsTyping(true);
    await delay();
    setIsTyping(false);

    if (action === 'show_tip') {
      addChatMessage({ role: 'assistant', content: 'Try dragging the screenshot into the step area and click Save — that usually fixes it.' });
    } else if (action === 'decline_help') {
      addChatMessage({ role: 'assistant', content: "No problem — I'll be here if you need anything." });
    } else if (action === 'schedule_call') {
      addChatMessage({ role: 'assistant', content: "Awesome — here's our calendar: https://cal.com/andrew-simpson-gvo4qi/30min" });
    } else if (action === 'send_tips') {
      addChatMessage({ role: 'assistant', content: "Here are some quick tips:\n\n1. Keep demos under 10 steps\n2. Use clear annotations\n3. Start with your product's \"aha\" moment" });
    }

    if (activeThread) {
      updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
    }
  };

  // Snippet floater
  const SnippetFloater = () => {
    if (!showSnippet || !snippetMessage) return null;
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.3 }}
        className="fixed bottom-20 right-6 z-50 max-w-xs rounded-lg bg-white px-4 py-3 text-sm text-black shadow-lg"
      >
        {snippetMessage}
        <button onClick={clearSnippet} className="ml-2 text-xs font-bold underline">✕</button>
      </motion.div>
    );
  };

  return (
    <>
      <AnimatePresence><SnippetFloater /></AnimatePresence>

      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-accent text-accent-foreground shadow-lg shadow-accent/25 transition-shadow hover:shadow-xl hover:shadow-accent/30"
          >
            <MessageCircle className="h-6 w-6" />
            {chatMessages.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {chatMessages.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {isChatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[350px] flex-col rounded-lg border bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="font-bold text-black">Lee</span>
            <button onClick={() => setIsChatOpen(false)}><X className="h-5 w-5 text-gray-500" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {chatMessages.map(msg => (
              <div key={msg.id} className={cn("mb-2 rounded-lg px-2 py-1", msg.role === 'assistant' ? "bg-gray-200 text-black self-start" : "bg-blue-500 text-white self-end")}>
                {msg.content}
              </div>
            ))}
            {isTyping && <div className="text-gray-500">Lee is typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t px-4 py-2">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              />
              <Button onClick={handleSend}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
