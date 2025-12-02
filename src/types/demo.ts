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
}

export interface ChatButton {
  label: string;
  action: string;
}

export interface UserSession {
  userName: string;
  hasBeenIntroduced: boolean;
  lastInteraction: Date | null;
  firstDemoCompleted: boolean;
  currentPage: string;
  stuckDetection: {
    stepId: string | null;
    dwellStart: Date | null;
    clickCount: number;
    lastActivity: Date | null;
  };
}
