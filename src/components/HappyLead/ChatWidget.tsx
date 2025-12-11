import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Smile } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function ChatWidget() {
  const {
    demo,
    integrations,
    chatMessages,
    addChatMessage,
    markMessagesAsViewed,
    unreadCount,
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
  const [showMessagePreview, setShowMessagePreview] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string>('');
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Mark all messages as viewed when chat opens
      markMessagesAsViewed();
    }
  }, [isChatOpen, markMessagesAsViewed]);

  // NEW: Show message preview when new assistant message arrives and chat is closed
  useEffect(() => {
    if (!isChatOpen && chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      
      // Only show preview for new unviewed assistant messages
      if (lastMessage.role === 'assistant' && !lastMessage.viewed) {
        setPreviewMessage(lastMessage.content);
        setShowMessagePreview(true);

        // Clear any existing timeout
        if (previewTimeoutRef.current) {
          clearTimeout(previewTimeoutRef.current);
        }

        // Auto-hide after 5 seconds
        previewTimeoutRef.current = setTimeout(() => {
          setShowMessagePreview(false);
        }, 5000);
      }
    } else {
      // Hide preview when chat is open
      setShowMessagePreview(false);
    }

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [chatMessages, isChatOpen]);

  // --------------------------
  // Handle user message - UPDATED WITH HUBSPOT FLOW
  // --------------------------
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    addChatMessage({ role: 'user', content: userMessage });

    const delay = () => new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));

    setIsTyping(true);
    await delay();
    setIsTyping(false);

    const lowerMessage = userMessage.toLowerCase();
    const activeThread = userSession.activeThread;

    // Exit early if already resolved
    if (activeThread?.resolved && !activeThread.awaitingResponse) return;

    // --------------------------
    // HUBSPOT FLOW - Multi-stage conversation
    // --------------------------
    if (activeThread?.type === 'error' && activeThread.integration === 'hubspot') {
      // STAGE 1: Awaiting error code
      if (activeThread.hubspotFlowStage === 'awaiting_error_code') {
        // Check if message contains an error code (3-digit number)
        const errorCodeMatch = userMessage.match(/\b\d{3}\b/);
        
        if (errorCodeMatch) {
          const errorCode = errorCodeMatch[0];
          addChatMessage({
            role: 'assistant',
            content: `Ah, we're working on a fix for error ${errorCode}. Can you click "Try Again"? Sometimes that fixes it.`,
            buttons: [
              { label: "It didn't work", action: 'hubspot_still_broken' },
            ],
          });

          updateUserSession({
            activeThread: {
              ...activeThread,
              hubspotFlowStage: 'awaiting_try_again_result',
            },
          });
        } else {
          // No error code detected, ask again
          addChatMessage({
            role: 'assistant',
            content: "I didn't catch the error code. Could you share the 3-digit code you're seeing?",
          });
        }
        return;
      }

      // STAGE 2: After "It didn't work" button clicked (handled in handleButtonClick)
      // Just general fallback if they type instead of clicking
      addChatMessage({
        role: 'assistant',
        content: "Did the \"Try Again\" button help resolve the issue?",
      });
      return;
    }

    // --------------------------
    // Salesforce-specific message
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
    // Thread-specific logic (error) - for non-HubSpot
    // --------------------------
    if (activeThread?.type === 'error' && activeThread.awaitingResponse && activeThread.integration !== 'hubspot') {
      if (lowerMessage.includes('work') || lowerMessage.includes('success') || lowerMessage.includes('fixed')) {
        addChatMessage({ role: 'assistant', content: 'Great! Let me know if you need anything else.' });
      } else if (lowerMessage.includes('fail') || lowerMessage.includes('again') || lowerMessage.includes('still')) {
        addChatMessage({ role: 'assistant', content: "Got it — I'll get someone from our team to help troubleshoot." });
      } else {
        addChatMessage({ role: 'assistant', content: 'Did connecting it work this time?' });
      }
      if (activeThread) {
        updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
      }
      return;
    }

    // --------------------------
    // Thread-specific logic (stuck)
    // --------------------------
    if (activeThread?.type === 'stuck' && activeThread.awaitingResponse) {
      if (lowerMessage.includes('yes') || lowerMessage.includes('help') || lowerMessage.includes('tip') || lowerMessage.includes('sure')) {
        // Perform dynamic audit
        const imageCount = demo?.steps.length || 0;
        const annotationCount = demo?.steps.filter(step => step.annotation && step.annotation.trim().length > 0).length || 0;
        
        addChatMessage({
          role: 'assistant',
          content: "Here's what I recommend to get your demo ready to publish. I checked your progress so far:",
        });

        await delay();

        // Build the dynamic recommendations
        let recommendations = "We find that most people who have successful demos tend to:\n\n";
        
        // 1. Image count recommendation
        if (imageCount >= 4) {
          recommendations += `1. Add at least 4 images - you currently have ${imageCount}. Well done!\n`;
        } else {
          const difference = 4 - imageCount;
          recommendations += `1. Add at least 4 images - you currently have ${imageCount}. You should add ${difference} more.\n`;
        }
        
        // 2. Annotation recommendation
        if (imageCount === annotationCount && imageCount > 0) {
          recommendations += "2. Have an annotation on each step. You've got that handled!\n";
        } else {
          const difference = imageCount - annotationCount;
          recommendations += `2. Have an annotation on each step. You should add ${difference} more.\n`;
        }
        
        // 3. Preview and publish
        recommendations += "3. Preview and Publish! Don't wait for perfection, ship it and get feedback!";

        addChatMessage({
          role: 'assistant',
          content: recommendations,
        });
      } else if (lowerMessage.includes('no') || lowerMessage.includes('good') || lowerMessage.includes('fine')) {
        addChatMessage({ role: 'assistant', content: "No problem — I'll be here if you need anything." });
      } else {
        addChatMessage({ role: 'assistant', content: 'Would you like a quick tip to help?' });
      }
      if (activeThread) {
        updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
      }
      return;
    }

    // --------------------------
    // Thread-specific logic (share flow)
    // --------------------------
    if (activeThread?.type === 'share' && activeThread.awaitingResponse) {
      // User typed something during share flow - give generic response
      addChatMessage({ 
        role: 'assistant', 
        content: "Would you like to speak with an expert to learn powerful use cases and best practices?" 
      });
      if (activeThread) {
        updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
      }
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

  // --------------------------
  // Handle assistant action buttons - UPDATED WITH ALL FLOWS
  // --------------------------
  const handleButtonClick = async (action: string) => {
    const delay = () => new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));
    const activeThread = userSession.activeThread;

    setIsTyping(true);
    await delay();
    setIsTyping(false);

    // STUCK FLOW - "Yes" button with dynamic audit
    if (action === 'stuck_help_yes') {
      const imageCount = demo?.steps.length || 0;
      const annotationCount = demo?.steps.filter(step => step.annotation && step.annotation.trim().length > 0).length || 0;
      
      // First message
      addChatMessage({
        role: 'assistant',
        content: "Here's what I recommend to get your demo ready to publish. I checked your progress so far:",
      });

      setIsTyping(true);
      await new Promise(r => setTimeout(r, 1500));
      setIsTyping(false);

      // Build the dynamic recommendations
      let recommendations = "We find that most people who have successful demos tend to:\n\n";
      
      // 1. Image count recommendation
      if (imageCount >= 4) {
        recommendations += `1. Add at least 4 images - you currently have ${imageCount}. Well done!\n`;
      } else {
        const difference = 4 - imageCount;
        recommendations += `1. Add at least 4 images - you currently have ${imageCount}. You should add ${difference} more.\n`;
      }
      
      // 2. Annotation recommendation
      if (imageCount === annotationCount && imageCount > 0) {
        recommendations += "2. Have an annotation on each step. You've got that handled!\n";
      } else {
        const difference = imageCount - annotationCount;
        recommendations += `2. Have an annotation on each step. You should add ${difference} more.\n`;
      }
      
      // 3. Preview and publish
      recommendations += "3. Preview and Publish! Don't wait for perfection, ship it and get feedback!";

      // Second message with recommendations
      addChatMessage({
        role: 'assistant',
        content: recommendations,
      });

      if (activeThread) {
        updateUserSession({ 
          activeThread: { 
            ...activeThread, 
            resolved: true, 
            awaitingResponse: false 
          } 
        });
      }
      return;
    }

    if (action === 'stuck_help_no') {
      addChatMessage({ 
        role: 'assistant', 
        content: "No problem — I'll be here if you need anything." 
      });
      
      if (activeThread) {
        updateUserSession({ 
          activeThread: { 
            ...activeThread, 
            resolved: true, 
            awaitingResponse: false 
          } 
        });
      }
      return;
    }

    // HUBSPOT FLOW - "It didn't work" button
    if (action === 'hubspot_still_broken') {
      addChatMessage({
        role: 'assistant',
        content: "Sorry to hear that, we've notified our team. If you want, I can loop in a specialist to get you sorted out faster. Want me to pull them in?",
        buttons: [
          { label: "Yes", action: 'hubspot_escalate_yes' },
          { label: "No", action: 'hubspot_escalate_no' },
        ],
      });

      if (activeThread) {
        updateUserSession({
          activeThread: {
            ...activeThread,
            hubspotFlowStage: 'awaiting_escalation_choice',
          },
        });
      }
      return;
    }

    if (action === 'hubspot_escalate_yes') {
      // First message: Checking Slack
      addChatMessage({
        role: 'assistant',
        content: "Great, let me check Slack to see if anyone is available right now.",
      });

      // Show typing indicator and wait 10 seconds
      setIsTyping(true);
      await new Promise(r => setTimeout(r, 10000));
      setIsTyping(false);

      // Second message: No one available + calendar link
      addChatMessage({
        role: 'assistant',
        content: "It seems like no one is available at the moment. However, here's the Calendar link for the specialist: https://cal.com/andrew-simpson-gvo4qi/30min",
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

    if (action === 'hubspot_escalate_no') {
      // Do nothing for now, just mark as resolved
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

    // SHARE FLOW HANDLERS
    if (action === 'share_flow_yes') {
      // First message
      addChatMessage({
        role: 'assistant',
        content: "Great, let me Slack someone on our team to see if they are available now.",
      });

      // Wait 10 seconds WITHOUT typing indicator
      await new Promise(r => setTimeout(r, 10000));

      // THEN show typing for 3 seconds
      setIsTyping(true);
      await new Promise(r => setTimeout(r, 3000));
      setIsTyping(false);

      // Second message
      addChatMessage({
        role: 'assistant',
        content: "No one is available at the moment, but we'd love to schedule a chat: https://cal.com/andrew-simpson-gvo4qi/30min",
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

    if (action === 'share_flow_no') {
      // Do nothing, just mark as resolved
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

    // Original button actions (keeping these for backwards compatibility)
    if (action === 'show_tip') {
      addChatMessage({
        role: 'assistant',
        content: 'Try dragging the screenshot into the step area and click Save — that usually fixes it.',
      });
    } else if (action === 'decline_help') {
      addChatMessage({ role: 'assistant', content: "No problem — I'll be here if you need anything." });
    }

    if (activeThread && action !== 'hubspot_still_broken') {
      updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // NEW: Handle clicking on message preview (opens chat and marks as viewed)
  const handlePreviewClick = () => {
    setShowMessagePreview(false);
    setIsChatOpen(true);
  };

  // --------------------------
  // Snippet floater
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

  // NEW: Message Preview Component
  const MessagePreview = () => {
    if (!showMessagePreview || !previewMessage) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={handlePreviewClick}
        className="fixed bottom-24 right-6 z-50 max-w-sm cursor-pointer rounded-lg bg-white border border-border shadow-lg hover:shadow-xl transition-shadow"
      >
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-accent">
            <Smile className="h-4 w-4 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm text-foreground">Lee</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMessagePreview(false);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {previewMessage}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <AnimatePresence>
        <SnippetFloater />
      </AnimatePresence>

      <AnimatePresence>
        <MessagePreview />
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
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              >
                {unreadCount}
              </motion.span>
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

            <div className="border-t bg-background p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={!inputValue.trim()}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
