import React, { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

function App() {
  const [markdown, setMarkdown] = useState('# Hello World\n\nThis is **bold** text');

  return (
    <div>
      <textarea 
        value={markdown} 
        onChange={(e) => setMarkdown(e.target.value)} 
      />
      <MarkdownRenderer markdown={markdown} />
    </div>
  );
}