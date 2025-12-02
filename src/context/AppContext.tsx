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
  const messageQueueRef = useRef<Array<{ content: string; buttons?: ChatMessage['buttons'] }>>([]);

  // 1️⃣ UPDATE USER SESSION - MUST BE DECLARED BEFORE ANY CALLBACKS THAT USE IT
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

    if (currentAttempts === 0) {
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'error' } : i));
      const integration = integrations.find(i => i.id === integrationId);
      setIntegrationError({ id: integrationId, message: `OAuth connection failed for ${integration?.name || 'integration'}. Please try again.` });
    } else {
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'connected' } : i));
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

  // CHAT FUNCTIONS
  const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = { ...message, id: crypto.randomUUID(), timestamp: new Date() };
    setChatMessages(prev => [...prev, newMessage]);
  }, []);

  const sendMessageWithDelay = useCallback(async (content: string, buttons?: ChatMessage['buttons'], preDelay?: number, showAsSnippet = false) => {
    const delayTime = preDelay ?? (3000 + Math.random() * 2000);
    const delay = () => new Promise(r => setTimeout(r, delayTime));

    if (showAsSnippet) {
      setSnippetMessage(content);
      setShowSnippet(true);
      await delay();
      setShowSnippet(false);
      setSnippetMessage(null);
    }

    setIsTyping(true);
    await delay();
    setIsTyping(false);

    addChatMessage({ role: 'assistant', content, buttons });
  }, [addChatMessage]);

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
    messageQueueRef.current = [];
    setShowSnippet(false);
    setSnippetMessage(null);
  }, []);

  // HANDLE PENDING TRIGGERS
  useEffect(() => {
    if (!pendingTrigger || isProcessingRef.current) return;

    const handleTrigger = async () => {
      isProcessingRef.current = true;

      // Greeting once per session
      if (!userSession.greetingSentThisSession) {
        const greeting = !userSession.hasBeenIntroduced ? `Hi ${userSession.userName}, I'm Lee!` : `Hi ${userSession.userName}, nice to see you back!`;
        await sendMessageWithDelay(greeting, undefined, 3000, true);
        updateUserSession({ hasBeenIntroduced: true, greetingSentThisSession: true });
      }

      // Contextual message
      if (pendingTrigger.type === 'error' && pendingTrigger.details) {
        const [type, integrationId] = pendingTrigger.details.split(':');
        if (type === 'integration') {
          const integration = integrations.find(i => i.id === integrationId);
          const integrationName = integration?.name || integrationId;
          const attempts = userSession.integrationAttempts[integrationId];

          if (attempts?.escalated) {
            await sendMessageWithDelay(`Got it — if it happens again, I'll escalate for help.`, undefined, 4000, true);
          } else {
            await sendMessageWithDelay(`It looks like you ran into an error while connecting ${integrationName}. Can you try connecting it again?`, undefined, 4000, true);
          }
        } else {
          await sendMessageWithDelay(`I see an upload error on this step — can you try uploading the file once more?`, undefined, 4000, true);
        }
      } else if (pendingTrigger.type === 'stuck') {
        await sendMessageWithDelay(`Noticed you might be stuck. Want a quick tip?`, [
          { label: 'Yes, show me a tip', action: 'show_tip' },
          { label: "No, I'm good", action: 'decline_help' },
        ], 4000, true);
      } else if (pendingTrigger.type === 'happy') {
        await sendMessageWithDelay(`Congrats on making your first demo! 🎉 Want me to schedule a quick call to help you get more value?`, [
          { label: 'Schedule a call', action: 'schedule_call' },
          { label: 'Send me tips instead', action: 'send_tips' },
        ], 4000, true);
        updateUserSession({ firstDemoCompleted: true });
      }

      setPendingTrigger(null);
      isProcessingRef.current = false;
    };

    handleTrigger();
  }, [pendingTrigger, userSession, integrations, sendMessageWithDelay, updateUserSession]);

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
