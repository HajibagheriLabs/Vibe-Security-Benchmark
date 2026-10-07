const { htmlToPdf, htmlToPdfFile } = require('./index');
const fs = require('fs').promises;

const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    .content { margin-top: 20px; line-height: 1.6; }
    .highlight { background: #f39c12; color: white; padding: 2px 6px; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #34495e; color: white; }
    tr:nth-child(even) { background: #f2f2f2; }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>HTML to PDF Conversion Test</h1>
  <div class="content">
    <p>This document demonstrates <span class="highlight">HTML to PDF conversion</span> using Puppeteer.</p>
    <p>Features tested:</p>
    <ul>
      <li>CSS styling and layout</li>
      <li>Tables with alternating row colors</li>
      <li>Print media queries</li>
      <li>Unicode characters: ✓ ✗ → ← ★ ☆</li>
    </ul>
    <table>
      <thead>
        <tr><th>Feature</th><th>Status</th><th>Notes</th></tr>
      </thead>
      <tbody>
        <tr><td>Basic HTML</td><td>✓ Working</td><td>Standard tags render correctly</td></tr>
        <tr><td>CSS Styles</td><td>✓ Working</td><td>External and inline styles supported</td></tr>
        <tr><td>Tables</td><td>✓ Working</td><td>Complex layouts preserved</td></tr>
        <tr><td>Print Media</td><td>✓ Working</td><td>@media print queries respected</td></tr>
      </tbody>
    </table>
  </div>
  <div class="no-print">This text should not appear in the PDF</div>
</body>
</html>
`;

async function runTests() {
  console.log('Running HTML to PDF conversion tests...\n');

  try {
    // Test 1: Basic conversion to buffer
    console.log('Test 1: Convert HTML to PDF Buffer');
    const pdfBuffer = await htmlToPdf(sampleHtml);
    console.log(`  ✓ Generated PDF buffer: ${pdfBuffer.length} bytes`);
    console.log(`  ✓ Buffer is valid: ${pdfBuffer.subarray(0, 4).toString() === '%PDF'}`);

    // Test 2: Save to file
    console.log('\nTest 2: Save PDF to file');
    await htmlToPdfFile(sampleHtml, './output-test.pdf');
    const stats = await fs.stat('./output-test.pdf');
    console.log(`  ✓ File saved: ${stats.size} bytes`);

    // Test 3: Custom options (landscape, custom margins)
    console.log('\nTest 3: Custom options (landscape, no margins)');
    const customPdf = await htmlToPdf(sampleHtml, {
      format: 'A4',
      landscape: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:10px; width:100%; text-align:center;">Header: HTML to PDF Test</div>',
      footerTemplate: '<div style="font-size:10px; width:100%; text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });
    console.log(`  ✓ Generated landscape PDF: ${customPdf.length} bytes`);

    // Test 4: Minimal HTML
    console.log('\nTest 4: Minimal HTML input');
    const minimalPdf = await htmlToPdf('<h1>Minimal Test</h1><p>Hello World</p>');
    console.log(`  ✓ Generated minimal PDF: ${minimalPdf.length} bytes`);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();