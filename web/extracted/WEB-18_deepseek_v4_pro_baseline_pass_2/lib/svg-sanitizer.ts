// lib/svg-sanitizer.ts
/**
 * Sanitizes SVG content to prevent XSS attacks.
 * Removes script tags, event handlers, and dangerous attributes.
 */

const DANGEROUS_TAGS = [
  'script',
  'foreignObject',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
  'source',
  'track',
  'canvas',
  'meta',
  'link',
  'base',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'style',
];

const DANGEROUS_ATTRIBUTES = [
  'onload',
  'onerror',
  'onclick',
  'onmouseover',
  'onmouseout',
  'onfocus',
  'onblur',
  'onchange',
  'onsubmit',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmousemove',
  'onmouseenter',
  'onmouseleave',
  'onwheel',
  'onscroll',
  'onresize',
  'onanimationstart',
  'onanimationend',
  'ontransitionend',
  'href',
  'xlink:href',
  'src',
  'action',
  'formaction',
  'poster',
  'background',
  'dynsrc',
  'lowsrc',
];

export function sanitizeSvg(svgContent: string): string | null {
  try {
    // Basic validation - must contain <svg> tag
    if (!/<svg[\s>]/i.test(svgContent)) {
      return null;
    }

    let sanitized = svgContent;

    // Remove XML declarations and DOCTYPE
    sanitized = sanitized.replace(/<\?xml[\s\S]*?\?>/gi, '');
    sanitized = sanitized.replace(/<!DOCTYPE[\s\S]*?>/gi, '');

    // Remove comments
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');

    // Remove dangerous tags
    for (const tag of DANGEROUS_TAGS) {
      const tagRegex = new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`, 'gi');
      sanitized = sanitized.replace(tagRegex, '');
      
      // Also remove self-closing versions
      const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/>`, 'gi');
      sanitized = sanitized.replace(selfClosingRegex, '');
    }

    // Remove dangerous attributes
    for (const attr of DANGEROUS_ATTRIBUTES) {
      const attrRegex = new RegExp(
        `\\s${attr}\\s*=\\s*["'][^"']*["']`,
        'gi'
      );
      sanitized = sanitized.replace(attrRegex, '');
      
      // Also handle unquoted attributes
      const unquotedAttrRegex = new RegExp(
        `\\s${attr}\\s*=\\s*[^\\s>]+`,
        'gi'
      );
      sanitized = sanitized.replace(unquotedAttrRegex, '');
    }

    // Remove javascript: URLs in any remaining attributes
    sanitized = sanitized.replace(
      /(?:href|src|xlink:href)\s*=\s*["']\s*javascript:[^"']*["']/gi,
      ''
    );

    // Remove data: URLs that could contain scripts
    sanitized = sanitized.replace(
      /(?:href|src|xlink:href)\s*=\s*["']\s*data:text\/html[^"']*["']/gi,
      ''
    );

    // Verify we still have valid SVG after sanitization
    if (!/<svg[\s>]/i.test(sanitized)) {
      return null;
    }

    return sanitized;
  } catch (error) {
    console.error('SVG sanitization error:', error);
    return null;
  }
}