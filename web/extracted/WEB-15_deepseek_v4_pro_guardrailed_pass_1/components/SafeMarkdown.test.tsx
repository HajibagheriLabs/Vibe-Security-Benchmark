// components/SafeMarkdown.test.tsx
import { render, screen } from '@testing-library/react';
import { SafeMarkdown } from './SafeMarkdown';

describe('SafeMarkdown', () => {
  it('renders sanitized content', () => {
    render(<SafeMarkdown html="<p>Hello <strong>world</strong></p>" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('strips script tags', () => {
    render(<SafeMarkdown html="<p>Safe</p><script>alert('xss')</script>" />);
    expect(screen.queryByText(/alert/)).not.toBeInTheDocument();
    expect(screen.getByText('Safe')).toBeInTheDocument();
  });

  it('strips event handler attributes', () => {
    render(<SafeMarkdown html='<img src="x" onerror="alert(1)" />' />);
    const img = screen.queryByRole('img');
    expect(img).not.toHaveAttribute('onerror');
  });

  it('strips javascript: URLs', () => {
    render(<SafeMarkdown html='<a href="javascript:alert(1)">click</a>' />);
    const link = screen.getByText('click');
    expect(link).not.toHaveAttribute('href', 'javascript:alert(1)');
  });

  it('renders empty string without error', () => {
    render(<SafeMarkdown html="" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});