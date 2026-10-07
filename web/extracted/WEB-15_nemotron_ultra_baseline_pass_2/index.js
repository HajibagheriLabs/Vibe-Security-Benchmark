import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import MarkdownRenderer from './MarkdownRenderer';
import './MarkdownRenderer.css';

const App = () => {
  const [markdown, setMarkdown] = useState(`# Welcome to Markdown Renderer

## Features

- **Safe rendering** with DOMPurify sanitization
- **GitHub-flavored markdown** support via marked.js
- **Syntax highlighting** ready (add highlight.js or prism.js)
- **Responsive** tables and images

### Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

### Table

| Feature | Status |
|---------|--------|
| Security | ✅ |
| Performance | ✅ |
| Accessibility | ✅ |

### Blockquote

> "Security is not a product, it's a process."
> — Bruce Schneier

### Task List

- [x] Implement markdown parsing
- [x] Add XSS protection
- [ ] Add syntax highlighting
- [ ] Add copy-to-clipboard for code blocks
`);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h2>Editor</h2>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            style={{
              width: '100%',
              height: '500px',
              fontFamily: 'monospace',
              fontSize: '14px',
              padding: '12px',
              border: '1px solid #d1d5da',
              borderRadius: '6px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
            placeholder="Write markdown here..."
          />
        </div>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h2>Preview</h2>
          <div style={{
            border: '1px solid #e1e4e8',
            borderRadius: '6px',
            padding: '24px',
            minHeight: '500px',
            backgroundColor: '#fff'
          }}>
            <MarkdownRenderer markdown={markdown} />
          </div>
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);