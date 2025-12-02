import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Demo, DemoStep, Integration, UserSession, ChatMessage, ActiveThread, IntegrationAttempt } from '@/types/demo';

interface AppContextType {
  // Demo state
  demo: Demo | null;
  setDemo: React.Dispatch<React.SetStateAction<Demo | null>>;
  addStep: (imageUrl: string | null, annotation: string) => void;
  updateStep: (stepId: string, updates: Partial<DemoStep>) => void;
  removeStep: (stepId: string) => void;
  reorderSteps: (newOrder: DemoStep[]) => void;
  publishDemo: () => void;

  // Integration state
  integrations: Integration[];
  connectIntegration: (integrationId: string) => Promise<void>;
  integrationError: { id: string; message: string } | null;
  clearIntegrationError: () => void;

  // User session
  userSession: UserSession;
  updateUserSession: (updates: Partial<UserSession>) => void;

  // Chat state
  chatMessages: ChatMessage[];
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  incomingToast: { content: string } | null;
  clearIncomingToast: () => void;

  // Triggers for HappyLead
  triggerError: (type: 'integration' | 'upload', details: string) => void;
  triggerStuck: (stepId: string) => void;
  triggerHappyMoment: () => void;

  // Reset
  resetDemo: () => void;
}

const defaultIntegrations: Integration[] = [
  { id: 'hubspot', name: 'HubSpot', description: 'Sync demo engagement data with your CRM', icon: 'hubspot', connected: false, status: 'disconnected' },
  { id: 'salesforce', name: 'Salesforce', description: 'Track demo views in your sales pipeline', icon: 'salesforce', connected: false, status: 'disconnected' },
  { id: 'google-analytics', name: 'Google Analytics', description: 'Measure demo performance and conversions', icon: 'analytics', connected: false, status: 'disconnected' },
];

const defaultUserSession: UserSession = {
  userName: 'Alex',
  hasBeenIntroduced: false,
  greetingSentThisSession: false,
  lastInteraction: null,
  firstDemoCompleted: false,
  currentPage: 'builder',
  currentStep: null,
  lastInstruction: null,
  activeThread: null,
  integrationAttempts: {},
  stuckPromptedSteps: [],
  stuckDetection: { stepId: null, dwellStart: null, clickCount: 0, lastActivity: null },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [demo, setDemo] = useState<Demo | null>({
    id: '1',
    title: 'My First Demo',
    steps: [],
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const [integrations, setIntegrations] = useState<Integration[]>(defaultIntegrations);
  const [integrationError, setIntegrationError] = useState<{ id: string; message: string } | null>(null);
  const [userSession, setUserSession] = useState<UserSession>(defaultUserSession);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [incomingToast, setIncomingToast] = useState<{ content: string } | null>(null);

  const [pendingTrigger, setPendingTrigger] = useState<{ type: 'error' | 'stuck' | 'happy'; details?: string } | null>(null);

  const isProcessingRef = useRef(false);

  // -------------------
  // Demo helpers
  // -------------------
  const addStep = useCallback((imageUrl: string | null, annotation: string) => {
    setDemo((prev) => {
      if (!prev) return prev;
      const newStep: DemoStep = { id: crypto.randomUUID(), order: prev.steps.length + 1, imageUrl, annotation, createdAt: new Date() };
      return { ...prev, steps: [...prev.steps, newStep], updatedAt: new Date() };
    });
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<DemoStep>) => {
    setDemo((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.map((s) => s.id === stepId ? { ...s, ...updates } : s), updatedAt: new Date() };
    });
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setDemo((prev) => {
      if (!prev) return prev;
      const filtered = prev.steps.filter((s) => s.id !== stepId);
      return { ...prev, steps: filtered.map((s, idx) => ({ ...s, order: idx + 1 })), updatedAt: new Date() };
    });
  }, []);

  const reorderSteps = useCallback((newOrder: DemoStep[]) => {
    setDemo((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: newOrder.map((s, idx) => ({ ...s, order: idx + 1 })), updatedAt: new Date() };
    });
  }, []);

  const publishDemo = useCallback(() => {
    setDemo((prev) => prev ? { ...prev, isPublished: true, updatedAt: new Date() } : prev);
  }, []);

  // -------------------
  // Integration helpers
  // -------------------
  const updateUserSession = useCallback((updates: Partial<UserSession>) => {
    setUserSession((prev) => ({ ...prev, ...updates }));
  }, []);

  const connectIntegration = useCallback(async (integrationId: string) => {
    const currentAttempts = userSession.integrationAttempts[integrationId]?.attempts || 0;

    if (currentAttempts === 0) {
      setIntegrations((prev) => prev.map((int) => int.id === integrationId ? { ...int, status: 'error' } : int));
      const integration = integrations.find((int) => int.id === integrationId);
      setIntegrationError({ id: integrationId, message: `OAuth connection failed for ${integration?.name || 'integration'}. Please try again.` });
    } else {
      setIntegrations((prev) => prev.map((int) => int.id === integrationId ? { ...int, status: 'connected' } : int));
      setIntegrationError(null);
    }

    updateUserSession({
      integrationAttempts: {
        ...userSession.integrationAttempts,
        [integrationId]: { attempts: currentAttempts + 1, escalated: currentAttempts >= 1 },
      },
    });
  }, [integrations, userSession.integrationAttempts, updateUserSession]);

  const clearIntegrationError = useCallback(() => setIntegrationError(null), []);

  // -------------------
  // Chat helpers
  // -------------------
  const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = { ...message, id: crypto.randomUUID(), timestamp: new Date() };
    setChatMessages((prev) => [...prev, newMessage]);
    // Show floating preview if chat is closed
    if (!isChatOpen) setIncomingToast({ content: message.content });
  }, [isChatOpen]);

  const clearIncomingToast = useCallback(() => setIncomingToast(null), []);

  const sendMessageWithDelay = useCallback(async (content: string, buttons?: ChatMessage['buttons'], preDelay?: number) => {
    const delayTime = preDelay ?? 3000 + Math.random() * 2000;
    await new Promise((r) => setTimeout(r, delayTime));
    addChatMessage({ role: 'assistant', content, buttons });
  }, [addChatMessage]);

  // -------------------
  // Triggers
  // -------------------
  const triggerError = useCallback((type: 'integration' | 'upload', details: string) => {
    if (isProcessingRef.current) return;

    let integrationName: string | undefined;
    if (type === 'integration') {
      const integration = integrations.find((i) => i.id === details);
      integrationName = integration?.name;
      const currentAttempts = userSession.integrationAttempts[details];
      if (currentAttempts?.escalated) return;

      const newAttempts: IntegrationAttempt = {
        integrationId: details,
        attempts: (currentAttempts?.attempts || 0) + 1,
        lastAttempt: new Date(),
        escalated: (currentAttempts?.attempts || 0) >= 1,
      };
      updateUserSession({ integrationAttempts: { ...userSession.integrationAttempts, [details]: newAttempts } });
    }

    setPendingTrigger({ type: type === 'integration' ? 'error' : type, details: integrationName || details });
    setIsChatOpen(true);
  }, [integrations, userSession.integrationAttempts, updateUserSession]);

  const triggerStuck = useCallback((stepId: string) => {
    if (isProcessingRef.current) return;
    if (userSession.stuckPromptedSteps.includes(stepId)) return;
    updateUserSession({ stuckPromptedSteps: [...userSession.stuckPromptedSteps, stepId] });
    setPendingTrigger({ type: 'stuck', details: stepId });
    setIsChatOpen(true);
  }, [userSession.stuckPromptedSteps, updateUserSession]);

  const triggerHappyMoment = useCallback(() => {
    if (isProcessingRef.current) return;
    if (userSession.firstDemoCompleted) return;
    setPendingTrigger({ type: 'happy' });
    setIsChatOpen(true);
  }, [userSession.firstDemoCompleted]);

  // -------------------
  // Reset
  // -------------------
  const resetDemo = useCallback(() => {
    setDemo({ id: crypto.randomUUID(), title: 'My First Demo', steps: [], isPublished: false, createdAt: new Date(), updatedAt: new Date() });
    setIntegrations(defaultIntegrations);
    setIntegrationError(null);
    setUserSession({ ...defaultUserSession, hasBeenIntroduced: false, greetingSentThisSession: false });
    setChatMessages([]);
    setIsTyping(false);
    setPendingTrigger(null);
    isProcessingRef.current = false;
    setIncomingToast(null);
  }, []);

  // -------------------
  // Handle pending triggers
  // -------------------
  useEffect(() => {
    if (!pendingTrigger || isProcessingRef.current) return;

    const handleTrigger = async () => {
      isProcessingRef.current = true;

      // Greeting first
      if (!userSession.greetingSentThisSession) {
        const delayTime = 10000 + Math.random() * 5000; // 10-15s before first message
        setIsTyping(true);
        await new Promise((r) => setTimeout(r, delayTime));
        setIsTyping(false);

        const greeting = !userSession.hasBeenIntroduced
          ? `Hi ${userSession.userName}, I'm Lee!`
          : `Hi ${userSession.userName}, nice to see you back!`;

        addChatMessage({ role: 'assistant', content: greeting });
        updateUserSession({ hasBeenIntroduced: true, greetingSentThisSession: true });
      }

      // Handle type-specific messages
      if (pendingTrigger.type === 'error') {
        const integrationName = pendingTrigger.details;
        const attempts = Object.values(userSession.integrationAttempts).find(a => a.integrationId === integrationName);
        if (attempts?.escalated) {
          await sendMessageWithDelay(`Got it — if it happens again, let me know and I'll get someone from our team to help troubleshoot.`);
        } else {
          await sendMessageWithDelay(`It looks like you ran into an error while connecting ${integrationName}. Can you try connecting it again?`);
        }
        updateUserSession({
          activeThread: { id: crypto.randomUUID(), type: 'error', integrationName: integrationName, awaitingResponse: true, resolved: false, followUpSent: false },
        });
      } else if (pendingTrigger.type === 'stuck') {
        await sendMessageWithDelay(`Noticed you might be stuck. Want a quick tip?`, [
          { label: 'Yes, show me a tip', action: 'show_tip' },
          { label: "No, I'm good", action: 'decline_help' },
        ]);
        updateUserSession({
          activeThread: { id: crypto.randomUUID(), type: 'stuck', stepId: pendingTrigger.details, awaitingResponse: true, resolved: false, followUpSent: false },
        });
      } else if (pendingTrigger.type === 'happy') {
        await sendMessageWithDelay(`Congrats on making your first demo! 🎉 Would you like me to schedule a quick call to help you get more value from this?`, [
          { label: 'Schedule a call', action: 'schedule_call' },
          { label: 'Send me tips instead', action: 'send_tips' },
        ]);
        updateUserSession({
          firstDemoCompleted: true,
          activeThread: { id: crypto.randomUUID(), type: 'happy', awaitingResponse: true, resolved: false, followUpSent: false },
        });
      }

      setPendingTrigger(null);
      isProcessingRef.current = false;
    };

    handleTrigger();
  }, [pendingTrigger, userSession, addChatMessage, updateUserSession, sendMessageWithDelay]);

  return (
    <AppContext.Provider
      value={{
        demo,
        setDemo,
        addStep,
        updateStep,
        removeStep,
        reorderSteps,
        publishDemo,
        integrations,
        connectIntegration,
        integrationError,
        clearIntegrationError,
        userSession,
        updateUserSession,
        chatMessages,
        addChatMessage,
        isTyping,
        setIsTyping,
        isChatOpen,
        setIsChatOpen,
        incomingToast,
        clearIncomingToast,
        triggerError,
        triggerStuck,
        triggerHappyMoment,
        resetDemo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
