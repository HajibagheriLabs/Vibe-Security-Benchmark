import htmlToPdf from './html-to-pdf.js';
import { writeFile } from 'fs/promises';

// Example usage
const htmlContent = `
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
  <h1>Sample Document</h1>
  <div class="content">
    <p>This is a sample HTML document that will be converted to PDF.</p>
    <p>It demonstrates the basic functionality of the HTML to PDF converter.</p>
  </div>
</body>
</html>
`;

try {
  const pdfBuffer = await htmlToPdf(htmlContent, {
    format: 'A4',
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    printBackground: true
  });
  
  await writeFile('output.pdf', pdfBuffer);
  console.log('PDF generated successfully: output.pdf');
} catch (error) {
  console.error('Error generating PDF:', error.message);
}