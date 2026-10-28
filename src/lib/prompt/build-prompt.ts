import type { BirthInput, NatalChart, PromptOptions, PromptPreview } from '@/lib/types';
import { signAndDegree } from '@/lib/format';
import { estimateTokens, fence, renderSegments, segmentsToText } from './render';
import { SYSTEM_TEMPLATE } from './templates/system';
import { USER_TEMPLATE } from './templates/user';

export const PROMPT_VERSION = 'astrolabio-prompt/1.3.0';

const TONE: Record<PromptOptions['tone'], string> = {
  neutral: 'Tono neutro y descriptivo.',
  warm: 'Tono cálido y cercano, sin exageraciones.',
  clinical: 'Tono técnico y sobrio, como un informe de laboratorio.',
};
const LENGTH: Record<PromptOptions['length'], string> = {
  short: 'Extensión: unas 300 palabras en total, un párrafo corto por sección.',
  medium: 'Extensión: unas 600 palabras en total.',
  long: 'Extensión: unas 1000 palabras en total, con detalle por planeta.',
};

const fmt = (n: number) => n.toFixed(2);

/** "Tauro 26.24°", with the sign carried when the degree reaches 30°00′. */
const pos = (signEs: string, degree: number) => {
  const p = signAndDegree(signEs, degree);
  return `${p.sign} ${fmt(p.degree)}°`;
};

/** Plain-text view of the chart for the model. Every number comes from `chart`, none is invented. */
export function chartToVars(input: BirthInput, chart: NatalChart, options: PromptOptions): Record<string, string> {
  const none = '(ninguno)';
  return {
    tone_instruction: TONE[options.tone],
    length_instruction: LENGTH[options.length],
    name: fence(input.name),
    birth_date: input.date,
    birth_time: input.time,
    timezone: input.place.timezone,
    place: fence(input.place.label),
    coordinates: `${input.place.latitude}, ${input.place.longitude}`,
    utc_instant: chart.utcInstant,
    angles: [
      `Ascendente: ${pos(chart.ascendant.signEs, chart.ascendant.degree)}`,
      `Medio cielo: ${pos(chart.midheaven.signEs, chart.midheaven.degree)}`,
    ].join('\n'),
    planets: chart.planets
      .map((p) => `${p.label}: ${pos(p.signEs, p.degree)}, casa ${p.house}${p.retrograde ? ', retrógrado' : ''}`)
      .join('\n'),
    houses: chart.houses.map((h) => `Casa ${h.house}: ${pos(h.signEs, h.degree)}`).join('\n'),
    aspects: chart.aspects.length
      ? chart.aspects.map((a) => `${a.planet1} ${a.aspectEs} ${a.planet2} (orbe ${fmt(a.orb)}°)`).join('\n')
      : none,
    nodes: `Nodo norte: ${pos(chart.nodes.northNode.signEs, chart.nodes.northNode.degree)}; Nodo sur: ${pos(chart.nodes.southNode.signEs, chart.nodes.southNode.degree)}`,
    warnings: chart.warnings.length ? chart.warnings.join('\n') : none,
  };
}

/** Pure. The server and the inspector call this with the same arguments, so they always agree. */
export function buildPrompt(input: BirthInput, chart: NatalChart, options: PromptOptions): PromptPreview {
  const vars = chartToVars(input, chart, options);
  const system = renderSegments(SYSTEM_TEMPLATE, vars);
  const user = renderSegments(USER_TEMPLATE, vars);
  return {
    version: PROMPT_VERSION,
    system,
    user,
    estimatedTokens: estimateTokens(segmentsToText(system) + segmentsToText(user)),
  };
}
