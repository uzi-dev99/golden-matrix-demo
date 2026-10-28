/** Splits the model's markdown at "## " headings. Text before the first heading is dropped. */
export function splitSections(markdown: string): { title: string; body: string }[] {
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const nl = chunk.indexOf('\n');
      return nl < 0 ? { title: chunk.trim(), body: '' } : { title: chunk.slice(0, nl).trim(), body: chunk.slice(nl + 1).trim() };
    });
}
