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
  // Clear skipNextReply if set
  // --------------------------
  useEffect(() => {
    const activeThread = userSession.activeThread;
    if (activeThread?.skipNextReply) {
      updateUserSession({
        activeThread: {
          ...activeThread,
          skipNextReply: false,
          resolved: true,
          awaitingResponse: false,
        },
      });
    }
  }, [userSession.activeThread, updateUserSession]);

  // --------------------------
  // Handle user sending a message
  // --------------------------
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
    // EXIT EARLY IF THREAD RESOLVED / FIXED
    // --------------------------
    if (activeThread?.resolved || activeThread?.skipNextReply) {
      return;
    }

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
          activeThread: {
            ...activeThread,
            resolved: true,
            awaitingResponse: false,
          },
        });
      }
      return;
    }

    // --------------------------
    // Thread-specific logic
    // --------------------------
    if (activeThread?.type === 'error' && activeThread.awaitingResponse) {
      if (lowerMessage.includes('work') || lowerMessage.includes('success') || lowerMessage.includes('fixed')) {
        addChatMessage({
          role: 'assistant',
          content: 'Great! Let me know if you need anything else.',
        });
        // MARK THREAD RESOLVED
        if (activeThread) {
          updateUserSession({
            activeThread: { ...activeThread, resolved: true, awaitingResponse: false },
          });
        }
        return;
      } else if (lowerMessage.includes('fail') || lowerMessage.includes('again') || lowerMessage.includes('still')) {
        addChatMessage({
          role: 'assistant',
          content: "Got it — I'll get someone from our team to help troubleshoot.",
        });
      } else {
        addChatMessage({
          role: 'assistant',
          content: 'Did connecting it work this time?',
        });
      }
      if (activeThread) {
        updateUserSession({ activeThread: { ...activeThread, awaitingResponse: true } });
      }
      return;
    }

    if (activeThread?.type === 'stuck' && activeThread.awaitingResponse) {
      if (lowerMessage.includes('yes') || lowerMessage.includes('help') || lowerMessage.includes('tip') || lowerMessage.includes('sure')) {
        addChatMessage({
          role: 'assistant',
          content: 'Try dragging the screenshot into the step area and click Save — that usually fixes it.',
        });
      } else if (lowerMessage.includes('no') || lowerMessage.includes('good') || lowerMessage.includes('fine')) {
        addChatMessage({
          role: 'assistant',
          content: "No problem — I'll be here if you need anything.",
        });
      } else {
        addChatMessage({
          role: 'assistant',
          content: 'Would you like a quick tip to help?',
        });
      }
      if (activeThread) {
        updateUserSession({ activeThread: { ...activeThread, awaitingResponse: true } });
      }
      return;
    }

    if (activeThread?.type === 'happy' && activeThread.awaitingResponse) {
      if (lowerMessage.includes('call') || lowerMessage.includes('schedule') || lowerMessage.includes('yes')) {
        addChatMessage({
          role: 'assistant',
          content: "Awesome — here's our calendar: https://cal.com/andrew-simpson-gvo4qi/30min",
        });
      } else if (lowerMessage.includes('tip') || lowerMessage.includes('best')) {
        addChatMessage({
          role: 'assistant',
          content: "Here are some quick tips:\n\n1. Keep demos under 10 steps\n2. Use clear annotations\n3. Start with your product's \"aha\" moment",
        });
      } else {
        addChatMessage({
          role: 'assistant',
          content: 'Would you like to schedule a call or get some tips?',
        });
      }
      if (activeThread) {
        updateUserSession({ activeThread: { ...activeThread, awaitingResponse: true } });
      }
      return;
    }

    // --------------------------
    // General conversation
    // --------------------------
    if (lowerMessage.includes('error') || lowerMessage.includes('broken')) {
      addChatMessage({
        role: 'assistant',
        content: "Can you tell me what error you see or which page you're on?",
      });
    } else if (lowerMessage.includes('call') || lowerMessage.includes('schedule')) {
      addChatMessage({
        role: 'assistant',
        content: "Here's our calendar: https://cal.com/andrew-simpson-gvo4qi/30min",
      });
    } else if (lowerMessage.includes('tip') || lowerMessage.includes('help')) {
      addChatMessage({
        role: 'assistant',
        content: "I'm here to help — which step are you on?",
      });
    } else {
      addChatMessage({
        role: 'assistant',
        content: "I'm here to help with your demo — which step are you on?",
      });
    }
  };

  // --------------------------
  // Button click handler
  // --------------------------
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
  // SnippetFloater & Chat UI rendering (unchanged)
  // --------------------------
  const SnippetFloater = () => {
    if (!showSnippet || !snippetMessage) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-20 right-6 z-50 max-w-xs rounded-lg bg-white px-4 py-3 text-sm text-black shadow-lg"
      >
        {snippetMessage}
        <button
          onClick={clearSnippet}
          className="ml-2 text-xs font-bold underline"
        >
          ✕
        </button>
      </motion.div>
    );
  };

  return (
    <>
      <AnimatePresence>
        <SnippetFloater />
      </AnimatePresence>

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
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {chatMessages.filter((m) => m.role === 'assistant').length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-chat-bg shadow-chat"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between border-b bg-gradient-accent px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-foreground/20">
                  <Smile className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-accent-foreground">Lee</h3>
                  <p className="text-xs text-accent-foreground/80">
                    Junior AE at Flowtide
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsChatOpen(false)}
                className="text-accent-foreground hover:bg-accent-foreground/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-center text-sm text-muted-foreground">
                    Hey! I'm Lee, here to help you create awesome demos. 👋
                  </p>
                </div>
              )}

              {chatMessages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5',
                      message.role === 'user'
                        ? 'bg-chat-user text-primary-foreground rounded-br-md'
                        : 'bg-chat-assistant text-foreground rounded-bl-md'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {message.buttons && message.buttons.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.buttons.map((button) => (
                          <Button
                            key={button.action}
                            variant="outline"
                            size="sm"
                            onClick={() => handleButtonClick(button.action)}
                            className="h-8 text-xs"
                          >
                            {button.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-start"
                  >
                    <div className="rounded-2xl rounded-bl-md bg-chat-assistant px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Lee is typing
                        </span>
                        <span className="flex gap-1">
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-typing"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-typing"
                            style={{ animationDelay: '200ms' }}
                          />
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-typing"
                            style={{ animationDelay: '400ms' }}
                          />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t bg-background p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputValue.trim()}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
