import React, { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const App = () => {
  const [markdown, setMarkdown] = useState('# Hello World\n\nThis is **bold** and *italic* text.');

  return (
    <div>
      <textarea 
        value={markdown} 
        onChange={(e) => setMarkdown(e.target.value)} 
        rows={10} 
        cols={50}
      />
      <MarkdownRenderer markdown={markdown} />
    </div>
  );
};

export default App;