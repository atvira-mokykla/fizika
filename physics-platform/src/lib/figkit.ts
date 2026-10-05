import JXG from 'jsxgraph';

// Several JSXGraph modules look for a global JXG.
(globalThis as any).JXG = JXG;
export { JXG };

export interface FigureCtx {
  box: HTMLElement;        // the drawing area
  bar: HTMLElement;        // toolbar (buttons, sliders); empty in print
  props: Record<string, any>;
  print: boolean;
  setCaption(text: string): void;
}

export interface FigureHandle {
  /** Show the drawing for a named state (frames of an Explain block). */
  setState(state: string): void;
  /** Add something to the drawing after a check item is answered. */
  reveal?(key: string): void;
  /** Is this pointer event on the named target? (for "mark on the figure" items) */
  hit?(target: string, ev: PointerEvent): boolean | 'ambiguous';
  /** Re-read theme colours and redraw. */
  redraw(): void;
}

export type MountFn = (ctx: FigureCtx) => FigureHandle;

export interface Palette { ink: string; muted: string; accent: string; mark: string; line: string; surface: string; hint: string }

export function palette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const g = (n: string) => cs.getPropertyValue(n).trim() || '#888';
  return { ink: g('--am-ink'), muted: g('--am-muted'), accent: g('--am-accent'), mark: g('--am-mark'), line: g('--am-line'), surface: g('--am-surface'), hint: g('--am-hint') };
}

export function onThemeChange(cb: () => void) {
  new MutationObserver(cb).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

let uid = 0;
/** Create a board that keeps its bounding box when the container is resized. */
export function initBoard(box: HTMLElement, bbox: [number, number, number, number], extra: Record<string, any> = {}) {
  if (!box.id) box.id = 'am-jxg-' + ++uid;
  const board = JXG.JSXGraph.initBoard(box.id, {
    boundingbox: bbox, keepaspectratio: true, axis: false, showCopyright: false, showNavigation: false,
    // JSXGraph supports zoom.enabled (src/options.js); its type declarations omit it.
    pan: { enabled: false }, zoom: { enabled: false, wheel: false } as JXG.ZoomOptions, renderer: 'svg', ...extra,
  });
  if ('ResizeObserver' in window) {
    let last = 0;
    new ResizeObserver(() => {
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h || Math.abs(w - last) < 2) return;
      last = w;
      board.resizeContainer(w, h, true);
      board.setBoundingBox(bbox, true);
      board.update();
    }).observe(box);
  }
  return board;
}

export function button(bar: HTMLElement, label: string, onClick: () => void, aria?: string) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'am-btn am-btn-sm'; b.textContent = label;
  if (aria) b.setAttribute('aria-label', aria);
  b.addEventListener('click', onClick);
  bar.appendChild(b);
  return b;
}

/** A labelled range input. `onInput` may return a corrected value (e.g. a ≠ 0), which is then shown. */
export function slider(bar: HTMLElement, o: { id: string; label: string; min: number; max: number; step: number; value: number; format?: (v: number) => string }, onInput: (v: number) => number | void) {
  const wrap = document.createElement('label');
  wrap.className = 'am-slider';
  const name = document.createElement('span'); name.className = 'am-slider-name'; name.textContent = o.label;
  const input = document.createElement('input');
  input.type = 'range'; input.min = String(o.min); input.max = String(o.max); input.step = String(o.step); input.value = String(o.value);
  input.id = o.id;
  const out = document.createElement('output'); out.className = 'am-slider-val';
  const fmt = o.format ?? ((v: number) => String(v));
  out.textContent = fmt(o.value);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    const r = onInput(v);
    const shown = typeof r === 'number' ? r : v;
    if (shown !== v) input.value = String(shown);
    out.textContent = fmt(shown);
  });
  wrap.append(name, input, out);
  bar.appendChild(wrap);
  return { input, set(v: number) { input.value = String(v); out.textContent = fmt(v); onInput(v); } };
}

/** Numbers as the reader expects them: decimal comma for Lithuanian, point for English. */
export function fmtNum(v: number, digits = 2) {
  const lang = (document.documentElement.lang || 'en').toLowerCase();
  const r = Number(v.toFixed(digits));
  return lang.startsWith('lt') ? String(r).replace('.', ',') : String(r);
}
