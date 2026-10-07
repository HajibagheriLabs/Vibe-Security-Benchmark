// MarkdownRenderer.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders basic markdown formatting', () => {
    render(<MarkdownRenderer markdown="# Hello **World**" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello World');
    expect(screen.getByText('World')).toHaveStyle('font-weight: bold');
  });

  it('renders code blocks', () => {
    render(<MarkdownRenderer markdown="```js\nconst x = 1;\n```" />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('sanitizes script tags', () => {
    render(<MarkdownRenderer markdown='<script>alert("xss")</script>' />);
    expect(screen.queryByText('alert')).not.toBeInTheDocument();
    // Script should be stripped entirely
    const container = screen.getByTestId('markdown-renderer')?.parentElement;
    expect(container?.innerHTML).not.toContain('<script>');
  });

  it('sanitizes javascript: URLs in links', () => {
    render(<MarkdownRenderer markdown='[Click me](javascript:alert(1))' />);
    const link = screen.getByRole('link', { name: 'Click me' });
    expect(link).not.toHaveAttribute('href', 'javascript:alert(1)');
    // href should be removed for unsafe protocols
    expect(link.getAttribute('href')).toBeNull();
  });

  it('sanitizes onerror handlers in images', () => {
    render(<MarkdownRenderer markdown='![img](x onerror="alert(1)")' />);
    const img = screen.getByAltText('img');
    expect(img).not.toHaveAttribute('onerror');
  });

  it('allows safe https links with noopener', () => {
    render(<MarkdownRenderer markdown='[Safe](https://example.com)' />);
    const link = screen.getByRole('link', { name: 'Safe' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('allows relative links', () => {
    render(<MarkdownRenderer markdown='[Relative](/page)' />);
    const link = screen.getByRole('link', { name: 'Relative' });
    expect(link).toHaveAttribute('href', '/page');
  });

  it('renders tables', () => {
    render(<MarkdownRenderer markdown="| A | B |\n|---|---|\n| 1 | 2 |" />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('strips style attributes', () => {
    render(<MarkdownRenderer markdown='<p style="color: red">test</p>' />);
    const p = screen.getByText('test').closest('p');
    expect(p).not.toHaveAttribute('style');
  });
});