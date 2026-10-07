// src/index.js
const express = require('express');
const puppeteer = require('puppeteer');
const { z } = require('zod');

// Schema validation for input
const HtmlToPdfSchema = z.object({
  html: z.string().min(1).max(1000000), // Max 1MB HTML payload
  title: z.string().max(255).optional().default('Document'),
  format: z.enum(['A4', 'Letter', 'Legal']).optional().default('A4'),
  margin: z.object({
    top: z.string().regex(/^\d+mm$/).optional().default('10mm'),
    bottom: z.string().regex(/^\d+mm$/).optional().default('10mm'),
    left: z.string().regex(/^\d+mm$/).optional().default('10mm'),
    right: z.string().regex(/^\d+mm$/).optional().default('10mm'),
  }).optional(),
});

let browser;

// Initialize Puppeteer browser instance
async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browser;
}

// Convert HTML string to PDF Buffer
async function convertHtmlToPdf(html, options = {}) {
  const validated = HtmlToPdfSchema.parse({ html, ...options });
  
  const browser = await initBrowser();
  const page = await browser.newPage();
  
  // Set viewport for consistent rendering
  await page.setViewport({ width: 1280, height: 720 });
  
  // Inject HTML content
  await page.setContent(validated.html, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: validated.format,
    printBackground: true,
    margin: validated.margin,
  });

  await page.close();
  
  return {
    buffer: pdfBuffer,
    contentType: 'application/pdf',
    filename: `${validated.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
  };
}

// Express App Setup
const app = express();
app.use(express.json());

app.post('/api/v1/html-to-pdf', async (req, res) => {
  try {
    const { html, title, format, margin } = req.body;
    
    // Validate input schema manually or rely on Zod inside function
    // Here we do a quick check before calling the heavy function
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'Invalid HTML string provided' });
    }

    const result = await convertHtmlToPdf(html, { title, format, margin });
    
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    
    res.send(result.buffer);
  } catch (error) {
    console.error({ event: 'pdf_conversion_error', error: error.message });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    
    res.status(500).json({ error: 'Internal server error during PDF generation' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
async function start() {
  try {
    await initBrowser();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = { convertHtmlToPdf, app };