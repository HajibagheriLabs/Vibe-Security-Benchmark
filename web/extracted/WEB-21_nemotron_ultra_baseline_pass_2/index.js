const puppeteer = require('puppeteer');

/**
 * Converts an HTML string to a PDF document.
 * @param {string} html - The HTML content to convert.
 * @param {Object} [options={}] - PDF generation options.
 * @param {string} [options.format='A4'] - Paper format (e.g., 'A4', 'Letter', 'Legal').
 * @param {boolean} [options.printBackground=true] - Whether to print background graphics.
 * @param {string|Object} [options.margin] - Page margins (e.g., '1cm', { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }).
 * @param {boolean} [options.landscape=false] - Page orientation.
 * @param {string} [options.scale='1'] - Scale of the rendering (0.1 to 2).
 * @param {boolean} [options.preferCSSPageSize=false] - Use CSS @page size instead of format.
 * @param {number} [options.timeout=30000] - Navigation timeout in ms.
 * @param {string} [options.waitUntil='networkidle0'] - Wait condition before generating PDF.
 * @returns {Promise<Buffer>} PDF document as a Buffer.
 */
async function htmlToPdf(html, options = {}) {
  const {
    format = 'A4',
    printBackground = true,
    margin = { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    landscape = false,
    scale = '1',
    preferCSSPageSize = false,
    timeout = 30000,
    waitUntil = 'networkidle0'
  } = options;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil, timeout });
    
    // Allow time for fonts, images, and dynamic content to render
    await page.evaluateHandle('document.fonts.ready');
    
    const pdfBuffer = await page.pdf({
      format,
      printBackground,
      margin,
      landscape,
      scale,
      preferCSSPageSize
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Converts HTML to PDF and saves directly to a file.
 * @param {string} html - The HTML content to convert.
 * @param {string} outputPath - Path to save the PDF file.
 * @param {Object} [options={}] - PDF generation options (same as htmlToPdf).
 * @returns {Promise<void>}
 */
async function htmlToPdfFile(html, outputPath, options = {}) {
  const fs = require('fs').promises;
  const pdfBuffer = await htmlToPdf(html, options);
  await fs.writeFile(outputPath, pdfBuffer);
}

module.exports = { htmlToPdf, htmlToPdfFile };