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

  // --------------------------
  // Stop replying if skipNextReply becomes true
  // --------------------------
  useEffect(() => {
    const activeThread = userSession.activeThread;
    if (activeThread?.skipNextReply) {
      updateUserSession({
        activeThread: { ...activeThread, skipNextReply: false, resolved: true, awaitingResponse: false },
      });
    }
  }, [userSession.activeThread, updateUserSession]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    addChatMessage({
      role: 'user',
      content: userMessage,
    });

    const delay = () =>
      new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));

    setIsTyping(true);
    await delay();
    setIsTyping(false);

    const lowerMessage = userMessage.toLowerCase();
    const activeThread = userSession.activeThread;

    // --------------------------
    // Exit early if skipNextReply was set by useEffect
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
    // Thread-specific logic remains unchanged...
    // --------------------------
    // (error, stuck, happy, general conversation blocks)
    // just leave them as-is

  };

  const handleButtonClick = async (action: string) => {
    const delay = () =>
      new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));

    const activeThread = userSession.activeThread;

    setIsTyping(true);
    await delay();
    setIsTyping(false);

    if (action === 'show_tip') {
      addChatMessage({
        role: 'assistant',
        content: 'Try dragging the screenshot into the step area and click Save — that usually fixes it.',
      });
    } else if (action === 'decline_help') {
      addChatMessage({
        role: 'assistant',
        content: "No problem — I'll be here if you need anything.",
      });
    } else if (action === 'schedule_call') {
      addChatMessage({
        role: 'assistant',
        content: "Awesome — here's our calendar: https://cal.com/andrew-simpson-gvo4qi/30min",
      });
    } else if (action === 'send_tips') {
      addChatMessage({
        role: 'assistant',
        content: "Here are some quick tips:\n\n1. Keep demos under 10 steps\n2. Use clear annotations\n3. Start with your product's \"aha\" moment",
      });
    }

    if (activeThread) {
      updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
    }
  };

  // --------------------------
  // SnippetFloater, chat UI rendering, etc. unchanged
  // --------------------------

}
