import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Demo, DemoStep, Integration, UserSession, ChatMessage, ActiveThread, IntegrationAttempt } from '@/types/demo';

interface AppContextType {
  demo: Demo | null;
  setDemo: React.Dispatch<React.SetStateAction<Demo | null>>;
  addStep: (imageUrl: string | null, annotation: string) => void;
  updateStep: (stepId: string, updates: Partial<DemoStep>) => void;
  removeStep: (stepId: string) => void;
  reorderSteps: (newOrder: DemoStep[]) => void;
  publishDemo: () => void;

  integrations: Integration[];
  connectIntegration: (integrationId: string) => Promise<void>;
  integrationError: { id: string; message: string } | null;
  clearIntegrationError: () => void;

  userSession: UserSession;
  updateUserSession: (updates: Partial<UserSession>) => void;

  chatMessages: ChatMessage[];
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;

  triggerError: (type: 'integration' | 'upload', details: string) => void;
  triggerStuck: (stepId: string) => void;
  triggerHappyMoment: () => void;

  showSnippet: boolean;
  snippetMessage: string | null;
  clearSnippet: () => void;

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

  const [showSnippet, setShowSnippet] = useState(false);
  const [snippetMessage, setSnippetMessage] = useState<string | null>(null);

  const [pendingTrigger, setPendingTrigger] = useState<{
    type: 'error' | 'stuck' | 'happy';
    details?: string;
  } | null>(null);

  const isProcessingRef = useRef(false);

  // UPDATE USER SESSION
  const updateUserSession = useCallback((updates: Partial<UserSession>) => {
    setUserSession((prev) => ({ ...prev, ...updates }));
  }, []);

  // DEMO FUNCTIONS
  const addStep = useCallback((imageUrl: string | null, annotation: string) => {
    setDemo((prev) => {
      if (!prev) return prev;
      const newStep: DemoStep = { id: crypto.randomUUID(), order: prev.steps.length + 1, imageUrl, annotation, createdAt: new Date() };
      return { ...prev, steps: [...prev.steps, newStep], updatedAt: new Date() };
    });
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<DemoStep>) => {
    setDemo((prev) => prev ? { ...prev, steps: prev.steps.map(s => s.id === stepId ? { ...s, ...updates } : s), updatedAt: new Date() } : prev);
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setDemo((prev) => prev ? { ...prev, steps: prev.steps.filter(s => s.id !== stepId).map((s, idx) => ({ ...s, order: idx + 1 })), updatedAt: new Date() } : prev);
  }, []);

  const reorderSteps = useCallback((newOrder: DemoStep[]) => {
    setDemo((prev) => prev ? { ...prev, steps: newOrder.map((s, idx) => ({ ...s, order: idx + 1 })), updatedAt: new Date() } : prev);
  }, []);

  const publishDemo = useCallback(() => {
    setDemo((prev) => prev ? { ...prev, isPublished: true, updatedAt: new Date() } : prev);
  }, []);

  // INTEGRATIONS
  const connectIntegration = useCallback(async (integrationId: string) => {
    const currentAttempts = userSession.integrationAttempts[integrationId]?.attempts || 0;

    try {
      // Clear previous error
      setIntegrationError(null);

      // Fetch OAuth URL from backend
      const res = await fetch(`/api/integrations/${integrationId}/auth-url`);
      if (!res.ok) throw new Error('Failed to fetch OAuth URL');
      const { url } = await res.json();

      // Redirect user to OAuth URL (or open popup)
      window.location.href = url;

      // Note: After successful OAuth callback, backend should signal success
      // and you can mark the integration as connected like this:
      // setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'connected', connected: true } : i));

      // Track attempts
      updateUserSession({
        integrationAttempts: {
          ...userSession.integrationAttempts,
          [integrationId]: { attempts: currentAttempts + 1, escalated: currentAttempts >= 1 },
        },
      });
    } catch (err) {
      console.error(err);
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'error', connected: false } : i));
      setIntegrationError({ id: integrationId, message: `OAuth connection failed for ${integrationId}. Please try again.` });
    }
  }, [userSession.integrationAttempts, updateUserSession]);

  const clearIntegrationError = useCallback(() => setIntegrationError(null), []);

  // CHAT FUNCTIONS
  const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = { ...message, id: crypto.randomUUID(), timestamp: new Date() };
    setChatMessages(prev => [...prev, newMessage]);
  }, []);

  const clearSnippet = useCallback(() => {
    setShowSnippet(false);
    setSnippetMessage(null);
  }, []);

  // TRIGGERS
  const triggerError = useCallback((type: 'integration' | 'upload', details: string) => {
    if (isProcessingRef.current) return;
    if (type === 'integration') {
      const currentAttempts = userSession.integrationAttempts[details];
      if (currentAttempts?.escalated) return;
      const newAttempts: IntegrationAttempt = { integrationId: details, attempts: (currentAttempts?.attempts || 0) + 1, lastAttempt: new Date(), escalated: (currentAttempts?.attempts || 0) >= 1 };
      updateUserSession({ integrationAttempts: { ...userSession.integrationAttempts, [details]: newAttempts } });
    }
    setPendingTrigger({ type: 'error', details: `${type}:${details}` });
  }, [userSession.integrationAttempts, updateUserSession]);

  const triggerStuck = useCallback((stepId: string) => {
    if (isProcessingRef.current) return;
    if (userSession.stuckPromptedSteps.includes(stepId)) return;
    updateUserSession({ stuckPromptedSteps: [...userSession.stuckPromptedSteps, stepId] });
    setPendingTrigger({ type: 'stuck', details: stepId });
  }, [userSession.stuckPromptedSteps, updateUserSession]);

  const triggerHappyMoment = useCallback(() => {
    if (isProcessingRef.current) return;
    if (userSession.firstDemoCompleted) return;
    setPendingTrigger({ type: 'happy' });
  }, [userSession.firstDemoCompleted]);

  const resetDemo = useCallback(() => {
    setDemo({ id: crypto.randomUUID(), title: 'My First Demo', steps: [], isPublished: false, createdAt: new Date(), updatedAt: new Date() });
    setIntegrations(defaultIntegrations);
    setIntegrationError(null);
    setUserSession({ ...defaultUserSession, hasBeenIntroduced: false, greetingSentThisSession: false });
    setChatMessages([]);
    setIsTyping(false);
    setPendingTrigger(null);
    isProcessingRef.current = false;
    setShowSnippet(false);
    setSnippetMessage(null);
  }, []);

  // HANDLE PENDING TRIGGERS (10s delay, chat first, floater second)
  useEffect(() => {
    if (!pendingTrigger || isProcessingRef.current) return;

    const handleTrigger = async () => {
      isProcessingRef.current = true;

      await new Promise((r) => setTimeout(r, 10000));

      if (!userSession.greetingSentThisSession) {
        const greeting = !userSession.hasBeenIntroduced
          ? `Hi ${userSession.userName}, I'm Lee!`
          : `Hi ${userSession.userName}, nice to see you back!`;

        addChatMessage({ role: 'assistant', content: greeting });
        setSnippetMessage(greeting);
        setShowSnippet(true);
        await new Promise((r) => setTimeout(r, 3000));
        setShowSnippet(false);

        updateUserSession({ hasBeenIntroduced: true, greetingSentThisSession: true });
      }

      if (pendingTrigger.type === 'error' && pendingTrigger.details) {
        const [type, integrationId] = pendingTrigger.details.split(':');
        const integration = integrations.find(i => i.id === integrationId);
        const integrationName = integration?.name || integrationId;
        const attempts = userSession.integrationAttempts[integrationId];

        const errorMsg = attempts?.escalated
          ? `Got it — if it happens again, I'll escalate for help.`
          : `It looks like you ran into an error while connecting ${integrationName}. Can you try connecting it again?`;

        addChatMessage({ role: 'assistant', content: errorMsg });
        setSnippetMessage(errorMsg);
        setShowSnippet(true);
        await new Promise((r) => setTimeout(r, 3000));
        setShowSnippet(false);
      } else if (pendingTrigger.type === 'stuck') {
        const stuckMsg = `Noticed you might be stuck. Want a quick tip?`;
        addChatMessage({
          role: 'assistant',
          content: stuckMsg,
          buttons: [
            { label: 'Yes, show me a tip', action: 'show_tip' },
            { label: "No, I'm good", action: 'decline_help' },
          ],
        });

        setSnippetMessage(stuckMsg);
        setShowSnippet(true);
        await new Promise((r) => setTimeout(r, 3000));
        setShowSnippet(false);
      } else if (pendingTrigger.type === 'happy') {
        const happyMsg = `Congrats on making your first demo! 🎉 Want me to schedule a quick call to help you get more value?`;
        addChatMessage({
          role: 'assistant',
          content: happyMsg,
          buttons: [
            { label: 'Schedule a call', action: 'schedule_call' },
            { label: 'Send me tips instead', action: 'send_tips' },
          ],
        });

        setSnippetMessage(happyMsg);
        setShowSnippet(true);
        await new Promise((r) => setTimeout(r, 3000));
        setShowSnippet(false);

        updateUserSession({ firstDemoCompleted: true });
      }

      setPendingTrigger(null);
      isProcessingRef.current = false;
    };

    handleTrigger();
  }, [pendingTrigger, userSession, integrations, addChatMessage, updateUserSession]);

  return (
    <AppContext.Provider
      value={{
        demo, setDemo, addStep, updateStep, removeStep, reorderSteps, publishDemo,
        integrations, connectIntegration, integrationError, clearIntegrationError,
        userSession, updateUserSession,
        chatMessages, addChatMessage, isTyping, setIsTyping, isChatOpen, setIsChatOpen,
        triggerError, triggerStuck, triggerHappyMoment,
        showSnippet, snippetMessage, clearSnippet,
        resetDemo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
