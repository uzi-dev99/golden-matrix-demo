import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { PromptPreview } from '@/lib/types';
import { PromptInspector } from './PromptInspector';

const preview: PromptPreview = {
  version: 'astrolabio-prompt/1.0.0',
  system: [{ text: 'Eres un astrólogo. ' }, { text: 'Tono neutro.', token: 'tone_instruction' }],
  user: [{ text: 'Redacta la lectura de ' }, { text: 'Persona de prueba', token: 'name' }, { text: '.' }],
  estimatedTokens: 586,
};

describe('PromptInspector', () => {
  test('AC10 — injected values are marked and the version is shown', () => {
    const html = renderToStaticMarkup(<PromptInspector preview={preview} />);
    expect(html).toContain('Prompt que recibirá el modelo');
    expect(html).toContain('astrolabio-prompt/1.0.0');
    expect(html).toContain('≈586');
    expect(html).toContain('mark class="injected"');
    expect(html).toContain('Persona de prueba');
    expect(html).toContain('2 valores inyectados');
    expect(html).toContain('role="region"');
    expect(html).toContain('role="tablist"');
  });
  test('AC10 — without a preview the panel says so instead of rendering nothing', () => {
    const html = renderToStaticMarkup(<PromptInspector preview={null} />);
    expect(html).toContain('Prompt que recibirá el modelo');
    expect(html).toContain('Cargando prompt…');
    // only the legend mark, no injected value
    expect(html.match(/<mark/g)).toHaveLength(1);
  });
});
