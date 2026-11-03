import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { madridChart } from '@/components/shell/chart-fixture.test-utils';
import { ASPECT_COLOR_DARK, chartToFormedAspects } from './to-astrochart';
import {
  attachTilt,
  DEFAULT_WHEEL_THEME,
  MAX_TILT_DEG,
  NatalWheel,
  splitWheelLayers,
  tiltDegrees,
  tiltEnabled,
  WHEEL_LAYERS,
  WHEEL_PALETTES,
  wrapPlanets,
} from './NatalWheel';

const source = readFileSync(fileURLToPath(new URL('./NatalWheel.tsx', import.meta.url)), 'utf8');
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
// The comments are not declarations: they are removed before the CSS is parsed.
const plainCss = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Relative luminance of a #rrggbb colour: the drawing colours are plain hex. */
function luminance(hex: string | undefined): number {
  if (!hex) throw new Error('the palette has no colour');
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}

/** The contrast ratio of two colours (WCAG 2.x). */
function contrast(a: string | undefined, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** The body of the media query that opens with `condition`, up to its closing brace. */
function mediaBlock(source: string, condition: string): string {
  const start = source.indexOf(`@media ${condition}`);
  if (start < 0) return '';
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  return '';
}

/** The depth the CSS gives to a layer, in pixels. */
function depthOf(layer: string): number {
  const found = plainCss.match(new RegExp(`\\[data-layer='${layer}'\\][^{]*\\{[^}]*--depth:\\s*(\\d+)px`));
  return found ? Number(found[1]) : 0;
}

/** The fake element the tilt writes on: a box to read and two CSS variables to write. */
function fakeWheel(box: { left: number; top: number; width: number; height: number }) {
  const props: Record<string, string> = {};
  const listeners: Record<string, ((event: unknown) => void)[]> = {};
  return {
    props,
    style: {
      setProperty: (name: string, value: string) => {
        props[name] = value;
      },
    },
    getBoundingClientRect: () => box,
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      (listeners[type] ??= []).push(listener);
    },
    removeEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners[type] = (listeners[type] ?? []).filter((one) => one !== listener);
    },
    fire: (type: string, event: unknown) => {
      for (const listener of listeners[type] ?? []) listener(event);
    },
  };
}

/** The frames the tilt waits for: the test runs them by hand. */
function fakeFrames() {
  const frames = new Map<number, () => void>();
  let next = 1;
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    const id = next++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id);
  });
  return () => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback();
  };
}

/** The minimum DOM the planet wrapper needs: a group, its children and the node moves. */
type FakeNode = {
  tag: string;
  id: string;
  namespaceURI: string;
  attrs: Record<string, string>;
  children: FakeNode[];
  parent: FakeNode | null;
  style: { position: string };
  appendChild(child: FakeNode): void;
  replaceWith(next: FakeNode): void;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  querySelector(selector: string): FakeNode | null;
  querySelectorAll(selector: string): FakeNode[];
  cloneNode(): FakeNode;
};

function fakeNode(tag: string, id = ''): FakeNode {
  const node: FakeNode = {
    tag,
    id,
    namespaceURI: 'http://www.w3.org/2000/svg',
    attrs: {},
    children: [],
    parent: null,
    style: { position: '' },
    appendChild(child) {
      child.parent = node;
      node.children.push(child);
    },
    replaceWith(next) {
      const parent = node.parent;
      if (!parent) return;
      parent.children[parent.children.indexOf(node)] = next;
      next.parent = parent;
      node.parent = null;
    },
    setAttribute(name, value) {
      node.attrs[name] = value;
    },
    getAttribute(name) {
      return node.attrs[name] ?? null;
    },
    querySelector(selector) {
      // The library draws each ring as a group whose id ends with the name of the ring.
      const suffix = selector.match(/^g\[id\$="(.+)"\]$/)?.[1];
      if (suffix) {
        return node.children.find((child) => child.tag === 'g' && child.id.endsWith(suffix)) ?? null;
      }
      if (selector === 'svg') return node.children.find((child) => child.tag === 'svg') ?? null;
      return null;
    },
    querySelectorAll(selector) {
      // The library draws the planets in a group whose id ends with "-radix-planets".
      if (!selector.includes('-radix-planets')) return [];
      const group = node.children.find((child) => child.id.endsWith('-radix-planets'));
      return group ? group.children : [];
    },
    cloneNode() {
      const copy = fakeNode(node.tag, node.id);
      copy.attrs = { ...node.attrs };
      return copy;
    },
  };
  return node;
}

describe('NatalWheel', () => {
  test('AC9 — the wheel scales with its container instead of a fixed pixel width', () => {
    const html = renderToStaticMarkup(<NatalWheel chart={madridChart} size={480} />);
    // The drawing box caps the width; the svg follows the container (a 390 px screen fits).
    expect(html).toContain('max-width:480px');
    const classes = html.replaceAll('&amp;', '&').replaceAll('&gt;', '>');
    expect(classes).toContain('[&_svg]:w-full');
    expect(classes).toContain('[&_svg]:h-auto');
  });

  test('AC9 — the wheel keeps its square shape', () => {
    const html = renderToStaticMarkup(<NatalWheel chart={madridChart} size={480} />);
    expect(html).toContain('aspect-square');
  });

  test('AC3 — the wheel has a dark palette for the app screens and keeps the light one for the print', () => {
    // The print sheet is white paper: the default stays the light palette.
    expect(DEFAULT_WHEEL_THEME).toBe('light');
    expect(luminance(WHEEL_PALETTES.light.POINTS_COLOR)).toBeLessThan(0.2);
    // The app screens are black: the points and the signs are drawn in light ink.
    expect(luminance(WHEEL_PALETTES.dark.POINTS_COLOR)).toBeGreaterThan(0.5);
    expect(luminance(WHEEL_PALETTES.dark.SIGNS_COLOR)).toBeGreaterThan(0.5);
    expect(luminance(WHEEL_PALETTES.dark.SYMBOL_AXIS_FONT_COLOR)).toBeGreaterThan(0.5);
    // The house numbers 1-12 come from the library default (#000): on the dark wheel they were
    // invisible, so the dark palette sets them in light ink.
    expect(luminance(WHEEL_PALETTES.dark.CUSPS_FONT_COLOR)).toBeGreaterThan(0.4);
    // The light palette sets them too: the library merges the settings into its module-level
    // defaults, so a dark wheel drawn first would leak its colour into the next light one.
    expect(WHEEL_PALETTES.light.CUSPS_FONT_COLOR).toBe('#000');
  });

  test('AC10 — the light palette pins the house numbers to the library default: a dark wheel cannot leak its ink', () => {
    // The astrochart Chart constructor merges the settings into its module-level defaults, so the
    // light palette has to set the house numbers itself. With the library default the printed
    // wheel is byte-identical, and a dark wheel drawn first cannot leak its colour into it.
    const lib = readFileSync(
      fileURLToPath(new URL('../../../node_modules/@astrodraw/astrochart/dist/astrochart.js', import.meta.url)),
      'utf8',
    );
    expect(lib).toMatch(/CUSPS_FONT_COLOR:"#000"/);
    expect(WHEEL_PALETTES.light.CUSPS_FONT_COLOR).toBe('#000');
  });

  test('AC12 — the wheel passes its theme to the aspects', () => {
    // The drawing happens in the browser (no DOM test library here): the wiring is pinned in
    // the source, and the argument is what changes the colours. The comments are stripped first:
    // a commented-out call would satisfy a plain regex.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).toMatch(/\.aspects\(\s*chartToFormedAspects\(\s*chart\s*,\s*[\w.]*theme\s*\)\s*\)/);
    expect(chartToFormedAspects(madridChart)).not.toEqual(chartToFormedAspects(madridChart, 'dark'));
  });
});

describe('NatalWheel in 3D (VK-526)', () => {
  test('AC1 — the pointer tilt never goes past 12 degrees', () => {
    expect(MAX_TILT_DEG).toBe(12);
    expect(tiltDegrees(0)).toBe(0);
    expect(tiltDegrees(0.5)).toBe(6);
    expect(tiltDegrees(2)).toBe(12);
    expect(tiltDegrees(-2)).toBe(-12);
    // The offset is clamped, so a pointer outside the box cannot tip the wheel over.
    expect(Math.abs(tiltDegrees(99))).toBeLessThanOrEqual(MAX_TILT_DEG);
  });

  test('AC1/AC3 — the tilt needs a fine pointer on a hover device, and never with reduced motion', () => {
    expect(tiltEnabled({ hover: true, fine: true, reducedMotion: false })).toBe(true);
    expect(tiltEnabled({ hover: false, fine: true, reducedMotion: false })).toBe(false);
    expect(tiltEnabled({ hover: true, fine: false, reducedMotion: false })).toBe(false);
    expect(tiltEnabled({ hover: true, fine: true, reducedMotion: true })).toBe(false);
  });

  test('AC1 — the wheel is split into the sign ring, the house ring and the planets', () => {
    expect(WHEEL_LAYERS.map((layer) => layer.name)).toEqual(['signs', 'houses', 'planets']);
    // The aspects are not a layer: they stay on the base plane.
    expect(WHEEL_LAYERS.flatMap((layer) => layer.groups).some((group) => group.includes('aspects'))).toBe(false);
    // The groups are the ones the library really draws (its settings name the rings).
    const lib = readFileSync(
      fileURLToPath(new URL('../../../node_modules/@astrodraw/astrochart/dist/astrochart.js', import.meta.url)),
      'utf8',
    );
    expect(lib).toMatch(/ID_SIGNS:"signs"/);
    expect(lib).toMatch(/ID_CUSPS:"cusps"/);
    expect(lib).toMatch(/ID_POINTS:"planets"/);
    expect(WHEEL_LAYERS.flatMap((layer) => layer.groups)).toEqual([
      '-radix-signs',
      '-radix-cusps',
      '-radix-axis',
      '-radix-planets',
    ]);
  });

  test('AC1 — every layer has its depth, from the back of the wheel to the front', () => {
    expect(depthOf('signs')).toBeGreaterThan(0);
    expect(depthOf('houses')).toBeGreaterThan(depthOf('signs'));
    expect(depthOf('planets')).toBeGreaterThan(depthOf('houses'));
    // The layers are pushed in Z inside the perspective box.
    expect(plainCss).toMatch(/translateZ\(var\(--depth/);
    // The aspects stay on the base plane: they are never pushed in Z.
    expect(plainCss).not.toMatch(/aspects[^{]*\{[^}]*translateZ/);
  });

  test('AC1/AC3 — the depth and the tilt live in the fine-pointer block', () => {
    const block = mediaBlock(plainCss, '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    expect(block).not.toBe('');
    expect(block).toMatch(/perspective:/);
    expect(block).toMatch(/translateZ\(/);
    expect(block).toMatch(/rotateX\(/);
    expect(block).toMatch(/rotateY\(/);
  });

  test('AC1/AC3 — the tilt transform is declared once, inside the fine-pointer block', () => {
    const block = mediaBlock(plainCss, '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const tilt = 'rotateX(var(--tilt-x';
    // The tilt reads the pointer variables, so it is declared once and only inside that block:
    // outside it the wheel would tilt on a touch screen and with the motion reduced.
    expect(plainCss.split(tilt).length - 1).toBe(1);
    expect(block).toContain(tilt);
  });

  test('AC3 — the reduced motion keeps the wheel flat and still', () => {
    // The 3D block asks for no-preference: with reduced motion it never applies, so the wheel
    // stays flat (no perspective, no tilt).
    expect(mediaBlock(plainCss, '(prefers-reduced-motion: no-preference)')).toMatch(/prefers-reduced-motion/);
    // The entrance rotation is declared where motion is allowed.
    const motion = mediaBlock(plainCss, '(prefers-reduced-motion: no-preference)');
    expect(motion).toMatch(/wheel-enter/);
    expect(plainCss).toMatch(/@keyframes wheel-enter\s*\{[^}]*transform:/);
  });

  test('AC2 — on the worst-case panel the aspects read at 3:1 and the house numbers at 4.5:1', () => {
    // The panel behind the wheel can be as light as #3a3a3b (card 525).
    const panel = '#3a3a3b';
    for (const [name, color] of Object.entries(ASPECT_COLOR_DARK)) {
      expect(contrast(color, panel), name).toBeGreaterThanOrEqual(3);
    }
    expect(contrast(WHEEL_PALETTES.dark.CUSPS_FONT_COLOR, panel)).toBeGreaterThanOrEqual(4.5);
  });

  test('AC4 — the print sheet keeps the flat wheel', () => {
    const html = renderToStaticMarkup(<NatalWheel chart={madridChart} size={560} />);
    expect(html).toContain('data-theme="light"');
    // Only the dark theme is split into layers: the print sheet draws the same flat wheel.
    expect(source).toMatch(/theme === 'dark'/);
    expect(plainCss).toMatch(/\[data-theme='dark'\]/);
  });
});

describe('the pointer tilt (VK-535)', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('the pointer moves the wheel: the tilt follows the pointer', () => {
    const runFrame = fakeFrames();
    const el = fakeWheel({ left: 0, top: 0, width: 100, height: 100 });
    attachTilt(el as unknown as HTMLElement);
    el.fire('pointermove', { clientX: 100, clientY: 100 });
    runFrame();
    // The pointer at the bottom right corner tips the wheel 12 degrees towards it.
    expect(el.props['--tilt-x']).toBe('12deg');
    expect(el.props['--tilt-y']).toBe('-12deg');
  });

  test('the wheel faces the viewer again when the pointer leaves it', () => {
    const runFrame = fakeFrames();
    const el = fakeWheel({ left: 0, top: 0, width: 100, height: 100 });
    attachTilt(el as unknown as HTMLElement);
    el.fire('pointermove', { clientX: 100, clientY: 100 });
    runFrame();
    el.fire('pointerleave', {});
    expect(el.props['--tilt-x']).toBe('0deg');
    expect(el.props['--tilt-y']).toBe('0deg');
  });

  test('a wheel with no size does not tilt', () => {
    const runFrame = fakeFrames();
    const el = fakeWheel({ left: 0, top: 0, width: 0, height: 0 });
    attachTilt(el as unknown as HTMLElement);
    el.fire('pointermove', { clientX: 100, clientY: 100 });
    runFrame();
    expect(el.props['--tilt-x']).toBeUndefined();
    expect(el.props['--tilt-y']).toBeUndefined();
  });

  test('the tilt is written once per frame, not once per pointer event', () => {
    const runFrame = fakeFrames();
    const el = fakeWheel({ left: 0, top: 0, width: 100, height: 100 });
    const reads = vi.spyOn(el, 'getBoundingClientRect');
    attachTilt(el as unknown as HTMLElement);
    el.fire('pointermove', { clientX: 100, clientY: 100 });
    el.fire('pointermove', { clientX: 0, clientY: 0 });
    // Nothing is written before the frame: the box is read once for the two events.
    expect(el.props['--tilt-x']).toBeUndefined();
    runFrame();
    expect(reads).toHaveBeenCalledTimes(1);
    // The last position of the pointer wins.
    expect(el.props['--tilt-x']).toBe('-12deg');
    expect(el.props['--tilt-y']).toBe('12deg');
  });
});

describe('the planet wrapper (VK-526)', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('the layered output keeps the planets in place: the wrapper is inside the layer', () => {
    const holder = fakeNode('div');
    const svg = fakeNode('svg');
    for (const id of ['chart-radix-signs', 'chart-radix-cusps', 'chart-radix-axis']) {
      svg.appendChild(fakeNode('g', id));
    }
    const planets = fakeNode('g', 'chart-radix-planets');
    const sun = fakeNode('g', 'planet-sun');
    sun.setAttribute('transform', 'translate(120, 240)');
    planets.appendChild(sun);
    svg.appendChild(planets);
    holder.appendChild(svg);
    vi.stubGlobal('document', { createElementNS: (_ns: string, tag: string) => fakeNode(tag) });
    splitWheelLayers(holder as unknown as HTMLElement);
    // The planets are in their own layer and each one sits inside a wrapper without a transform:
    // the layer is what the motion layer grows, so the planet keeps the place the library gave it.
    const layer = holder.children.find((child) => child.attrs['data-layer'] === 'planets');
    expect(layer).toBeDefined();
    expect(layer?.children).toContain(planets);
    expect(planets.children.length).toBe(1);
    const wrapper = planets.children[0];
    expect(wrapper.getAttribute('transform')).toBeNull();
    expect(wrapper.children[0]).toBe(sun);
  });

  test('the planet keeps its place: the animation runs on a wrapper without transform', () => {
    const svg = fakeNode('svg');
    const group = fakeNode('g', 'chart-radix-planets');
    const planet = fakeNode('g', 'planet-sun');
    planet.setAttribute('transform', 'translate(120, 240)');
    group.appendChild(planet);
    svg.appendChild(group);
    vi.stubGlobal('document', { createElementNS: (_ns: string, tag: string) => fakeNode(tag) });
    wrapPlanets(svg as unknown as SVGSVGElement);
    // The planet is inside a wrapper, and the wrapper carries no transform of its own: the motion
    // layer grows the wrapper in place and the symbol keeps the place the library gave it.
    expect(group.children.length).toBe(1);
    const wrapper = group.children[0];
    expect(wrapper.getAttribute('transform')).toBeNull();
    expect(wrapper.children.length).toBe(1);
    expect(wrapper.children[0]).toBe(planet);
    expect(planet.getAttribute('transform')).toBe('translate(120, 240)');
  });
});
