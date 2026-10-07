import puppeteer from 'puppeteer';

/**
 * Converts an HTML string to a formatted PDF document.
 * 
 * Security considerations:
 * - HTML content is sanitized before rendering to prevent XSS in the PDF context
 * - No external resources are loaded (images, scripts, stylesheets are blocked)
 * - JavaScript execution is disabled in the rendered page
 * - All network requests are intercepted and blocked
 * 
 * @param {string} html - The HTML string to convert
 * @param {Object} options - PDF formatting options
 * @param {string} [options.format='A4'] - Page format (A4, Letter, etc.)
 * @param {Object} [options.margin] - Page margins {top, right, bottom, left}
 * @param {boolean} [options.landscape=false] - Landscape orientation
 * @param {string} [options.headerTemplate] - HTML template for page header
 * @param {string} [options.footerTemplate] - HTML template for page footer
 * @param {boolean} [options.printBackground=true] - Print background graphics
 * @returns {Promise<Buffer>} - PDF document as a Buffer
 */
export async function htmlToPdf(html, options = {}) {
  if (typeof html !== 'string' || html.trim().length === 0) {
    throw new Error('HTML content must be a non-empty string');
  }

  // Validate and sanitize options
  const sanitizedOptions = validateOptions(options);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-plugins',
        '--no-first-run',
        '--no-default-browser-check'
      ]
    });

    const page = await browser.newPage();

    // Block all network requests to prevent external resource loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Only allow data: URIs for inline content, block everything else
      if (request.url().startsWith('data:')) {
        request.continue();
      } else {
        request.abort();
      }
    });

    // Disable JavaScript execution
    await page.setJavaScriptEnabled(false);

    // Set content with proper security headers
    await page.setContent(sanitizeHtml(html), {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF with formatting options
    const pdfBuffer = await page.pdf({
      format: sanitizedOptions.format,
      landscape: sanitizedOptions.landscape,
      margin: sanitizedOptions.margin,
      printBackground: sanitizedOptions.printBackground,
      displayHeaderFooter: !!(sanitizedOptions.headerTemplate || sanitizedOptions.footerTemplate),
      headerTemplate: sanitizedOptions.headerTemplate,
      footerTemplate: sanitizedOptions.footerTemplate,
      preferCSSPageSize: true
    });

    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Validates and sanitizes PDF formatting options
 */
function validateOptions(options) {
  const validFormats = ['Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
  
  const sanitized = {
    format: 'A4',
    landscape: false,
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    printBackground: true,
    headerTemplate: undefined,
    footerTemplate: undefined
  };

  if (options.format) {
    if (!validFormats.includes(options.format)) {
      throw new Error(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }
    sanitized.format = options.format;
  }

  if (options.landscape !== undefined) {
    if (typeof options.landscape !== 'boolean') {
      throw new Error('landscape must be a boolean');
    }
    sanitized.landscape = options.landscape;
  }

  if (options.margin) {
    const validMargins = ['top', 'right', 'bottom', 'left'];
    for (const key of validMargins) {
      if (options.margin[key] !== undefined) {
        if (typeof options.margin[key] !== 'string' || !/^\d+(\.\d+)?(mm|cm|in|px)$/.test(options.margin[key])) {
          throw new Error(`Invalid margin value for ${key}. Must be a string with units (mm, cm, in, px)`);
        }
        sanitized.margin[key] = options.margin[key];
      }
    }
  }

  if (options.printBackground !== undefined) {
    if (typeof options.printBackground !== 'boolean') {
      throw new Error('printBackground must be a boolean');
    }
    sanitized.printBackground = options.printBackground;
  }

  if (options.headerTemplate !== undefined) {
    if (typeof options.headerTemplate !== 'string') {
      throw new Error('headerTemplate must be a string');
    }
    sanitized.headerTemplate = sanitizeHtml(options.headerTemplate);
  }

  if (options.footerTemplate !== undefined) {
    if (typeof options.footerTemplate !== 'string') {
      throw new Error('footerTemplate must be a string');
    }
    sanitized.footerTemplate = sanitizeHtml(options.footerTemplate);
  }

  return sanitized;
}

/**
 * Sanitizes HTML content to prevent XSS and injection attacks
 * Removes script tags, event handlers, javascript: URLs, and other dangerous content
 */
function sanitizeHtml(html) {
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove inline event handlers (onclick, onload, onerror, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/(?:href|src|action|formaction|background|poster)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '');
  
  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<(?:iframe|object|embed|applet)\b[^>]*>.*?<\/(?:iframe|object|embed|applet)>/gi, '');
  
  // Remove meta refresh tags
  sanitized = sanitized.replace(/<meta[^>]*http-equiv\s*=\s*(?:"refresh"|'refresh')[^>]*>/gi, '');
  
  // Remove base tags
  sanitized = sanitized.replace(/<base\b[^>]*>/gi, '');
  
  // Remove form tags
  sanitized = sanitized.replace(/<form\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/form>/gi, '');
  
  // Remove input tags
  sanitized = sanitized.replace(/<input\b[^>]*>/gi, '');
  
  // Remove CSS expressions
  sanitized = sanitized.replace(/expression\s*\(/gi, '');
  
  // Remove CSS url() with javascript: protocol
  sanitized = sanitized.replace(/url\s*\(\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^)]*)\)/gi, '');
  
  return sanitized;
}

export default htmlToPdf;