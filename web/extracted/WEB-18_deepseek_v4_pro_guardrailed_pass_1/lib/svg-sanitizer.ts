// lib/svg-sanitizer.ts
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

// Security: DOMPurify with strict SVG allowlist to prevent XSS via SVG
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

const SVG_ALLOWED_TAGS = [
  'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'defs', 'clipPath', 'mask', 'pattern', 'linearGradient',
  'radialGradient', 'stop', 'use', 'symbol', 'title', 'desc', 'metadata'
];

const SVG_ALLOWED_ATTRS = [
  'xmlns', 'viewBox', 'width', 'height', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry',
  'd', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'opacity', 'transform', 'clip-path', 'mask', 'id', 'href', 'xlink:href',
  'font-family', 'font-size', 'text-anchor', 'dominant-baseline', 'dx', 'dy',
  'gradientUnits', 'gradientTransform', 'offset', 'stop-color', 'stop-opacity',
  'patternUnits', 'patternTransform', 'preserveAspectRatio'
];

export function sanitizeSvg(svgContent: string): string | null {
  try {
    // Security: strip any XML declarations or DOCTYPE that could enable XXE
    if (svgContent.includes('<!DOCTYPE') || svgContent.includes('<!ENTITY')) {
      return null;
    }

    // Security: reject if no valid SVG root element
    if (!svgContent.includes('<svg')) {
      return null;
    }

    const clean = purify.sanitize(svgContent, {
      ALLOWED_TAGS: SVG_ALLOWED_TAGS,
      ALLOWED_ATTRS: SVG_ALLOWED_ATTRS,
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed', 'style'],
      FORBID_ATTRS: ['onload', 'onerror', 'onclick', 'onmouseover', 'style'],
      KEEP_CONTENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_TRUSTED_TYPE: false,
      SANITIZE_DOM: true,
      ADD_TAGS: [],
      ADD_ATTR: [],
      ALLOW_ARIA_ATTR: false,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });

    // Security: verify sanitization didn't strip the root SVG element
    if (!clean.includes('<svg')) {
      return null;
    }

    // Security: ensure no script or event handler attributes remain
    const dangerousPatterns = [
      /<script/i,
      /on\w+\s*=/i,
      /javascript:/i,
      /data:text\/html/i,
      /<foreignObject/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(clean)) {
        return null;
      }
    }

    return clean;
  } catch (error) {
    // Security: log sanitization failure without exposing details
    console.error('SVG sanitization failed');
    return null;
  }
}