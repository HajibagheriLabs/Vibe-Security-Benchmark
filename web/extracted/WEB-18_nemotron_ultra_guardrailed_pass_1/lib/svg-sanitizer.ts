import { JSDOM } from 'jsdom';

const ALLOWED_TAGS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'defs', 'use', 'symbol', 'marker', 'pattern', 'linearGradient',
  'radialGradient', 'stop', 'clipPath', 'mask', 'filter', 'feGaussianBlur',
  'feOffset', 'feBlend', 'feComposite', 'feMerge', 'feMergeNode', 'title', 'desc',
]);

const ALLOWED_ATTRS = new Set([
  'xmlns', 'viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity',
  'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'transform',
  'id', 'href', 'xlink:href', 'gradientUnits', 'gradientTransform', 'offset',
  'stop-color', 'stop-opacity', 'clipPathUnits', 'maskUnits', 'filterUnits',
  'in', 'in2', 'mode', 'stdDeviation', 'dx', 'dy', 'result', 'operator',
]);

const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript|blob):/i;

function sanitizeAttribute(name: string, value: string): string | null {
  const lowerName = name.toLowerCase();
  if (!ALLOWED_ATTRS.has(lowerName)) return null;
  if (lowerName === 'href' || lowerName === 'xlink:href') {
    if (DANGEROUS_PROTOCOLS.test(value.trim())) return null;
  }
  return value;
}

export function sanitizeSvg(rawSvg: string): string {
  const dom = new JSDOM(rawSvg, { contentType: 'image/svg+xml' });
  const document = dom.window.document;

  const svg = document.querySelector('svg');
  if (!svg) throw new Error('No root <svg> element found');

  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.removeAttribute('xmlns:xlink');

  const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);
  const toRemove: Element[] = [];

  while (walker.nextNode()) {
    const el = walker.currentNode as Element;
    const tagName = el.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      toRemove.push(el);
      continue;
    }

    const attrsToRemove: string[] = [];
    for (const attr of Array.from(el.attributes)) {
      const sanitized = sanitizeAttribute(attr.name, attr.value);
      if (sanitized === null) {
        attrsToRemove.push(attr.name);
      } else if (sanitized !== attr.value) {
        el.setAttribute(attr.name, sanitized);
      }
    }
    attrsToRemove.forEach(name => el.removeAttribute(name));
  }

  toRemove.forEach(el => el.remove());

  return svg.outerHTML;
}

export function validateSvgFile(buffer: Buffer): { valid: boolean; error?: string } {
  if (buffer.length > 1024 * 1024) {
    return { valid: false, error: 'File exceeds 1MB limit' };
  }

  const raw = buffer.toString('utf-8').trim();
  if (!raw.startsWith('<svg') && !raw.startsWith('<?xml')) {
    return { valid: false, error: 'Not a valid SVG file' };
  }

  try {
    sanitizeSvg(raw);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid SVG structure' };
  }
}