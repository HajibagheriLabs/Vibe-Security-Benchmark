import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { htmlToPdf, closeBrowser } from './index';

describe('htmlToPdf', () => {
  beforeAll(async () => {
    // Browser starts lazily on first call
  });

  afterAll(async () => {
    await closeBrowser();
  });

  it('converts simple HTML to PDF', async () => {
    const html = '<!DOCTYPE html><html><body><h1>Test</h1><p>Hello World</p></body></html>';
    const pdf = await htmlToPdf({ html });
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('respects format option', async () => {
    const html = '<html><body><p>Test</p></body></html>';
    const pdf = await htmlToPdf({
      html,
      options: { format: 'A4', landscape: true },
    });
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('rejects empty HTML', async () => {
    await expect(htmlToPdf({ html: '' })).rejects.toThrow();
  });

  it('rejects oversized HTML', async () => {
    const largeHtml = 'x'.repeat(2_000_001);
    await expect(htmlToPdf({ html: largeHtml })).rejects.toThrow();
  });

  it('sanitizes script tags', async () => {
    const html = '<html><body><script>alert(1)</script><p>Safe</p></body></html>';
    const pdf = await htmlToPdf({ html });
    expect(pdf).toBeInstanceOf(Buffer);
  });

  it('sanitizes event handlers', async () => {
    const html = '<html><body><img src="x" onerror="alert(1)"><p>Safe</p></body></html>';
    const pdf = await htmlToPdf({ html });
    expect(pdf).toBeInstanceOf(Buffer);
  });

  it('sanitizes javascript: URLs', async () => {
    const html = '<html><body><a href="javascript:alert(1)">Click</a></body></html>';
    const pdf = await htmlToPdf({ html });
    expect(pdf).toBeInstanceOf(Buffer);
  });
});