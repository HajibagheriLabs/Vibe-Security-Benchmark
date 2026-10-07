const { htmlToPdf, htmlToPdfFile } = require('./index');
const fs = require('fs').promises;

const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 2cm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; background: #fafafa; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.75rem; text-align: left; }
    th { background: #3498db; color: white; }
    .footer { text-align: center; margin-top: 2rem; font-size: 0.875rem; color: #666; }
  </style>
</head>
<body>
  <h1>HTML to PDF Conversion Test</h1>
  <p>This document demonstrates <strong>styled HTML</strong> converted to PDF using Puppeteer.</p>
  
  <div class="card">
    <h2>Features</h2>
    <ul>
      <li>Full CSS support (Flexbox, Grid, custom fonts)</li>
      <li>Background graphics and colors</li>
      <li>Page margins and @page rules</li>
      <li>Tables, lists, and complex layouts</li>
    </ul>
  </div>

  <h2>Sample Data Table</h2>
  <table>
    <thead>
      <tr><th>Item</th><th>Description</th><th>Status</th></tr>
    </thead>
    <tbody>
      <tr><td>HTML Parsing</td><td>Parse and render HTML strings</td><td>✅ Complete</td></tr>
      <tr><td>CSS Rendering</td><td>Full stylesheet support</td><td>✅ Complete</td></tr>
      <tr><td>PDF Generation</td><td>High-quality PDF output</td><td>✅ Complete</td></tr>
      <tr><td>File Output</td><td>Save directly to filesystem</td><td>✅ Complete</td></tr>
    </tbody>
  </table>

  <div class="footer">
    Generated on ${new Date().toLocaleString()} | html-to-pdf-converter
  </div>
</body>
</html>
`;

async function runTests() {
  console.log('Testing htmlToPdf (buffer output)...');
  const pdfBuffer = await htmlToPdf(sampleHtml, { format: 'A4', margin: '2cm' });
  console.log(`✓ Generated PDF buffer: ${pdfBuffer.length} bytes`);
  await fs.writeFile('output-buffer.pdf', pdfBuffer);
  console.log('✓ Saved to output-buffer.pdf');

  console.log('\nTesting htmlToPdfFile (direct file output)...');
  await htmlToPdfFile(sampleHtml, 'output-file.pdf', { 
    format: 'Letter', 
    landscape: false,
    margin: { top: '1.5cm', right: '1.5cm', bottom: '1.5cm', left: '1.5cm' }
  });
  console.log('✓ Saved to output-file.pdf');

  console.log('\nTesting with custom options (landscape, scale)...');
  await htmlToPdfFile(sampleHtml, 'output-landscape.pdf', { 
    format: 'A4', 
    landscape: true,
    scale: '0.9',
    margin: '1cm'
  });
  console.log('✓ Saved to output-landscape.pdf');

  console.log('\nAll tests passed!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});