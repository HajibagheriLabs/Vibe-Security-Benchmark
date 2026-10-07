// components/ChatInterface.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Flag: Sanitization runs on the client for streamed text.
// CSP: 'unsafe-inline' is needed for inline styles/scripts if any, but DOMPurify allows safe HTML.
// Rule §3: XSS Defense.

const getDOMPurifyInstance = () => {
  const window = new JSDOM('').window;
  return DOMPurify(window);
};

const sanitizeHtml = (dirty: string) => {
  const purify = getDOMPurifyInstance();
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href'],
  });
};

export default function ChatInterface() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [response]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setIsLoading(true);
    setResponse(''); // Clear previous response or append in a real app

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader');
      }

      const decoder = new TextDecoder();
      let partialText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        partialText += chunk;
        setResponse(sanitizeHtml(partialText));
      }
    } catch (error) {
      setResponse('Error: Could not connect to AI.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto mb-4 border p-4 rounded bg-gray-100" ref={scrollRef}>
        {response ? (
          <div 
            className="prose"
            dangerouslySetInnerHTML={{ __html: response }} 
          />
        ) : (
          <p className="text-gray-500">Start a conversation...</p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}