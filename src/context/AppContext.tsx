import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Demo, DemoStep, Integration, UserSession, ChatMessage } from '@/types/demo';

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
  const integrationAttemptRef = useRef<Record<string, number>>({});
  const cancelTriggerRef = useRef<Record<string, boolean>>({});

  const updateUserSession = useCallback((updates: Partial<UserSession>) => {
    setUserSession((prev) => ({ ...prev, ...updates }));
  }, []);

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

  const findIntegration = useCallback((id: string) => integrations.find(i => i.id === id), [integrations]);

  const connectIntegration = useCallback(async (integrationId: string) => {
    if (!integrationAttemptRef.current[integrationId]) integrationAttemptRef.current[integrationId] = 0;
    integrationAttemptRef.current[integrationId] += 1;
    const attempt = integrationAttemptRef.current[integrationId];

    const currentIntegration = integrations.find(i => i.id === integrationId);
    if (currentIntegration?.connected) return;

    // Cancel pending trigger for this integration
    setPendingTrigger((prev) => {
      const prevDetails = prev?.details?.toLowerCase();
      const checkFor = `integration:${integrationId}`.toLowerCase();
      if (!prev) return prev;
      if (prev.type === 'error' && prevDetails === checkFor) {
        cancelTriggerRef.current[integrationId] = true;
        return null;
      }
      return prev;
    });

    setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'connecting' } : i));
    await new Promise((r) => setTimeout(r, 300));

    if (integrationId === 'salesforce') {
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'error', connected: false } : i));
      setIntegrationError({ id: integrationId, message: 'OAuth connection failed for Salesforce.' });
      setPendingTrigger({ type: 'error', details: `integration:${integrationId}` });
      return;
    }

    if (attempt === 1) {
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'error', connected: false } : i));
      setIntegrationError({ id: integrationId, message: `OAuth connection failed for ${integrationId === 'hubspot' ? 'HubSpot' : 'Google Analytics'}.` });
      setPendingTrigger({ type: 'error', details: `integration:${integrationId}` });
    } else {
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'connected', connected: true } : i));
      setIntegrationError((prev) => (prev && prev.id === integrationId ? null : prev));
    }
  }, [integrations]);

  const clearIntegrationError = useCallback(() => setIntegrationError(null), []);

  const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = { ...message, id: crypto.randomUUID(), timestamp: new Date() };
    setChatMessages(prev => [...prev, newMessage]);
  }, []);

  const clearSnippet = useCallback(() => {
    setShowSnippet(false);
    setSnippetMessage(null);
  }, []);

  const triggerError = useCallback((type: 'integration' | 'upload', details: string) => {
    if (isProcessingRef.current) return;
    setPendingTrigger({ type: 'error', details: `${type}:${details}` });
  }, []);

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
    cancelTriggerRef.current = {};
    integrationAttemptRef.current = {};
    setShowSnippet(false);
    setSnippetMessage(null);
  }, []);

  useEffect(() => {
    if (!pendingTrigger || isProcessingRef.current) return;

    const handleTrigger = async () => {
      isProcessingRef.current = true;
      const currentTrigger = { ...pendingTrigger };
      const integrationId = currentTrigger.details?.split(':')[1];

      await new Promise(r => setTimeout(r, 10000));

      if ((integrationId && cancelTriggerRef.current[integrationId]) || !pendingTrigger) {
        if (integrationId) cancelTriggerRef.current[integrationId] = false;
        isProcessingRef.current = false;
        return;
      }

      if (currentTrigger.type === 'error' && currentTrigger.details) {
        const [triggerType, integrationNowId] = currentTrigger.details.split(':');
        const integrationNow = findIntegration(integrationNowId);
        if (integrationNow?.connected) {
          setPendingTrigger(null);
          isProcessingRef.current = false;
          return;
        }

        if (triggerType === 'integration') {
          const integration = findIntegration(integrationNowId);
          const integrationName = integration?.name || integrationNowId;

          if (integrationNowId === 'salesforce') {
            addChatMessage({
              role: 'assistant',
              content: "Hey, Alex, I noticed you ran into an error when trying to connect Salesforce.",
            });
            await new Promise(r => setTimeout(r, 2000));
            addChatMessage({
              role: 'assistant',
              content: "We’re aware of the issue and are working on a fix. We’ll reach out once it’s fixed.",
            });
          } else {
            addChatMessage({
              role: 'assistant',
              content: `Hi Alex, I'm Lee! It looks like you ran into an error while connecting ${integrationName}.`,
            });
          }
        }
      }

      if (integrationId) cancelTriggerRef.current[integrationId] = false;
      setPendingTrigger(null);
      isProcessingRef.current = false;
    };

    handleTrigger();
  }, [pendingTrigger, findIntegration, addChatMessage]);

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
