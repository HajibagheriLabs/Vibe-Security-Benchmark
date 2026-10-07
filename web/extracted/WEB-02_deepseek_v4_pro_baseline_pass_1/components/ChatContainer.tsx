'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (userMessage: string) => {
    if (isStreaming) return;

    setError(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
    };

    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const allMessages = [...messages, userMsg].map(({ role, content }) => ({
      role,
      content,
    }));

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: allMessages }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      }

      // Final update with any remaining decoded content
      const finalChunk = decoder.decode();
      if (finalChunk) {
        accumulatedContent += finalChunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Stream was aborted
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + '\n\n[Stream stopped]' }
              : msg
          )
        );
      } else {
        console.error('Streaming error:', err);
        setError('Failed to get response. Please try again.');
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMsgId)
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-center">
              Start a conversation by typing a message below.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              isStreaming={
                isStreaming &&
                message.role === 'assistant' &&
                message.id === messages[messages.length - 1]?.id
              }
            />
          ))
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200">
        {isStreaming && (
          <div className="px-4 pt-2">
            <button
              onClick={handleStop}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Stop generating
            </button>
          </div>
        )}
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}