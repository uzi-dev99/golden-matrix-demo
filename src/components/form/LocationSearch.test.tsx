import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { LocationSearch, onSearchKeyDown } from './LocationSearch';

describe('LocationSearch', () => {
  test('AC8 — it is not a form: it lives inside the birth form', () => {
    const html = renderToStaticMarkup(<LocationSearch onPick={() => {}} />);
    expect(html).not.toContain('<form');
  });

  test('AC8 — the search button does not submit the outer form', () => {
    const html = renderToStaticMarkup(<LocationSearch onPick={() => {}} />);
    expect(html).toMatch(/<button[^>]*type="button"/);
  });

  test('AC8 — Enter runs the search and does not submit the form', () => {
    const run = vi.fn();
    const preventDefault = vi.fn();
    onSearchKeyDown({ key: 'Enter', preventDefault }, run);
    expect(run).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  test('AC8 — another key does not run the search', () => {
    const run = vi.fn();
    const preventDefault = vi.fn();
    onSearchKeyDown({ key: 'a', preventDefault }, run);
    expect(run).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
