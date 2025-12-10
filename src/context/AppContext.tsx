// Key changes to AppContext.tsx:

// 1. Add to AppContextType interface:
interface AppContextType {
  // ... existing properties
  hasClickedShare: boolean;
  setHasClickedShare: (clicked: boolean) => void;
}

// 2. Add state in AppProvider:
const [hasClickedShare, setHasClickedShare] = useState(false);

// 3. Update the happy moment trigger effect:
useEffect(() => {
  if (!pendingTrigger || isProcessingRef.current) return;

  const handleTrigger = async () => {
    isProcessingRef.current = true;
    const currentTrigger = { ...pendingTrigger };

    // ... existing error and stuck handling code ...

    // NEW HAPPY MOMENT FLOW
    else if (pendingTrigger.type === 'happy') {
      // First message
      addChatMessage({
        role: 'assistant',
        content: "Hey, Alex, congrats on publishing your first demo 🥳! Most teams share their demo with a few teammates before sending it to prospects.",
      });

      await new Promise(r => setTimeout(r, 2000));

      // Second message
      addChatMessage({
        role: 'assistant',
        content: "Open to speaking with an expert at Flowtide to learn powerful use cases and best practices?",
        buttons: [
          { label: "Yes", action: 'share_flow_yes' },
          { label: "No", action: 'share_flow_no' },
        ],
      });

      updateUserSession({
        firstDemoCompleted: true,
        activeThread: {
          type: 'happy',
          resolved: false,
          awaitingResponse: true,
          skipNextReply: false,
        },
      });
    }

    setPendingTrigger(null);
    isProcessingRef.current = false;
  };

  handleTrigger();
}, [pendingTrigger, userSession, integrations, addChatMessage, updateUserSession, findIntegration]);

// 4. Update triggerHappyMoment to include 30-second delay check:
const triggerHappyMoment = useCallback(() => {
  if (isProcessingRef.current) return;
  if (userSession.firstDemoCompleted) return;
  
  // Wait 30 seconds, then check if user clicked Share
  setTimeout(() => {
    if (!hasClickedShare && !userSession.firstDemoCompleted) {
      setPendingTrigger({ type: 'happy' });
    }
  }, 30000);
}, [userSession.firstDemoCompleted, hasClickedShare]);

// 5. Update resetDemo to include hasClickedShare:
const resetDemo = useCallback(() => {
  // ... existing reset code ...
  setHasClickedShare(false);
}, []);

// 6. Add to AppContext.Provider value:
return (
  <AppContext.Provider
    value={{
      // ... existing values ...
      hasClickedShare,
      setHasClickedShare,
    }}
  >
    {children}
  </AppContext.Provider>
);
