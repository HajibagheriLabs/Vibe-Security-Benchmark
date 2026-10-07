'use client';

import React from 'react';

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export default function ChatMessage({ role, content, isStreaming = false }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap break-words
          ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }
          ${isStreaming ? 'animate-pulse' : ''}
        `}
      >
        <p className="text-sm leading-relaxed">{content}</p>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-blink" />
        )}
      </div>
    </div>
  );
}