// test.js
const fs = require('fs').promises;
const { htmlToPdf, htmlToPdfFile } = require('./index');

/**
 * Simple test to verify the HTML to PDF conversion works.
 */
async function runTest() {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
        }
        .content {
          line-height: 1.6;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
      </style>
    </head>
    <body>
      <h1>Sample Document</h1>
      <div class="content">
        <p>This is a test document generated from HTML.</p>
        <p>It demonstrates the conversion of HTML to PDF.</p>
      </div>
      <table>
        <tr>
          <th>Item</th>
          <th>Description</th>
          <th>Price</th>
        </tr>
        <tr>
          <td>1</td>
          <td>Sample Item A</td>
          <td>$10.00</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Sample Item B</td>
          <td>$20.00</td>
        </tr>
      </table>
    </body>
    </html>
  `;

  console.log('Testing HTML to PDF conversion...');
  
  // Test 1: Generate PDF buffer
  const pdfBuffer = await htmlToPdf(sampleHtml, {
    format: 'A4',
    printBackground: true
  });
  console.log(`PDF buffer generated successfully: ${pdfBuffer.length} bytes`);

  // Test 2: Save PDF to file
  await htmlToPdfFile(sampleHtml, './test-output.pdf', {
    format: 'Letter',
    landscape: true,
    marginTop: '15mm',
    marginBottom: '15mm'
  });
  console.log('PDF file saved successfully to test-output.pdf');

  // Verify the file exists
  const stats = await fs.stat('./test-output.pdf');
  console.log(`Output file size: ${stats.size} bytes`);

  console.log('All tests passed!');
}

// Run the test if this file is executed directly
if (require.main === module) {
  runTest().catch(error => {
    console.error('Test failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runTest };