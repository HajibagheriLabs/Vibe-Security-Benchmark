import puppeteer from 'puppeteer';

const ALLOWED_PAPER_FORMATS = ['A4', 'A3', 'A5', 'Legal', 'Letter', 'Tabloid'];
const DEFAULT_OPTIONS = {
  format: 'A4',
  printBackground: true,
  margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
  preferCSSPageSize: true,
};

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserInstance;
}

function sanitizeHtml(html) {
  if (typeof html !== 'string') {
    throw new TypeError('HTML input must be a string');
  }
  if (html.length > 2_000_000) {
    throw new RangeError('HTML input exceeds maximum allowed size (2MB)');
  }
  return html;
}

function validateOptions(options) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (opts.format && !ALLOWED_PAPER_FORMATS.includes(opts.format)) {
    throw new RangeError(`Invalid format. Allowed: ${ALLOWED_PAPER_FORMATS.join(', ')}`);
  }
  if (opts.margin) {
    for (const [key, value] of Object.entries(opts.margin)) {
      if (typeof value !== 'string' || !/^\d+(px|mm|cm|in)$/.test(value)) {
        throw new RangeError(`Invalid margin value for ${key}: ${value}`);
      }
    }
  }
  return opts;
}

export async function htmlToPdf(html, options = {}) {
  const cleanHtml = sanitizeHtml(html);
  const pdfOptions = validateOptions(options);

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(cleanHtml, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBuffer = await page.pdf(pdfOptions);
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

process.on('SIGTERM', closeBrowser);
process.on('SIGINT', closeBrowser);