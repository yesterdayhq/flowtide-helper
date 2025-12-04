import React, { createContext, useContext, useState, useCallback } from 'react';
import { Integration, UserSession, ChatMessage } from '@/types/demo';

interface AppContextType {
  integrations: Integration[];
  connectIntegration: (integrationId: string) => void;
  integrationError: { [key: string]: string };
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

  const connectIntegration = useCallback(async (integrationId: string) => {
    setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, status: 'connecting' } : i));
    setIntegrationError(prev => ({ ...prev, [integrationId]: '' }));

    try {
      // Simulate async OAuth call
      await new Promise((resolve, reject) => setTimeout(() => {
        // Randomly fail for demo
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
    <AppContext.Provider value={{ integrations, connectIntegration, integrationError }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
