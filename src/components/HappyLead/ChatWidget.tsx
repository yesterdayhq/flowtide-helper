// Keep all imports as is
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

    addChatMessage({
      role: 'user',
      content: userMessage,
    });

    const delay = () =>
      new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));

    setIsTyping(true);
    await delay();
    setIsTyping(false);

    const lowerMessage = userMessage.toLowerCase();
    const activeThread = userSession?.activeThread;

    // Use optional chaining everywhere
    if (activeThread?.type === 'error' && activeThread.awaitingResponse) {
      // ...existing logic stays
    }

    // ...rest of handleSend stays the same
  };

  const handleButtonClick = async (action: string) => {
    const delay = () =>
      new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));

    const activeThread = userSession?.activeThread;

    if (action === 'show_tip') {
      setIsTyping(true);
      await delay();
      setIsTyping(false);
      addChatMessage({
        role: 'assistant',
        content: 'Try dragging the screenshot into the step area and click Save — that usually fixes it.',
      });
      if (activeThread) {
        updateUserSession({ activeThread: { ...activeThread, resolved: true, awaitingResponse: false } });
      }
    }
    // ...repeat for other actions
  };

  return (
    <>
      {/* Floater/snippet */}
      <AnimatePresence>
        {showSnippet && snippetMessage && (
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
        )}
      </AnimatePresence>

      {/* Chat button */}
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
          {chatMessages?.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {chatMessages?.filter((m) => m.role === 'assistant')?.length ?? 0}
            </span>
          )}
        </motion.button>
      )}

      {/* Chat window */}
      {isChatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-chat-bg shadow-chat"
        >
          {/* ...rest of chat window stays the same, but everywhere use chatMessages? and userSession? */}
        </motion.div>
      )}
    </>
  );
}
