import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Smile } from 'lucide-react';
import { useApp } from '@/context/AppContext';
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
  } = useApp();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --------------------------
  // Scroll to bottom on new messages or typing
  // --------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // --------------------------
  // Autofocus input when chat opens
  // --------------------------
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isChatOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    addChatMessage({
      role: 'user',
      content: userMessage,
    });

    const delay = () => new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));

    setIsTyping(true);
    await delay();
    setIsTyping(false);

    const lowerMessage = userMessage.toLowerCase();
    const activeThread = userSession.activeThread;

    // --------------------------
    // Minimal fix: skip reply if skipNextReply is true
    // --------------------------
    if (activeThread?.skipNextReply) {
      updateUserSession({
        activeThread: {
          ...activeThread,
          skipNextReply: false,
          resolved: true,
          awaitingResponse: false,
        },
      });
      return; // Exit early, do not reply
    }

    // --------------------------
    // Exit early if thread already resolved
    // --------------------------
    if (activeThread?.resolved && !activeThread.awaitingResponse) return;

    // --------------------------
    // Salesforce-specific message (global)
    // --------------------------
    if (lowerMessage.includes('salesforce')) {
      addChatMessage({
        role: 'assistant',
        content:
          "Hi Alex, I'm Lee!\n\nIt looks like you ran into an error while connecting Salesforce. Sorry about that!",
      });
      await delay();
      addChatMessage({
        role: 'assistant',
        content: "We're aware of the issue and our team is working on it.",
      });

      if (activeThread) {
        updateUserSession({
          activeThread: { ...activeThread, resolved: true, awaitingResponse: false },
        });
      }
      return;
    }

    // --------------------------
    // Thread-specific logic (error, stuck, happy, general conversation)
    // --------------------------
    // Keep your existing blocks here exactly as they were

    if (activeThread?.type === 'error' && activeThread.awaitingResponse) {
      if (lowerMessage.includes('work') || lowerMessage.includes('success') || lowerMessage.includes('fixed')) {
        addChatMessage({ role: 'assistant', content: 'Great! Let me know if you need anything else.' });
      } else if (lowerMessage.includes('fail') || lowerMessage.includes('again') || lowerMessage.includes('still')) {
        addChatMessage({ role: 'assistant', content: "Got it — I'll get someone from our team to help troubleshoot." });
      } else {
        addChatMessage({ role: 'assistant', content: 'Did connecting it work this time?' });
      }
      if (activeThread) updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
      return;
    }

    if (activeThread?.type === 'stuck' && activeThread.awaitingResponse) {
      if (lowerMessage.includes('yes') || lowerMessage.includes('help') || lowerMessage.includes('tip') || lowerMessage.includes('sure')) {
        addChatMessage({ role: 'assistant', content: 'Try dragging the screenshot into the step area and click Save — that usually fixes it.' });
      } else if (lowerMessage.includes('no') || lowerMessage.includes('good') || lowerMessage.includes('fine')) {
        addChatMessage({ role: 'assistant', content: "No problem — I'll be here if you need anything." });
      } else {
        addChatMessage({ role: 'assistant', content: 'Would you like a quick tip to help?' });
      }
      if (activeThread) updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
      return;
    }

    if (activeThread?.type === 'happy' && activeThread.awaitingResponse) {
      if (lowerMessage.includes('call') || lowerMessage.includes('schedule') || lowerMessage.includes('yes')) {
        addChatMessage({ role: 'assistant', content: "Awesome — here's our calendar: https://cal.com/andrew-simpson-gvo4qi/30min" });
      } else if (lowerMessage.includes('tip') || lowerMessage.includes('best')) {
        addChatMessage({ role: 'assistant', content: "Here are some quick tips:\n\n1. Keep demos under 10 steps\n2. Use clear annotations\n3. Start with your product's \"aha\" moment" });
      } else {
        addChatMessage({ role: 'assistant', content: 'Would you like to schedule a call or get some tips?' });
      }
      if (activeThread) updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
      return;
    }

    // --------------------------
    // General conversation
    // --------------------------
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

  const handleButtonClick = async (action: string) => {
    const delay = () => new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));
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

    if (activeThread) updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
  };

  // --------------------------
  // SnippetFloater and chat UI rendering remain unchanged
  // --------------------------
}
