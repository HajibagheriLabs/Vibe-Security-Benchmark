import htmlToPdf from './src/html-to-pdf.js';

const html = '<h1>Hello World</h1>';
const pdfBuffer = await htmlToPdf(html, {
  format: 'A4',
  margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
});

// Save or stream the PDF buffer