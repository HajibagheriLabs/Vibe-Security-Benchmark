// test.js
const htmlToPdf = require('./index.js');
const fs = require('fs');
const path = require('path');

async function test() {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        .content { line-height: 1.6; }
      </style>
    </head>
    <body>
      <h1>Test Document</h1>
      <div class="content">
        <p>This is a test PDF generated from HTML.</p>
        <p>It demonstrates the conversion functionality.</p>
      </div>
    </body>
    </html>
  `;

  try {
    const pdfBuffer = await htmlToPdf(sampleHtml, {
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true
    });

    const outputPath = path.join(__dirname, 'output.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`PDF generated successfully: ${outputPath}`);
    console.log(`File size: ${pdfBuffer.length} bytes`);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

test();