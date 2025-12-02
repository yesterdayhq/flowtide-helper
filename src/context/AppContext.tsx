import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Demo, DemoStep, Integration, UserSession, ChatMessage } from '@/types/demo';

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

  // Triggers for HappyLead
  triggerError: (type: 'integration' | 'upload', details: string) => void;
  triggerStuck: (stepId: string) => void;
  triggerHappyMoment: () => void;

  // Reset
  resetDemo: () => void;
}

const defaultIntegrations: Integration[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync demo engagement data with your CRM',
    icon: 'hubspot',
    connected: false,
    status: 'disconnected',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Track demo views in your sales pipeline',
    icon: 'salesforce',
    connected: false,
    status: 'disconnected',
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Measure demo performance and conversions',
    icon: 'analytics',
    connected: false,
    status: 'disconnected',
  },
];

const defaultUserSession: UserSession = {
  userName: 'Alex',
  hasBeenIntroduced: false,
  lastInteraction: null,
  firstDemoCompleted: false,
  currentPage: 'builder',
  stuckDetection: {
    stepId: null,
    dwellStart: null,
    clickCount: 0,
    lastActivity: null,
  },
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
  const [pendingTrigger, setPendingTrigger] = useState<{
    type: 'error' | 'stuck' | 'happy';
    details?: string;
  } | null>(null);

  const addStep = useCallback((imageUrl: string | null, annotation: string) => {
    setDemo((prev) => {
      if (!prev) return prev;
      const newStep: DemoStep = {
        id: crypto.randomUUID(),
        order: prev.steps.length + 1,
        imageUrl,
        annotation,
        createdAt: new Date(),
      };
      return {
        ...prev,
        steps: [...prev.steps, newStep],
        updatedAt: new Date(),
      };
    });
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<DemoStep>) => {
    setDemo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((step) =>
          step.id === stepId ? { ...step, ...updates } : step
        ),
        updatedAt: new Date(),
      };
    });
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setDemo((prev) => {
      if (!prev) return prev;
      const filtered = prev.steps.filter((step) => step.id !== stepId);
      return {
        ...prev,
        steps: filtered.map((step, index) => ({ ...step, order: index + 1 })),
        updatedAt: new Date(),
      };
    });
  }, []);

  const reorderSteps = useCallback((newOrder: DemoStep[]) => {
    setDemo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: newOrder.map((step, index) => ({ ...step, order: index + 1 })),
        updatedAt: new Date(),
      };
    });
  }, []);

  const publishDemo = useCallback(() => {
    setDemo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isPublished: true,
        updatedAt: new Date(),
      };
    });
  }, []);

  const connectIntegration = useCallback(async (integrationId: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === integrationId ? { ...int, status: 'connecting' } : int
      )
    );

    // Simulate OAuth flow delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Always fail for demo purposes
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === integrationId ? { ...int, status: 'error' } : int
      )
    );

    const integration = integrations.find((int) => int.id === integrationId);
    setIntegrationError({
      id: integrationId,
      message: `OAuth connection failed for ${integration?.name || 'integration'}. Please try again.`,
    });
  }, [integrations]);

  const clearIntegrationError = useCallback(() => {
    setIntegrationError(null);
  }, []);

  const updateUserSession = useCallback((updates: Partial<UserSession>) => {
    setUserSession((prev) => ({ ...prev, ...updates }));
  }, []);

  const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, newMessage]);
  }, []);

  const triggerError = useCallback((type: 'integration' | 'upload', details: string) => {
    setPendingTrigger({ type: 'error', details: `${type}:${details}` });
    setIsChatOpen(true);
  }, []);

  const triggerStuck = useCallback((stepId: string) => {
    setPendingTrigger({ type: 'stuck', details: stepId });
    setIsChatOpen(true);
  }, []);

  const triggerHappyMoment = useCallback(() => {
    setPendingTrigger({ type: 'happy' });
    setIsChatOpen(true);
  }, []);

  const resetDemo = useCallback(() => {
    setDemo({
      id: crypto.randomUUID(),
      title: 'My First Demo',
      steps: [],
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setIntegrations(defaultIntegrations);
    setIntegrationError(null);
    setUserSession({
      ...defaultUserSession,
      hasBeenIntroduced: false,
    });
    setChatMessages([]);
    setIsTyping(false);
    setPendingTrigger(null);
  }, []);

  // Handle pending triggers
  useEffect(() => {
    if (!pendingTrigger) return;

    const handleTrigger = async () => {
      const delay = () => new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));

      setIsTyping(true);
      await delay();
      setIsTyping(false);

      // Introduction message if needed
      if (!userSession.hasBeenIntroduced) {
        const introVariants = [
          `Hey ${userSession.userName}, I'm Lee, a junior AE with Flowtide!`,
          `Hi ${userSession.userName} — Lee from Flowtide here!`,
        ];
        addChatMessage({
          role: 'assistant',
          content: introVariants[Math.floor(Math.random() * introVariants.length)],
        });
        updateUserSession({ hasBeenIntroduced: true });
        await delay();
        setIsTyping(true);
        await delay();
        setIsTyping(false);
      } else {
        const returningIntros = [
          `Hey ${userSession.userName}, Lee again 😅`,
          `Hi ${userSession.userName}, nice to see you back!`,
        ];
        addChatMessage({
          role: 'assistant',
          content: returningIntros[Math.floor(Math.random() * returningIntros.length)],
        });
        await delay();
        setIsTyping(true);
        await delay();
        setIsTyping(false);
      }

      // Context-specific message
      if (pendingTrigger.type === 'error' && pendingTrigger.details) {
        const [type, name] = pendingTrigger.details.split(':');
        if (type === 'integration') {
          const errorVariants = [
            `It looks like you ran into an error while connecting ${name}. Can you try connecting it again?`,
            `Hmm — I see an error on the Integrations page. Can you try connecting ${name} one more time?`,
          ];
          addChatMessage({
            role: 'assistant',
            content: errorVariants[Math.floor(Math.random() * errorVariants.length)],
          });
        } else {
          addChatMessage({
            role: 'assistant',
            content: `I see an upload error on this step — can you try uploading the file once more?`,
          });
        }
      } else if (pendingTrigger.type === 'stuck') {
        const stuckVariants = [
          `Noticed you might be stuck on this step. Want a quick tip to move forward?`,
          `Need a hand finishing this step?`,
        ];
        addChatMessage({
          role: 'assistant',
          content: stuckVariants[Math.floor(Math.random() * stuckVariants.length)],
          buttons: [
            { label: 'Yes, show me a tip', action: 'show_tip' },
            { label: "No, I'm good", action: 'decline_help' },
          ],
        });
      } else if (pendingTrigger.type === 'happy') {
        addChatMessage({
          role: 'assistant',
          content: `Congrats on making your first demo! 🎉 Would you like me to schedule a quick call to help you get more value from this?`,
          buttons: [
            { label: 'Schedule a call', action: 'schedule_call' },
            { label: 'Send me tips instead', action: 'send_tips' },
          ],
        });
        updateUserSession({ firstDemoCompleted: true });
      }

      setPendingTrigger(null);
    };

    handleTrigger();
  }, [pendingTrigger, userSession, addChatMessage, updateUserSession]);

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
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
