/**
 * A declarative 3D construction on top of JSXGraph's view3d.
 * JSXGraph draws the solid; this module adds what textbook figures need and the
 * library does not do by itself: dashed hidden edges, angle arcs, right-angle
 * marks, highlight states, "look along an edge" views and tap targets.
 */
import { JXG, initBoard, palette, onThemeChange, button, slider, fmtNum, type FigureCtx, type FigureHandle } from './figkit';

export type V3 = [number, number, number];
type Params = Record<string, number>;

export interface SolidSpec {
  params: Params;
  points: Record<string, (p: Params) => V3>;
  /** Faces as vertex names, ordered counter-clockwise when seen from outside. */
  faces: string[][];
  /** Face membership of points that are not vertices (used to decide if a segment is hidden). */
  pointFaces?: Record<string, number[]>;
  edges: [string, string][];
  /** Points that are hidden until a state shows them as `pt:X`. */
  derived?: string[];
  segments?: Record<string, [string, string]>;
  arcs?: Record<string, { at: string; from: string; to: string; r: number; label?: string }>;
  rightAngles?: Record<string, { at: string; a: string; b: string; size?: number }>;
  shades?: Record<string, { pts: string[]; tone: 'accent' | 'mark' }>;
  labelOffsets?: Record<string, [number, number]>;
  states: Record<string, { show?: string[]; hot?: string[]; tint?: string[]; caption?: string }>;
  reveals?: Record<string, { show?: string[]; hot?: string[]; caption?: string }>;
  initial: string;
  print?: string;
  exam: { az: number; el: number };
  along?: { label: string; from: string; to: string; caption?: string }[];
  targets?: Record<string, { point: string; tol?: number; minSeparation?: number }>;
  sliders?: { param: string; label: string; min: number; max: number; step: number; format?: (v: number) => string }[];
  /** Live caption, e.g. the current angle while a slider moves. */
  readout?: (p: Params, P: (name: string) => V3) => string;
  bbox?: [number, number, number, number];
  box3d?: [[number, number], [number, number], [number, number]];
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nrm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export function angleAt(P: (n: string) => V3, at: string, a: string, b: string) {
  const u = nrm(sub(P(a), P(at))), v = nrm(sub(P(b), P(at)));
  return Math.acos(Math.max(-1, Math.min(1, dot(u, v))));
}


/** The parts of JSXGraph's 3D view used here. JSXGraph has them (src/3d/view3d.js), but its type declarations omit setView and the angle sliders. */
interface View3D {
  create(type: string, parents: unknown[], attributes?: Record<string, unknown>): any;
  project3DTo2D(x: number, y: number, z: number): number[];
  setView(az: number, el: number): void;
  az_slide: JXG.Slider;
  el_slide: JXG.Slider;
}
export function mountSolid(spec: SolidSpec, ctx: FigureCtx): FigureHandle {
  const params: Params = { ...spec.params, ...(ctx.props.params ?? {}) };
  const P = (n: string) => spec.points[n](params);
  const bbox = spec.bbox ?? [-5.6, 3.1, 5.6, -8.1];
  const board = initBoard(ctx.box, bbox);
  const box3d = spec.box3d ?? [[-3, 3], [-3, 3], [-0.5, 4]];
  const view = board.create('view3d', [[-5, -6], [10, 10], box3d], {
    projection: 'parallel', axesPosition: 'none',
    xPlaneRear: { visible: false }, yPlaneRear: { visible: false }, zPlaneRear: { visible: false },
    az: { slider: { visible: false, start: spec.exam.az }, pointer: { enabled: !ctx.print, key: 'none', button: -1 } },
    el: { slider: { visible: false, start: spec.exam.el }, pointer: { enabled: !ctx.print, key: 'none', button: -1 } },
    bank: { slider: { visible: false } },
  }) as unknown as View3D;

  const coordFns = (n: string) => [() => P(n)[0], () => P(n)[1], () => P(n)[2]];
  const derived = new Set(spec.derived ?? []);
  const pts: Record<string, any> = {};
  for (const n of Object.keys(spec.points)) {
    pts[n] = view.create('point3d', coordFns(n), {
      name: n, size: 2, fixed: true, highlight: false, withLabel: true, visible: !derived.has(n),
      label: { display: 'internal', fontSize: ctx.print ? 14 : 15, offset: spec.labelOffsets?.[n] ?? [7, 7], highlight: false },
    });
  }
  const faceOf = (n: string): number[] => spec.pointFaces?.[n] ?? spec.faces.flatMap((f, i) => (f.includes(n) ? [i] : []));

  const shades: Record<string, any> = {};
  for (const [id, s] of Object.entries(spec.shades ?? {})) {
    shades[id] = view.create('polygon3d', s.pts.map((n) => pts[n]), { fixed: true, highlight: false, fillOpacity: 0, borders: { visible: false } });
  }
  const edges: Record<string, any> = {};
  for (const [a, b] of spec.edges) edges[a + b] = view.create('line3d', [pts[a], pts[b]], { strokeWidth: 2, highlight: false, fixed: true });
  const segs: Record<string, any> = {};
  for (const [id, [a, b]] of Object.entries(spec.segments ?? {})) segs[id] = view.create('line3d', [pts[a], pts[b]], { strokeWidth: 2, highlight: false, fixed: true, visible: false });

  const arcs: Record<string, any> = {};
  for (const [id, a] of Object.entries(spec.arcs ?? {})) {
    const f = (i: number) => (t: number) => {
      const c = P(a.at), u = nrm(sub(P(a.from), c)), v = nrm(sub(P(a.to), c)), d = dot(u, v);
      const e = nrm([v[0] - d * u[0], v[1] - d * u[1], v[2] - d * u[2]]);
      return c[i] + a.r * (Math.cos(t) * u[i] + Math.sin(t) * e[i]);
    };
    arcs[id] = view.create('curve3d', [f(0), f(1), f(2), [0, () => angleAt(P, a.at, a.from, a.to)]], { strokeWidth: 2.5, highlight: false, visible: false });
  }
  const ras: Record<string, any[]> = {};
  for (const [id, r] of Object.entries(spec.rightAngles ?? {})) {
    const q = r.size ?? 0.35;
    const corner = (k: 0 | 1 | 2) => (i: number) => () => {
      const c = P(r.at), u = nrm(sub(P(r.a), c)), v = nrm(sub(P(r.b), c));
      const w = k === 0 ? u : k === 2 ? v : [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
      return c[i] + q * w[i];
    };
    const mk = (k: 0 | 1 | 2) => view.create('point3d', [corner(k)(0), corner(k)(1), corner(k)(2)], { visible: false, withLabel: false, fixed: true });
    const c0 = mk(0), c1 = mk(1), c2 = mk(2);
    ras[id] = [
      view.create('line3d', [c0, c1], { strokeWidth: 1.5, highlight: false, fixed: true, visible: false }),
      view.create('line3d', [c1, c2], { strokeWidth: 1.5, highlight: false, fixed: true, visible: false }),
    ];
  }

  // ---- hidden lines: an edge is visible if one of its faces faces the viewer
  const dash = new Map<any, number>();
  const setDash = (el: any, d: number) => { if (dash.get(el) !== d) { dash.set(el, d); el.setAttribute({ dash: d }); } };
  const signedArea = (f: string[]) => {
    const q = f.map((n) => { const c = P(n); return view.project3DTo2D(c[0], c[1], c[2]); });
    let A = 0;
    for (let i = 0; i < q.length; i++) { const j = (i + 1) % q.length; A += q[i][1] * q[j][2] - q[j][1] * q[i][2]; }
    return A;
  };
  let busy = false;
  function updateHidden() {
    if (busy) return; busy = true;
    try {
      const front = spec.faces.map((f) => signedArea(f) > 0);
      for (const [a, b] of spec.edges) {
        const vis = spec.faces.some((f, i) => front[i] && f.includes(a) && f.includes(b));
        setDash(edges[a + b], vis ? 0 : 3);
      }
      for (const [id, [a, b]] of Object.entries(spec.segments ?? {})) {
        const fb = faceOf(b);
        const vis = faceOf(a).some((i) => fb.includes(i) && front[i]);
        setDash(segs[id], vis ? 0 : 2);
      }
    } finally { busy = false; }
  }
  board.on('update', updateHidden);

  // ---- state
  let state = spec.states[spec.initial] ? spec.initial : Object.keys(spec.states)[0];
  const revealed = new Set<string>();
  let hotOverride: string[] | null = null;

  function render() {
    const pal = palette();
    const st = spec.states[state] ?? {};
    const show = new Set(st.show ?? []);
    for (const r of revealed) for (const s of spec.reveals?.[r]?.show ?? []) show.add(s);
    const hot = new Set(hotOverride ?? st.hot ?? []);
    const tint = new Set(st.tint ?? []);
    for (const [n, el] of Object.entries(pts)) {
      el.setAttribute({ strokeColor: pal.ink, fillColor: pal.ink, visible: !derived.has(n) || show.has('pt:' + n) });
      el.element2D?.label?.setAttribute({ strokeColor: pal.ink });
    }
    for (const [id, el] of Object.entries(edges)) el.setAttribute({ strokeColor: hot.has(id) ? pal.mark : pal.ink, strokeWidth: hot.has(id) ? 3.5 : 2 });
    for (const [id, el] of Object.entries(segs)) el.setAttribute({ visible: show.has(id), strokeColor: hot.has(id) ? pal.mark : pal.accent, strokeWidth: hot.has(id) ? 3 : 2 });
    for (const [id, el] of Object.entries(arcs)) el.setAttribute({ visible: show.has(id), strokeColor: pal.mark });
    for (const [id, els] of Object.entries(ras)) for (const el of els) el.setAttribute({ visible: show.has(id), strokeColor: pal.accent });
    for (const [id, el] of Object.entries(shades)) {
      const tone = spec.shades![id].tone === 'mark' ? pal.mark : pal.accent;
      el.setAttribute({ fillColor: tone, fillOpacity: tint.has(id) ? 0.16 : 0 });
    }
    dash.clear();
    board.update();
    caption();
  }
  function caption(extra?: string) {
    if (extra) return ctx.setCaption(extra);
    const live = spec.readout?.(params, P);
    const st = spec.states[state];
    const revealedCaptions = [...revealed].map((key) => spec.reveals?.[key]?.caption).filter(Boolean);
    ctx.setCaption([st?.caption, ...revealedCaptions, live].filter(Boolean).join(' '));
  }

  // ---- views
  let anim = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animateTo(az: number, el: number) {
    cancelAnimationFrame(anim);
    const a0 = view.az_slide.Value(), e0 = view.el_slide.Value();
    let da = az - a0; da = ((da % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    if (reduce || ctx.print) { view.setView(a0 + da, el); return; }
    let t0 = 0;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const t = Math.min(1, (ts - t0) / 650), k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      view.setView(a0 + da * k, e0 + (el - e0) * k);
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  /** Azimuth (at elevation 0) that looks straight along the direction `dir`. */
  function azAlong(dir: V3) {
    const az0 = view.az_slide.Value(), el0 = view.el_slide.Value();
    const dx = (az: number) => { view.setView(az, 0); const o = view.project3DTo2D(0, 0, 0), r = view.project3DTo2D(dir[0], dir[1], dir[2]); return r[1] - o[1]; };
    const p0 = dx(0), p1 = dx(Math.PI / 2);
    view.setView(az0, el0);
    const sol = Math.atan2(-p0, p1);
    const dist = (x: number) => Math.abs(((x - az0) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    return dist(sol + Math.PI) < dist(sol) ? sol + Math.PI : sol;
  }

  if (!ctx.print) {
    const lt = document.documentElement.lang.toLowerCase().startsWith('lt');
    button(ctx.bar, lt ? 'Egzamino vaizdas' : 'Exam view', () => {
      animateTo(spec.exam.az, spec.exam.el);
      caption(lt ? 'Egzamino vaizdas: įprastas brėžinys, kaip brėžiama ant popieriaus.' : 'Exam view: the standard drawing used on paper.');
    });
    for (const a of spec.along ?? []) {
      button(ctx.bar, a.label, () => { animateTo(azAlong(nrm(sub(P(a.to), P(a.from)))), 0); caption(a.caption); });
    }
    button(ctx.bar, '↺', () => animateTo(view.az_slide.Value() - 0.35, view.el_slide.Value()), lt ? 'Sukti į kairę' : 'Turn left');
    button(ctx.bar, '↻', () => animateTo(view.az_slide.Value() + 0.35, view.el_slide.Value()), lt ? 'Sukti į dešinę' : 'Turn right');
    for (const s of spec.sliders ?? []) {
      slider(ctx.bar, { id: `${ctx.box.id}-${s.param}`, label: s.label, min: s.min, max: s.max, step: s.step, value: params[s.param], format: s.format ?? ((v) => fmtNum(v)) }, (v) => { params[s.param] = v; board.update(); caption(); });
    }
  }
  onThemeChange(render);
  render();
  if (ctx.print && spec.print) { state = spec.print; render(); }

  return {
    setState(s) { if (spec.states[s]) { state = s; hotOverride = null; render(); } },
    reveal(k) { revealed.add(k); hotOverride = spec.reveals?.[k]?.hot ?? null; render(); if (spec.reveals?.[k]?.caption) caption(spec.reveals[k].caption); },
    hit(target, ev) {
      const t = spec.targets?.[target];
      if (!t) return false;
      const u = board.getUsrCoordsOfMouse(ev), c = P(t.point), q = view.project3DTo2D(c[0], c[1], c[2]);
      const pixelsBetween = (a: number[], b: number[]) => Math.hypot((a[1] - b[1]) * board.unitX, (a[2] - b[2]) * board.unitY);
      const other = Object.keys(spec.points).filter((n) => n !== t.point).map((n) => { const p = P(n); return view.project3DTo2D(p[0], p[1], p[2]); });
      const separation = other.length ? Math.min(...other.map((p) => pixelsBetween(q, p))) : Infinity;
      const tap = [1, u[0], u[1]];
      const targetDistance = pixelsBetween(tap, q);
      if (targetDistance > (t.tol ?? 24)) return false;
      if (separation < (t.minSeparation ?? 16)) return 'ambiguous';
      const wrongDistance = other.length ? Math.min(...other.map((p) => pixelsBetween(tap, p))) : Infinity;
      if (targetDistance < 0.8 * wrongDistance) return true;
      if (wrongDistance < 0.8 * targetDistance) return false;
      return 'ambiguous';
    },
    redraw: render,
  };
}
