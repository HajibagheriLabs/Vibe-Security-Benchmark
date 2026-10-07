// index.js
const puppeteer = require('puppeteer');

/**
 * Converts an HTML string to a PDF buffer.
 * 
 * @param {string} html - The raw HTML string to convert.
 * @param {object} options - Optional configuration.
 * @param {string} options.title - Document title for metadata.
 * @param {boolean} options.printBackground - Include background graphics.
 * @returns {Promise<Buffer>} PDF document buffer.
 */
async function htmlToPdf(html, options = {}) {
  const {
    title = 'Document',
    printBackground = true
  } = options;

  // Validate input to prevent empty or null HTML
  if (typeof html !== 'string' || html.trim() === '') {
    throw new Error('HTML string must be provided and non-empty');
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content with type 'html' to escape content by default
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      },
      title
    });

    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Example usage / Export
module.exports = { htmlToPdf };

// If run directly
if (require.main === module) {
  const sampleHtml = '<h1>Hello PDF</h1><p>This is a test.</p>';
  htmlToPdf(sampleHtml, { title: 'Test Doc' })
    .then(pdf => {
      console.log(`Generated PDF of size: ${pdf.length} bytes`);
      // Write to file for manual verification
      require('fs').writeFileSync('output.pdf', pdf);
    })
    .catch(err => console.error(err));
}