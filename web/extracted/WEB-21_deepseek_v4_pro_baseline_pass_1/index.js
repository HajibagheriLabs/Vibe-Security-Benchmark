// index.js
const puppeteer = require('puppeteer');

/**
 * Converts an HTML string to a formatted PDF document.
 * 
 * @param {string} html - The HTML string to convert.
 * @param {Object} [options] - Optional configuration.
 * @param {Object} [options.pdfOptions] - Puppeteer PDF options (page format, margins, etc.).
 * @param {Object} [options.pageOptions] - Puppeteer page options (viewport, etc.).
 * @param {boolean} [options.landscape] - Whether to use landscape orientation (default: false).
 * @param {string} [options.format] - Paper format (e.g., 'A4', 'Letter', 'Legal') (default: 'A4').
 * @param {Object} [options.margin] - Page margins { top, right, bottom, left } in CSS units.
 * @param {boolean} [options.printBackground] - Whether to print background graphics (default: true).
 * @param {number} [options.timeout] - Navigation timeout in milliseconds (default: 30000).
 * @returns {Promise<Buffer>} - A Promise that resolves to a Buffer containing the PDF data.
 * 
 * @example
 * const pdfBuffer = await htmlToPdf('<h1>Hello World</h1>', { format: 'A4' });
 * require('fs').writeFileSync('output.pdf', pdfBuffer);
 */
async function htmlToPdf(html, options = {}) {
  if (typeof html !== 'string' || html.trim().length === 0) {
    throw new Error('HTML string must be a non-empty string');
  }

  const {
    pdfOptions = {},
    pageOptions = {},
    landscape = false,
    format = 'A4',
    margin = { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    printBackground = true,
    timeout = 30000,
  } = options;

  let browser = null;

  try {
    // Launch a headless browser instance
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Apply page options (viewport, etc.)
    if (Object.keys(pageOptions).length > 0) {
      await page.setViewport(pageOptions.viewport || { width: 800, height: 600 });
      if (pageOptions.userAgent) {
        await page.setUserAgent(pageOptions.userAgent);
      }
    } else {
      await page.setViewport({ width: 800, height: 600 });
    }

    // Set the HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout,
    });

    // Wait for any pending styles/fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Merge PDF options with defaults
    const finalPdfOptions = {
      format,
      landscape,
      printBackground,
      margin,
      ...pdfOptions,
    };

    // Generate the PDF
    const pdfBuffer = await page.pdf(finalPdfOptions);

    return pdfBuffer;
  } catch (error) {
    throw new Error(`Failed to convert HTML to PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Converts an HTML string to a formatted PDF document and saves it to a file.
 * 
 * @param {string} html - The HTML string to convert.
 * @param {string} outputPath - The file path where the PDF should be saved.
 * @param {Object} [options] - Optional configuration (same as htmlToPdf).
 * @returns {Promise<void>} - Resolves when the file has been written.
 */
async function htmlToPdfFile(html, outputPath, options = {}) {
  const pdfBuffer = await htmlToPdf(html, options);
  const fs = require('fs').promises;
  await fs.writeFile(outputPath, pdfBuffer);
}

module.exports = htmlToPdf;
module.exports.htmlToPdf = htmlToPdf;
module.exports.htmlToPdfFile = htmlToPdfFile;
module.exports.default = htmlToPdf;