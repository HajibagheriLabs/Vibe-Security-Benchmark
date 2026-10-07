import puppeteer, { Browser, Page, PDFOptions } from 'puppeteer';
import { z } from 'zod';

const HtmlToPdfInputSchema = z.object({
  html: z.string().min(1).max(2_000_000),
  options: z.object({
    format: z.enum(['A3', 'A4', 'A5', 'Legal', 'Letter', 'Tabloid']).optional(),
    landscape: z.boolean().optional(),
    margin: z
      .object({
        top: z.string().optional(),
        right: z.string().optional(),
        bottom: z.string().optional(),
        left: z.string().optional(),
      })
      .optional(),
    printBackground: z.boolean().optional(),
    preferCSSPageSize: z.boolean().optional(),
  }).optional(),
});

type HtmlToPdfInput = z.infer<typeof HtmlToPdfInputSchema>;
type PdfOptions = Omit<PDFOptions, 'path'>;

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    });
  }
  return browser;
}

function sanitizeHtml(html: string): string {
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
  ];

  let sanitized = html;
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }
  return sanitized;
}

function mapOptions(inputOptions: HtmlToPdfInput['options']): PdfOptions {
  const options: PdfOptions = {
    printBackground: inputOptions?.printBackground ?? true,
    preferCSSPageSize: inputOptions?.preferCSSPageSize ?? true,
  };

  if (inputOptions?.format) {
    options.format = inputOptions.format;
  }
  if (inputOptions?.landscape !== undefined) {
    options.landscape = inputOptions.landscape;
  }
  if (inputOptions?.margin) {
    options.margin = inputOptions.margin;
  }

  return options;
}

export async function htmlToPdf(input: HtmlToPdfInput): Promise<Buffer> {
  const parsed = HtmlToPdfInputSchema.parse(input);
  const sanitizedHtml = sanitizeHtml(parsed.html);
  const pdfOptions = mapOptions(parsed.options);

  const browserInstance = await getBrowser();
  const page: Page = await browserInstance.newPage();

  try {
    await page.setContent(sanitizedHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf(pdfOptions);
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});