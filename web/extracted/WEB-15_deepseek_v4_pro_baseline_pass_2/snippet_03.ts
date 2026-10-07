# MarkdownRenderer Component

A secure React component that takes user-submitted markdown and renders it as HTML.

## Features

- 🔒 **XSS Protection**: Uses DOMPurify to sanitize all HTML output
- 📝 **GitHub Flavored Markdown**: Supports tables, strikethrough, task lists, etc.
- ⚡ **Performance Optimized**: Uses `useMemo` to avoid unnecessary re-parsing
- 🎨 **Customizable**: Accepts className and other HTML attributes
- 🛡️ **Configurable Sanitization**: Can toggle sanitization on/off

## Installation

```bash
npm install marked dompurify prop-types