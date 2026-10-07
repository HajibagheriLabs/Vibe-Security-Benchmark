const puppeteer = require('puppeteer');

/**
 * Converts an HTML string to a PDF document.
 * @param {string} html - The HTML content to convert.
 * @param {Object} [options={}] - PDF generation options.
 * @param {string} [options.format='A4'] - Paper format (e.g., 'A4', 'Letter', 'Legal').
 * @param {boolean} [options.printBackground=true] - Whether to print background graphics.
 * @param {Object} [options.margin={ top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }] - Page margins.
 * @param {boolean} [options.landscape=false] - Page orientation.
 * @param {string} [options.displayHeaderFooter=false] - Whether to display header/footer.
 * @param {string} [options.headerTemplate=''] - HTML template for header.
 * @param {string} [options.footerTemplate=''] - HTML template for footer.
 * @param {number} [options.timeout=30000] - Navigation timeout in ms.
 * @returns {Promise<Buffer>} PDF document as a Buffer.
 */
async function htmlToPdf(html, options = {}) {
  const {
    format = 'A4',
    printBackground = true,
    margin = { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    landscape = false,
    displayHeaderFooter = false,
    headerTemplate = '',
    footerTemplate = '',
    timeout = 30000,
  } = options;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'networkidle0', timeout });

    const pdfBuffer = await page.pdf({
      format,
      printBackground,
      margin,
      landscape,
      displayHeaderFooter,
      headerTemplate,
      footerTemplate,
    });

    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Converts an HTML string to a PDF and saves it to a file.
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