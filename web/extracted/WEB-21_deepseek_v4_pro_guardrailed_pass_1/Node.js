# HTML to PDF Converter

A secure Node.js utility that converts HTML strings to formatted PDF documents using Puppeteer.

## Security Features

- **XSS Protection**: HTML content is sanitized to remove scripts, event handlers, and dangerous URLs
- **Network Isolation**: All external network requests are blocked
- **JavaScript Disabled**: JavaScript execution is disabled in the rendered page
- **Resource Blocking**: External images, stylesheets, and other resources are blocked

## Installation

```bash
npm install