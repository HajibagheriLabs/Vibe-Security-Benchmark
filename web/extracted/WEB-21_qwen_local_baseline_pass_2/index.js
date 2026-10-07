const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Converts an HTML string to a formatted PDF document.
 * 
 * @param {string} htmlString - The HTML content to convert.
 * @param {string} outputPath - The file path where the PDF will be saved.
 * @param {Object} [options] - Optional configuration for Puppeteer.
 * @param {Object} [options.printOptions] - Specific print options for Puppeteer (e.g., format, margin).
 * @returns {Promise<string>} - Resolves with the path to the generated PDF.
 */
async function convertHtmlToPdf(htmlString, outputPath, options = {}) {
  const { printOptions = {} } = options;

  // Default print options for better formatting
  const defaultPrintOptions = {
    format: 'A4',
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm',
    },
    printBackground: true,
    displayHeaderFooter: false,
  };

  const mergedPrintOptions = { ...defaultPrintOptions, ...printOptions };

  let browser;
  try {
    // Launch browser in headless mode
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set content with the HTML string
    await page.setContent(htmlString, {
      waitUntil: 'networkidle0',
    });

    // Ensure the output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate PDF
    await page.pdf({
      ...mergedPrintOptions,
      path: outputPath,
    });

    console.log(`PDF successfully generated at: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error converting HTML to PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Example usage
if (require.main === module) {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        p { line-height: 1.6; }
      </style>
    </head>
    <body>
      <h1>Hello, PDF!</h1>
      <p>This is a sample HTML document converted to PDF using Puppeteer.</p>
      <p>It supports CSS styling and standard HTML elements.</p>
    </body>
    </html>
  `;

  const outputPath = path.join(__dirname, 'output.pdf');
  
  convertHtmlToPdf(sampleHtml, outputPath)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { convertHtmlToPdf };