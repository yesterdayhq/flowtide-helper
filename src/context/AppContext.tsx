import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Demo, DemoStep, Integration, UserSession, ChatMessage, ActiveThread, IntegrationAttempt } from '@/types/demo';

interface AppContextType {
  demo: Demo | null;
  setDemo: React.Dispatch<React.SetStateAction<Demo | null>>;
  integrations: Integration[];
  connectIntegration: (integrationId: string) => Promise<void>;
  integrationError: { id: string; message: string } | null;
  addStep: (step: DemoStep) => void;
  updateStep: (stepId: string, update: Partial<DemoStep>) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  activeThread: ActiveThread | null;
  setActiveThread: React.Dispatch<React.SetStateAction<ActiveThread | null>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [demo, setDemo] = useState<Demo | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationError, setIntegrationError] = useState<{ id: string; message: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);

  // Track attempts for first-click fail logic
  const integrationAttemptRef = useRef<Record<string, number>>({});

  const connectIntegration = useCallback(async (integrationId: string) => {
    // Salesforce: always succeed
    if (integrationId === 'salesforce') {
      setIntegrations(prev =>
        prev.map(i =>
          i.id === 'salesforce' ? { ...i, status: 'connected', connected: true } : i
        )
      );
      setIntegrationError(null);
      return;
    }

    // HubSpot / GA: fail first click, succeed second click
    if (!integrationAttemptRef.current[integrationId]) integrationAttemptRef.current[integrationId] = 1;
    else integrationAttemptRef.current[integrationId]++;

    if (integrationAttemptRef.current[integrationId] === 1) {
      setIntegrations(prev =>
        prev.map(i =>
          i.id === integrationId ? { ...i, status: 'error', connected: false } : i
        )
      );
      setIntegrationError({
        id: integrationId,
        message: `OAuth connection failed for ${integrationId === 'hubspot' ? 'HubSpot' : 'Google Analytics'}.`,
      });
    } else {
      setIntegrations(prev =>
        prev.map(i =>
          i.id === integrationId ? { ...i, status: 'connected', connected: true } : i
        )
      );
      setIntegrationError(null);
    }
  }, []);

  const addStep = useCallback((step: DemoStep) => {
    setDemo(prev => prev ? { ...prev, steps: [...prev.steps, step] } : null);
  }, []);

  const updateStep = useCallback((stepId: string, update: Partial<DemoStep>) => {
    setDemo(prev => prev ? {
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, ...update } : s)
    } : null);
  }, []);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages(prev => [...prev, msg]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        demo,
        setDemo,
        integrations,
        connectIntegration,
        integrationError,
        addStep,
        updateStep,
        chatMessages,
        addChatMessage,
        activeThread,
        setActiveThread,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
