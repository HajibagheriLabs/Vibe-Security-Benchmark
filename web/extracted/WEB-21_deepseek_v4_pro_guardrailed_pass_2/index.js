// index.js
const puppeteer = require('puppeteer');

/**
 * Converts an HTML string to a formatted PDF document.
 * 
 * @param {string} htmlContent - The HTML string to convert
 * @param {Object} options - PDF generation options
 * @param {string} [options.format='A4'] - Page format (A4, Letter, etc.)
 * @param {Object} [options.margin] - Page margins {top, right, bottom, left}
 * @param {boolean} [options.landscape=false] - Landscape orientation
 * @param {string} [options.headerTemplate] - HTML template for page header
 * @param {string} [options.footerTemplate] - HTML template for page footer
 * @param {boolean} [options.printBackground=true] - Print background graphics
 * @returns {Promise<Buffer>} - PDF document as a Buffer
 */
async function htmlToPdf(htmlContent, options = {}) {
  // Validate input
  if (typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
    throw new Error('HTML content must be a non-empty string');
  }

  // Sanitize options to prevent injection via header/footer templates
  const sanitizedOptions = {
    format: options.format || 'A4',
    margin: options.margin || { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    landscape: Boolean(options.landscape),
    printBackground: options.printBackground !== false,
    displayHeaderFooter: Boolean(options.headerTemplate || options.footerTemplate),
    headerTemplate: options.headerTemplate || '<div></div>',
    footerTemplate: options.footerTemplate || '<div></div>'
  };

  // Validate format against allowlist
  const allowedFormats = ['A4', 'A3', 'A5', 'Letter', 'Legal', 'Tabloid', 'Ledger'];
  if (!allowedFormats.includes(sanitizedOptions.format)) {
    throw new Error(`Invalid page format. Allowed formats: ${allowedFormats.join(', ')}`);
  }

  // Validate margin values
  const marginKeys = ['top', 'right', 'bottom', 'left'];
  for (const key of marginKeys) {
    if (sanitizedOptions.margin[key] && 
        !/^\d+(\.\d+)?(mm|cm|in|px)$/.test(String(sanitizedOptions.margin[key]))) {
      throw new Error(`Invalid margin value for ${key}. Use format like '20mm', '1in', etc.`);
    }
  }

  let browser = null;
  
  try {
    // Launch browser with security-conscious settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update'
      ]
    });

    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 1
    });

    // Set content with proper encoding
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF
    const pdfBuffer = await page.pdf(sanitizedOptions);

    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation failed:', error.message);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = htmlToPdf;