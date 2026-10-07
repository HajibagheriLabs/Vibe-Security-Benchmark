src/types/chat.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}