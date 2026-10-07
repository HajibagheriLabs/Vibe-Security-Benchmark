const puppeteer = require('puppeteer');

/**
 * Converts an HTML string to a formatted PDF buffer.
 * 
 * @param {string} htmlString - The HTML content to convert.
 * @param {Object} [options] - Optional configuration for the PDF.
 * @param {string} [options.title] - Title for the PDF document.
 * @param {string} [options.format] - Paper format (e.g., 'A4', 'Letter'). Defaults to 'A4'.
 * @param {boolean} [options.displayHeaderFooter] - Whether to display header and footer. Defaults to false.
 * @param {string} [options.headerTemplate] - Custom HTML template for the header.
 * @param {string} [options.footerTemplate] - Custom HTML template for the footer.
 * @param {Object} [options.margin] - Page margins.
 * @returns {Promise<Buffer>} - A Buffer containing the PDF data.
 */
async function convertHtmlToPdf(htmlString, options = {}) {
  const {
    title = 'Document',
    format = 'A4',
    displayHeaderFooter = false,
    headerTemplate = '',
    footerTemplate = '',
    margin = { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
  } = options;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set the HTML content directly
    await page.setContent(htmlString, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: format,
      displayHeaderFooter: displayHeaderFooter,
      headerTemplate: headerTemplate,
      footerTemplate: footerTemplate,
      margin: margin,
      printBackground: true
    });

    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { convertHtmlToPdf };