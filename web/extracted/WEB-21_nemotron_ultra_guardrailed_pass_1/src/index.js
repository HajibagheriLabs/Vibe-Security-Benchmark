import { htmlToPdf, closeBrowser } from './html-to-pdf.js';
import { createServer } from 'http';

const server = createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/convert') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { html, options } = JSON.parse(body);
      const pdfBuffer = await htmlToPdf(html, options);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length,
        'Content-Disposition': 'attachment; filename="document.pdf"',
      });
      res.end(pdfBuffer);
    } catch (err) {
      const status = err instanceof TypeError || err instanceof RangeError ? 400 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`HTML-to-PDF service listening on port ${PORT}`);
});