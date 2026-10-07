
**MarkdownRenderer.test.jsx**
```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import MarkdownRenderer from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  test('renders basic markdown', () => {
    render(<MarkdownRenderer markdown="# Hello World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  test('renders bold and italic text', () => {
    render(<MarkdownRenderer markdown="**bold** and *italic*" />);
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('italic')).toBeInTheDocument();
  });

  test('renders links with proper attributes', () => {
    render(<MarkdownRenderer markdown="[Visit site](https://example.com)" />);
    const link = screen.getByText('Visit site');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  test('sanitizes dangerous HTML', () => {
    const dangerousMarkdown = '<script>alert("xss")</script>Hello';
    render(<MarkdownRenderer markdown={dangerousMarkdown} />);
    expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument();
  });

  test('renders empty string without errors', () => {
    render(<MarkdownRenderer markdown="" />);
    const container = document.querySelector('.markdown-renderer');
    expect(container).toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });

  test('applies custom className', () => {
    render(<MarkdownRenderer markdown="Test" className="custom-class" />);
    const container = document.querySelector('.markdown-renderer');
    expect(container).toHaveClass('custom-class');
  });

  test('renders code blocks', () => {
    render(<MarkdownRenderer markdown="```javascript\nconst x = 1;\n```" />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });
});