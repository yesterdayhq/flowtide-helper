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
  const cancelTriggerRef = useRef(false);

  // --------------------------
  // UPDATE USER SESSION
  // --------------------------
  const updateUserSession = useCallback((updates: Partial<UserSession>) => {
    setUserSession((prev) => ({ ...prev, ...updates }));
  }, []);

  // --------------------------
  // DEMO FUNCTIONS
  // --------------------------
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

  // --------------------------
  // HELPERS
  // --------------------------
  const findIntegration = useCallback((id: string) => integrations.find(i => i.id === id), [integrations]);

  // --------------------------
  // INTEGRATIONS
  // --------------------------
  const connectIntegration = useCallback(async (integrationId: string) => {
    if (!integrationAttemptRef.current[integrationId]) integrationAttemptRef.current[integrationId] = 0;
    integrationAttemptRef.current[integrationId] += 1;
    const attempt = integrationAttemptRef.current[integrationId];

    const currentIntegration = integrations.find(i => i.id === integrationId);

    // If already connected, skip Lee outreach
    if (currentIntegration?.connected) return;

    // ✅ CANCEL TRIGGER: User is attempting to fix it themselves
    console.log('🔵 connectIntegration called', { integrationId, attempt, hasPendingTrigger: !!pendingTrigger, currentTrigger: pendingTrigger });
    setPendingTrigger((prev) => {
      console.log('🔍 Checking if should cancel');
      console.log('   prev:', prev);
      console.log('   prev.details:', prev?.details);
      console.log('   checkingFor:', `integration:${integrationId}`);
      console.log('   Match?:', prev?.details === `integration:${integrationId}`);
      if (!prev) return prev;
      if (prev.type === 'error' && prev.details === `integration:${integrationId}`) {
        console.log('🟢 CANCELLING TRIGGER', { integrationId });
        cancelTriggerRef.current = true;
        return null;
      }
      console.log('⚠️ NOT CANCELLING - conditions not met');
      return prev;
    });

    setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'connecting' } : i));
    await new Promise((r) => setTimeout(r, 300));

    // Salesforce always fails
    if (integrationId === 'salesforce') {
      console.log('📛 Setting Salesforce error trigger');
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'error', connected: false } : i));
      setIntegrationError({ id: integrationId, message: 'OAuth connection failed for Salesforce.' });
      setPendingTrigger({ type: 'error', details: `integration:${integrationId}` });
      return;
    }

    // HubSpot and Google Analytics: fail on first attempt, succeed on second
    if (attempt === 1) {
      console.log('📛 Setting error trigger (attempt 1)', { integrationId });
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'error', connected: false } : i));
      setIntegrationError({
        id: integrationId,
        message: `OAuth connection failed for ${integrationId === 'hubspot' ? 'HubSpot' : 'Google Analytics'}.`,
      });
      setPendingTrigger({ type: 'error', details: `integration:${integrationId}` });
    } else {
      // ✅ SUCCESS on second attempt
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'connected', connected: true } : i));
      setIntegrationError((prev) => (prev && prev.id === integrationId ? null : prev));
    }
  }, [integrations]);

  const clearIntegrationError = useCallback(() => setIntegrationError(null), []);

  // --------------------------
  // CHAT FUNCTIONS
  // --------------------------
  const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = { ...message, id: crypto.randomUUID(), timestamp: new Date() };
    setChatMessages(prev => [...prev, newMessage]);
  }, []);

  const clearSnippet = useCallback(() => {
    setShowSnippet(false);
    setSnippetMessage(null);
  }, []);

  // --------------------------
  // TRIGGERS
  // --------------------------
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
    cancelTriggerRef.current = false;
    integrationAttemptRef.current = {};
    setShowSnippet(false);
    setSnippetMessage(null);
  }, []);

  // --------------------------
  // HANDLE PENDING TRIGGERS
  // --------------------------
  useEffect(() => {
    if (!pendingTrigger || isProcessingRef.current) return;

    const handleTrigger = async () => {
      console.log('🟡 handleTrigger START', { trigger: pendingTrigger });
      isProcessingRef.current = true;
      
      // Store the current trigger details before the delay
      const currentTrigger = { ...pendingTrigger };
      
      console.log('⏰ Starting 10 second delay...');
      await new Promise(r => setTimeout(r, 10000));
      console.log('⏰ 10 seconds elapsed');

      // ✅ CHECK 0: Was this trigger cancelled?
      console.log('🔍 CHECK 0: cancelTriggerRef =', cancelTriggerRef.current);
      if (cancelTriggerRef.current) {
        console.log('❌ EXITING: Trigger was cancelled');
        isProcessingRef.current = false;
        cancelTriggerRef.current = false;
        return;
      }

      // ✅ CHECK 1: Was the trigger cancelled during the delay?
      console.log('🔍 CHECK 1: pendingTrigger =', pendingTrigger);
      if (!pendingTrigger) {
        console.log('❌ EXITING: pendingTrigger is null');
        isProcessingRef.current = false;
        return;
      }

      // Small delay to let state updates settle
      await new Promise(r => setTimeout(r, 100));

      // ✅ CHECK 2: If integration error, is it now connected?
      if (currentTrigger.type === 'error' && currentTrigger.details) {
        const [, integrationId] = currentTrigger.details.split(':');
        const integrationNow = findIntegration(integrationId);
        console.log('🔍 CHECK 2: integration connected?', { integrationId, connected: integrationNow?.connected });
        if (integrationNow?.connected) {
          console.log('❌ EXITING: Integration is now connected');
          setPendingTrigger(null);
          isProcessingRef.current = false;
          return;
        }
      }

      console.log('✅ SENDING MESSAGES');
      // Send the messages
      if (currentTrigger.type === 'error' && currentTrigger.details) {
        const [triggerType, integrationId] = currentTrigger.details.split(':');
        
        if (triggerType === 'integration') {
          const integration = findIntegration(integrationId);
          const integrationName = integration?.name || integrationId;
          
          addChatMessage({
            role: 'assistant',
            content: `Hi Alex, I'm Lee!\n\nIt looks like you ran into an error while connecting ${integrationName}. Sorry about that!`,
          });
          
          await new Promise(r => setTimeout(r, 2000));
          
          addChatMessage({
            role: 'assistant',
            content: "Sometimes OAuth connections can be finicky. Want to try connecting again?",
            buttons: [
              { label: "I'll try again", action: 'decline_help' },
              { label: "It still doesn't work", action: 'escalate' },
            ],
          });

          updateUserSession({
            activeThread: {
              type: 'error',
              integration: integrationId,
              resolved: false,
              awaitingResponse: true,
              skipNextReply: false,
            },
          });
        }
      } else if (pendingTrigger.type === 'stuck') {
        const stepId = pendingTrigger.details;
        
        addChatMessage({
          role: 'assistant',
          content: "Hey Alex! I noticed you've been on this step for a bit. Need a hand?",
          buttons: [
            { label: "Yes, show me a tip", action: 'show_tip' },
            { label: "No, I'm good", action: 'decline_help' },
          ],
        });

        updateUserSession({
          activeThread: {
            type: 'stuck',
            stepId,
            resolved: false,
            awaitingResponse: true,
            skipNextReply: false,
          },
        });
      } else if (pendingTrigger.type === 'happy') {
        addChatMessage({
          role: 'assistant',
          content: "🎉 Nice work, Alex! You just published your first demo!\n\nWant to schedule a quick call to learn some pro tips?",
          buttons: [
            { label: "Sure, let's chat", action: 'schedule_call' },
            { label: "Just send me tips", action: 'send_tips' },
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
