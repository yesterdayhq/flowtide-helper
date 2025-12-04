import React, { createContext, useContext, useState, useCallback } from 'react';
import { Integration, UserSession, ChatMessage, ActiveThread } from '@/types/demo';

interface AppContextType {
  integrations: Integration[];
  connectIntegration: (integrationId: string) => void;
  integrationError: { [key: string]: string };
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  isTyping: boolean;
  setIsTyping: (val: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (val: boolean) => void;
  userSession: UserSession | null;
  updateUserSession: (session: Partial<UserSession>) => void;
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

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [integrations, setIntegrations] = useState<Integration[]>(defaultIntegrations);
  const [integrationError, setIntegrationError] = useState<{ [key: string]: string }>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userSession, setUserSession] = useState<UserSession | null>({
    userName: 'Andrew',
    activeThread: null,
  });
  const [showSnippet, setShowSnippet] = useState(false);
  const [snippetMessage, setSnippetMessage] = useState<string | null>(null);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const updateUserSession = useCallback((session: Partial<UserSession>) => {
    setUserSession((prev) => ({ ...prev, ...session }));
  }, []);

  const clearSnippet = useCallback(() => {
    setShowSnippet(false);
    setSnippetMessage(null);
  }, []);

  const resetDemo = useCallback(() => {
    setChatMessages([]);
    setIsTyping(false);
    setIsChatOpen(false);
    setUserSession({ userName: 'Andrew', activeThread: null });
    setShowSnippet(false);
    setSnippetMessage(null);
    setIntegrations(defaultIntegrations);
    setIntegrationError({});
  }, []);

  const connectIntegration = useCallback(async (integrationId: string) => {
    setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'connecting' } : i));
    setIntegrationError(prev => ({ ...prev, [integrationId]: '' }));

    try {
      await new Promise((resolve, reject) => setTimeout(() => {
        if (Math.random() < 0.3) reject(new Error('OAuth failed'));
        else resolve(null);
      }, 1200));

      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'connected', connected: true } : i));
    } catch (err: any) {
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'error', connected: false } : i));
      setIntegrationError(prev => ({ ...prev, [integrationId]: `OAuth connection failed for ${integrationId}. Please try again.` }));
    }
  }, []);

  return (
    <AppContext.Provider value={{
      integrations,
      connectIntegration,
      integrationError,
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
      resetDemo
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
