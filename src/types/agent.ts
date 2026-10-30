import { AssistantActionItem } from '../utils/assistantActions';

export interface OllamaConfig {
  url: string;
  model: string;
  apiKey?: string;
}

export type AgentConnectionStatus = 'untested' | 'testing' | 'connected' | 'disconnected';

export interface AgentSummaryData {
  id: string;
  generatedAt: number;
  modelUsed: string;
  weeklyHighlights: string[];
  notesReview: {
    termName: string;
    subjectName: string;
    noteTitle: string;
    summary: string;
  }[];
  studyRecommendations: string[];
  fullText?: string;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
  actions?: AssistantActionItem[];
}
