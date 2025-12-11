export interface DemoStep {
  id: string;
  order: number;
  imageUrl: string | null;
  annotation: string;
  createdAt: Date;
}

export interface Demo {
  id: string;
  title: string;
  steps: DemoStep[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  buttons?: ChatButton[];
  threadId?: string; // Track which thread this belongs to
}

export interface ChatButton {
  label: string;
  action: string;
}

export type ThreadType = 'error' | 'stuck' | 'happy' | 'general';

export interface ActiveThread {
  id: string;
  type: ThreadType;
  integrationName?: string;
  integration?: string;
  hubspotFlowStage?: string;
  skipNextReply?: boolean;
  stepId?: string;
  awaitingResponse: boolean;
  resolved: boolean;
  followUpSent: boolean;
}

export interface IntegrationAttempt {
  integrationId: string;
  attempts: number;
  lastAttempt: Date;
  escalated: boolean;
}

export interface UserSession {
  userName: string;
  hasBeenIntroduced: boolean;
  greetingSentThisSession: boolean;
  lastInteraction: Date | null;
  firstDemoCompleted: boolean;
  currentPage: string;
  currentStep: string | null;
  lastInstruction: string | null;
  activeThread: ActiveThread | null;
  integrationAttempts: Record<string, IntegrationAttempt>;
  stuckPromptedSteps: string[]; // Steps where stuck prompt was already shown
  stuckDetection: {
    stepId: string | null;
    dwellStart: Date | null;
    clickCount: number;
    lastActivity: Date | null;
  };
}
