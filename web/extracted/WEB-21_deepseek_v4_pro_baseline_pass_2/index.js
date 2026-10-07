// index.js
const puppeteer = require('puppeteer');

/**
 * Converts an HTML string to a formatted PDF document.
 * 
 * @param {string} htmlString - The HTML content to convert to PDF.
 * @param {Object} [options] - Configuration options for PDF generation.
 * @param {string} [options.format='A4'] - Page format (e.g., 'A4', 'Letter', 'Legal').
 * @param {boolean} [options.landscape=false] - Whether to use landscape orientation.
 * @param {string} [options.marginTop='10mm'] - Top margin.
 * @param {string} [options.marginRight='10mm'] - Right margin.
 * @param {string} [options.marginBottom='10mm'] - Bottom margin.
 * @param {string} [options.marginLeft='10mm'] - Left margin.
 * @param {boolean} [options.printBackground=true] - Whether to print background graphics.
 * @param {string} [options.pageRanges=''] - Page ranges to print (e.g., '1-5, 8, 11-13').
 * @param {boolean} [options.displayHeaderFooter=false] - Whether to display header and footer.
 * @param {string} [options.headerTemplate] - HTML template for the header.
 * @param {string} [options.footerTemplate] - HTML template for the footer.
 * @param {number} [options.scale=1] - Scale of the webpage rendering.
 * @param {boolean} [options.preferCSSPageSize=false] - Prefer CSS @page size over format.
 * @returns {Promise<Buffer>} - A promise that resolves to a Buffer containing the PDF data.
 * 
 * @example
 * const html = '<h1>Hello World</h1><p>This is a test document.</p>';
 * const pdfBuffer = await htmlToPdf(html, { format: 'Letter', landscape: true });
 * await fs.promises.writeFile('output.pdf', pdfBuffer);
 */
async function htmlToPdf(htmlString, options = {}) {
  // Validate input
  if (typeof htmlString !== 'string' || htmlString.trim().length === 0) {
    throw new Error('HTML string must be a non-empty string');
  }

  // Merge default options with user-provided options
  const defaultOptions = {
    format: 'A4',
    landscape: false,
    marginTop: '10mm',
    marginRight: '10mm',
    marginBottom: '10mm',
    marginLeft: '10mm',
    printBackground: true,
    pageRanges: '',
    displayHeaderFooter: false,
    headerTemplate: '',
    footerTemplate: '',
    scale: 1,
    preferCSSPageSize: false
  };

  const pdfOptions = { ...defaultOptions, ...options };

  // Build the margins object
  const margins = {
    top: pdfOptions.marginTop,
    right: pdfOptions.marginRight,
    bottom: pdfOptions.marginBottom,
    left: pdfOptions.marginLeft
  };

  // Prepare the PDF generation options
  const pdfGenerationOptions = {
    format: pdfOptions.format,
    landscape: pdfOptions.landscape,
    margin: margins,
    printBackground: pdfOptions.printBackground,
    pageRanges: pdfOptions.pageRanges,
    displayHeaderFooter: pdfOptions.displayHeaderFooter,
    scale: pdfOptions.scale,
    preferCSSPageSize: pdfOptions.preferCSSPageSize
  };

  // Only include header/footer templates if displayHeaderFooter is true
  if (pdfOptions.displayHeaderFooter) {
    pdfGenerationOptions.headerTemplate = pdfOptions.headerTemplate || 
      '<div style="font-size:9px; width:100%; text-align:center; padding:5px;"></div>';
    pdfGenerationOptions.footerTemplate = pdfOptions.footerTemplate || 
      '<div style="font-size:9px; width:100%; text-align:center; padding:5px;">' +
      'Page <span class="pageNumber"></span> of <span class="totalPages"></span>' +
      '</div>';
  }

  let browser = null;
  try {
    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    // Create a new page
    const page = await browser.newPage();

    // Set the HTML content
    await page.setContent(htmlString, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate the PDF
    const pdfBuffer = await page.pdf(pdfGenerationOptions);

    return pdfBuffer;
  } catch (error) {
    throw new Error(`Failed to convert HTML to PDF: ${error.message}`);
  } finally {
    // Ensure the browser is closed even if an error occurs
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Converts an HTML string to a formatted PDF document and saves it to a file.
 * 
 * @param {string} htmlString - The HTML content to convert to PDF.
 * @param {string} outputPath - The file path where the PDF should be saved.
 * @param {Object} [options] - Configuration options for PDF generation (same as htmlToPdf).
 * @returns {Promise<void>} - A promise that resolves when the PDF has been saved.
 * 
 * @example
 * const html = '<h1>Hello World</h1>';
 * await htmlToPdfFile(html, './output.pdf', { format: 'A4' });
 */
async function htmlToPdfFile(htmlString, outputPath, options = {}) {
  const fs = require('fs').promises;
  
  if (typeof outputPath !== 'string' || outputPath.trim().length === 0) {
    throw new Error('Output path must be a non-empty string');
  }

  const pdfBuffer = await htmlToPdf(htmlString, options);
  await fs.writeFile(outputPath, pdfBuffer);
}

module.exports = {
  htmlToPdf,
  htmlToPdfFile
};