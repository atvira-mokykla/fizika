/** Progress lives only in this browser. No accounts, nothing sent anywhere. */
const KEY = 'physics.am.progress.v1';

export interface ItemRecord { ok: boolean; tries: number; hints: number; at: number; marks?: boolean[] }
export interface LessonRecord { title: string; url: string; seen: Record<string, boolean>; items: Record<string, ItemRecord>; last: number }
export interface Progress { lessons: Record<string, LessonRecord>; days: string[]; /** Year-plan lesson id → when it was marked done. */ done: Record<string, number> }

function empty(): Progress { return { lessons: {}, days: [], done: {} }; }

export function load(): Progress {
  try { const raw = localStorage.getItem(KEY); return raw ? { ...empty(), ...JSON.parse(raw) } : empty(); } catch { return empty(); }
}
function save(p: Progress) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: ignore */ } }

function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function touch(p: Progress, slug: string, title: string, url: string): LessonRecord {
  const l = (p.lessons[slug] ??= { title, url, seen: {}, items: {}, last: 0 });
  l.title = title; l.url = url; l.last = Date.now();
  const t = today();
  if (!p.days.includes(t)) p.days = [...p.days, t].slice(-60);
  return l;
}

export function markSeen(slug: string, title: string, url: string, block: string) {
  const p = load(); touch(p, slug, title, url).seen[block] = true; save(p);
}

export function recordItem(slug: string, title: string, url: string, id: string, rec: Omit<ItemRecord, 'at'>) {
  const p = load(); touch(p, slug, title, url).items[id] = { ...rec, at: Date.now() }; save(p); document.dispatchEvent(new CustomEvent('am:progress'));
}

/** Consecutive days up to today (or yesterday) with any activity. */
export function streak(p: Progress = load()): number {
  const set = new Set(p.days);
  const d = new Date();
  const key = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!set.has(key(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(key(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function getPref(k: string): string | null { try { return localStorage.getItem('physics.am.pref.' + k); } catch { return null; } }
export function setPref(k: string, v: string) { try { localStorage.setItem('physics.am.pref.' + k, v); } catch { /* ignore */ } }

/** Everything this site keeps in the browser, as JSON (progress and preferences). */
export function exportAll(): string {
  const out: Record<string, string> = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith('physics.am.')) out[k] = localStorage.getItem(k)!; } } catch { /* ignore */ }
  return JSON.stringify({ app: 'atvira-mokykla-physics', version: 1, exported: new Date().toISOString(), data: out }, null, 2);
}

export function importAll(json: string): boolean {
  try {
    const o = JSON.parse(json);
    if (o?.app !== 'atvira-mokykla-physics' || typeof o.data !== 'object') return false;
    for (const [k, v] of Object.entries(o.data)) if (k.startsWith('physics.am.') && typeof v === 'string') localStorage.setItem(k, v);
    return true;
  } catch { return false; }
}

export function resetAll() {
  try { Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter((k) => k?.startsWith('physics.am.')).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ year plan: done lessons, weeks */

export function doneMap(p: Progress = load()): Record<string, number> { return p.done ?? {}; }
export function isDone(id: string) { return !!doneMap()[id]; }
export function setDone(id: string, on: boolean) {
  const p = load();
  p.done ??= {};
  if (on) { if (!p.done[id]) p.done[id] = Date.now(); } else delete p.done[id];
  save(p);
  document.dispatchEvent(new CustomEvent('am:progress'));
}

/** Monday 00:00 of the week containing `t`. */
function weekStart(t: number) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
const WEEK = 7 * 24 * 3600 * 1000;

/** Lessons marked done this week (Monday to Sunday). */
export function doneThisWeek(p: Progress = load()) {
  const w = weekStart(Date.now());
  return Object.values(doneMap(p)).filter((t) => t >= w).length;
}

/** Weeks in a row, up to this week or last week, with at least one lesson done. */
export function weekStreak(p: Progress = load()) {
  const weeks = new Set(Object.values(doneMap(p)).map(weekStart));
  let w = weekStart(Date.now());
  if (!weeks.has(w)) w = weekStart(w - WEEK / 2);
  let n = 0;
  while (weeks.has(w)) { n++; w = weekStart(w - WEEK / 2); }
  return n;
}
