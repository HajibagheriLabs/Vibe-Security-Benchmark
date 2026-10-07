// src/utils/sanitize-rich-text.ts
/**
 * Rich text sanitizer using DOMPurify-style allowlist approach
 * 
 * Security decisions:
 * - Explicit tag and attribute allowlist
 * - No script, style, iframe, object, embed tags
 * - No event handlers (onclick, onerror, etc.)
 * - URL protocols validated for href and src attributes
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's', 'blockquote',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'span', 'div'
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  'a': new Set(['href', 'title', 'target', 'rel']),
  'span': new Set(['class']),
  'div': new Set(['class']),
  'p': new Set(['class']),
  'blockquote': new Set(['class']),
  'ul': new Set(['class']),
  'ol': new Set(['class']),
  'li': new Set(['class']),
  'h1': new Set(['class']),
  'h2': new Set(['class']),
  'h3': new Set(['class']),
  'h4': new Set(['class']),
  'h5': new Set(['class']),
  'h6': new Set(['class'])
};

const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Sanitizes rich text HTML content
 * Removes all disallowed tags, attributes, and dangerous URLs
 */
export function sanitizeRichText(html: string): string {
  // Create a DOM parser to safely parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Walk through all elements and sanitize
  sanitizeNode(doc.body);
  
  // Return the sanitized HTML
  return doc.body.innerHTML;
}

/**
 * Recursively sanitizes a DOM node and its children
 */
function sanitizeNode(node: Node): void {
  // Process element nodes
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    
    // Remove disallowed elements
    if (!ALLOWED_TAGS.has(tagName)) {
      // Replace with its children to preserve text content
      const parent = element.parentNode;
      while (element.firstChild) {
        parent?.insertBefore(element.firstChild, element);
      }
      parent?.removeChild(element);
      return;
    }
    
    // Sanitize attributes
    const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] || new Set();
    const attributes = Array.from(element.attributes);
    
    for (const attr of attributes) {
      const attrName = attr.name.toLowerCase();
      
      // Remove event handlers and disallowed attributes
      if (attrName.startsWith('on') || !allowedAttrs.has(attrName)) {
        element.removeAttribute(attr.name);
        continue;
      }
      
      // Validate URLs for href and src attributes
      if (attrName === 'href' || attrName === 'src') {
        const url = attr.value;
        if (!isSafeUrl(url)) {
          element.removeAttribute(attr.name);
        }
      }
      
      // Enforce rel="noopener noreferrer" on target="_blank" links
      if (attrName === 'target' && attr.value === '_blank') {
        element.setAttribute('rel', 'noopener noreferrer');
      }
    }
  }
  
  // Recursively process child nodes
  const children = Array.from(node.childNodes);
  for (const child of children) {
    sanitizeNode(child);
  }
}

/**
 * Validates that a URL uses an allowed protocol
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}