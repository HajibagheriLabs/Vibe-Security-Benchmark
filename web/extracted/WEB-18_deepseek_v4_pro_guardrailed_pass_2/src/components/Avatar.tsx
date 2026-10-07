// src/components/Avatar.tsx
// Security: Render avatar via <img> tag — browsers treat SVG in <img> as
// inert (no script execution). Never use dangerouslySetInnerHTML for SVG.
export function Avatar({ url, alt }: { url: string; alt: string }) {
  return <img src={url} alt={alt} width={48} height={48} loading="lazy" />;
}