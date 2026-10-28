/**
 * Splits the model's markdown at "## " headings. Text before the first heading is dropped;
 * a report with no heading at all is kept whole as one "Informe" section.
 */
export function splitSections(markdown: string): { title: string; body: string }[] {
  if (!/^## /m.test(markdown)) return markdown.trim() ? [{ title: 'Informe', body: markdown.trim() }] : [];
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const nl = chunk.indexOf('\n');
      return nl < 0 ? { title: chunk.trim(), body: '' } : { title: chunk.slice(0, nl).trim(), body: chunk.slice(nl + 1).trim() };
    });
}
