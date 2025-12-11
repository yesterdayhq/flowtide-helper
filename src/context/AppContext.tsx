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
  triggerShareFlow: () => void;

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
  hasPublishedThisSession: false,
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
    type: 'error' | 'stuck' | 'share';
    details?: string;
  } | null>(null);

  const isProcessingRef = useRef(false);
  const integrationAttemptRef = useRef<Record<string, number>>({});
  const cancelTriggerRef = useRef(false);

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
    // Mark that demo was published this session to disable stuck detection
    updateUserSession({ hasPublishedThisSession: true });
  }, [updateUserSession]);

  const findIntegration = useCallback((id: string) => integrations.find(i => i.id === id), [integrations]);

  // --------------------------
  // INTEGRATIONS - UPDATED
  // --------------------------
  const connectIntegration = useCallback(async (integrationId: string) => {
    if (!integrationAttemptRef.current[integrationId]) integrationAttemptRef.current[integrationId] = 0;
    integrationAttemptRef.current[integrationId] += 1;
    const attempt = integrationAttemptRef.current[integrationId];

    const currentIntegration = integrations.find(i => i.id === integrationId);
    if (currentIntegration?.connected) return;

    // Only cancel trigger for non-HubSpot integrations when user attempts to reconnect
    // For HubSpot, let the first trigger go through, but cancel if Lee has already reached out
    if (integrationId !== 'hubspot') {
      setPendingTrigger((prev) => {
        const prevDetails = prev?.details?.toLowerCase();
        const checkFor = `integration:${integrationId}`.toLowerCase();
        if (!prev) return prev;
        if (prev.type === 'error' && prevDetails === checkFor) {
          cancelTriggerRef.current = true;
          return null;
        }
        return prev;
      });
    } else {
      // For HubSpot: if Lee has already started the conversation, don't trigger again
      const activeThread = userSession.activeThread;
      if (activeThread?.type === 'error' && activeThread.integration === 'hubspot' && activeThread.hubspotFlowStage) {
        // Lee has already reached out, don't restart the flow
        setPendingTrigger((prev) => {
          if (!prev) return prev;
          if (prev.type === 'error' && prev.details?.toLowerCase().includes('hubspot')) {
            cancelTriggerRef.current = true;
            return null;
          }
          return prev;
        });
      }
    }

    setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'connecting' } : i));
    await new Promise((r) => setTimeout(r, 300));

    // HubSpot ALWAYS fails with error code 500
    if (integrationId === 'hubspot') {
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'error', connected: false } : i));
      setIntegrationError({ id: integrationId, message: 'OAuth connection failed: Error 500 - Internal Server Error' });
      setPendingTrigger({ type: 'error', details: `integration:${integrationId}` });
      return;
    }

    // Salesforce always fails
    if (integrationId === 'salesforce') {
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'error', connected: false } : i));
      setIntegrationError({ id: integrationId, message: 'OAuth connection failed for Salesforce.' });
      setPendingTrigger({ type: 'error', details: `integration:${integrationId}` });
      return;
    }

    // Google Analytics: fail on first attempt, succeed on second
    if (attempt === 1) {
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'error', connected: false } : i));
      setIntegrationError({
        id: integrationId,
        message: 'OAuth connection failed for Google Analytics.',
      });
      setPendingTrigger({ type: 'error', details: `integration:${integrationId}` });
    } else {
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'connected', connected: true } : i));
      setIntegrationError((prev) => (prev && prev.id === integrationId ? null : prev));
    }
  }, [integrations, userSession.activeThread]);

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

  const triggerShareFlow = useCallback(() => {
    if (isProcessingRef.current) return;
    if (userSession.firstDemoCompleted) return;
    setPendingTrigger({ type: 'share' });
  }, [userSession.firstDemoCompleted]);

  const resetDemo = useCallback(() => {
    setDemo({ id: crypto.randomUUID(), title: 'My First Demo', steps: [], isPublished: false, createdAt: new Date(), updatedAt: new Date() });
    setIntegrations(defaultIntegrations);
    setIntegrationError(null);
    setUserSession({ ...defaultUserSession, hasBeenIntroduced: false, greetingSentThisSession: false, hasPublishedThisSession: false });
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
  // HANDLE PENDING TRIGGERS - UPDATED WITH NEW SHARE FLOW
  // --------------------------
  useEffect(() => {
    if (!pendingTrigger || isProcessingRef.current) return;

    const handleTrigger = async () => {
      isProcessingRef.current = true;
      const currentTrigger = { ...pendingTrigger };

      // Wait 20 seconds for HubSpot errors, 10 seconds for others
      const isHubSpot = currentTrigger.details?.includes('hubspot');
      const delay = isHubSpot ? 20000 : 10000;
      await new Promise(r => setTimeout(r, delay));

      if (cancelTriggerRef.current || !pendingTrigger) {
        isProcessingRef.current = false;
        cancelTriggerRef.current = false;
        return;
      }

      await new Promise(r => setTimeout(r, 100));

      if (currentTrigger.type === 'error' && currentTrigger.details) {
        const [, integrationId] = currentTrigger.details.split(':');
        const integrationNow = findIntegration(integrationId);
        if (integrationNow?.connected) {
          setPendingTrigger(null);
          isProcessingRef.current = false;
          return;
        }
      }

      // Send messages
      if (currentTrigger.type === 'error' && currentTrigger.details) {
        const [triggerType, integrationId] = currentTrigger.details.split(':');
        if (triggerType === 'integration') {
          const integration = findIntegration(integrationId);
          const integrationName = integration?.name || integrationId;

          if (integrationId === 'hubspot') {
            // NEW HUBSPOT FLOW
            addChatMessage({
              role: 'assistant',
              content: "Hey, Alex, looks like your HubSpot integration didn't work.",
            });

            await new Promise(r => setTimeout(r, 2000));

            addChatMessage({
              role: 'assistant',
              content: "What was the error code?",
            });

            updateUserSession({
              activeThread: {
                id: `error-${Date.now()}`,
                type: 'error',
                integration: integrationId,
                resolved: false,
                awaitingResponse: true,
                skipNextReply: false,
                hubspotFlowStage: 'awaiting_error_code',
                followUpSent: false,
              },
            });
          } else if (integrationId === 'salesforce') {
            // SALESFORCE MESSAGES
            addChatMessage({
              role: 'assistant',
              content: "Hey, Alex, I'm Lee from Flowtide. I noticed you ran into an error when trying to connect to Salesforce.",
            });

            await new Promise(r => setTimeout(r, 2000));

            addChatMessage({
              role: 'assistant',
              content: "We're aware of the issue and are working on a fix. We apologize for that. We'll reach out once it's fixed.",
            });

            updateUserSession({
              activeThread: {
                id: `error-${Date.now()}`,
                type: 'error',
                integration: integrationId,
                resolved: false,
                awaitingResponse: true,
                skipNextReply: false,
                followUpSent: false,
              },
            });
          } else {
            // Google Analytics flow (original)
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
                id: `error-${Date.now()}`,
                type: 'error',
                integration: integrationId,
                resolved: false,
                awaitingResponse: true,
                skipNextReply: false,
                followUpSent: false,
              },
            });
          }
        }
      } else if (pendingTrigger.type === 'stuck') {
        const stepId = pendingTrigger.details;

        // First message
        addChatMessage({
          role: 'assistant',
          content: "Hey, Alex, looks like you might be stuck. I want to help you feel confident to publish your demo!",
        });

        await new Promise(r => setTimeout(r, 2000));

        // Second message
        addChatMessage({
          role: 'assistant',
          content: "Want help picking what to do next to finish your demo?",
          buttons: [
            { label: "Yes", action: 'stuck_help_yes' },
            { label: "No", action: 'stuck_help_no' },
          ],
        });

        updateUserSession({
          activeThread: {
            id: `stuck-${Date.now()}`,
            type: 'stuck',
            stepId,
            resolved: false,
            awaitingResponse: true,
            skipNextReply: false,
            followUpSent: false,
          },
        });
      } else if (pendingTrigger.type === 'share') {
        // New share flow - triggers 30 seconds after publish if they haven't copied the link
        addChatMessage({
          role: 'assistant',
          content: "Hey, Alex, congrats on publishing your first demo 🥳! Most teams share their demo with a few teammates before sending it to prospects.",
        });

        // Wait 3 seconds with typing indicator
        setIsTyping(true);
        await new Promise(r => setTimeout(r, 3000));
        setIsTyping(false);

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
            id: `share-${Date.now()}`,
            type: 'share',
            resolved: false,
            awaitingResponse: true,
            skipNextReply: false,
            followUpSent: false,
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
        triggerError, triggerStuck, triggerShareFlow,
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
