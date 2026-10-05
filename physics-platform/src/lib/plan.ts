/** Build-time helpers for the year plans (src/content/years/), in English or Lithuanian. */
import { getCollection } from 'astro:content';
import type { z } from 'astro/zod';
import fs from 'node:fs';
import yaml from 'js-yaml';
import type { planLesson, planUnit } from '../content.config';
import { ui, type Lang } from '../i18n/ui';
import { buildCalendar, dateRange } from './calendar.mjs';

export type PlanLesson = z.infer<typeof planLesson>;
export type PlanUnit = z.infer<typeof planUnit>;
type RawYear = Awaited<ReturnType<typeof rawYears>>[number];
export type Year = RawYear & { lang: Lang; prefix: string };

export const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

/** The English docs id of the lesson on this page: "/matematika/lt/9/quadratics/x/" and its print pages → "9/quadratics/x". */
export const slugOfPath = (pathname: string) =>
  pathname.slice(base.length - 1).replace(/^\/print\/[a-z]+\//, '/').replace(/^\/(lt\/)?/, '').replace(/\/$/, '');

async function rawYears() {
  const all = (await getCollection('years')).map((e) => e.data);
  return all.sort((a, b) => a.grade - b.grade || (a.course === 'B' ? -1 : 1));
}

/** Lithuanian overlay: src/i18n/years-lt/<grade>[-<course>].yaml with unit titles, goals, needs and lesson titles. */
interface Overlay { units?: Record<string, { title?: string; goals?: string[]; needs?: string[] }>; lessons?: Record<string, string> }
function overlay(y: RawYear): Overlay {
  const f = `src/i18n/years-lt/${y.path.replace('/', '-')}.yaml`;
  return fs.existsSync(f) ? ((yaml.load(fs.readFileSync(f, 'utf8')) as Overlay) ?? {}) : {};
}
const LT_EXAM: Record<string, string> = {
  'PUPP in May': 'PUPP gegužę', 'VBE Part I at the end of May': 'VBE I dalis gegužės pabaigoje', 'VBE Part I after the school year': 'VBE I dalis pasibaigus mokslo metams', 'VBE Part II in June': 'VBE II dalis birželį',
};

function localize(y: RawYear, lang: Lang): Year {
  if (lang === 'en') return { ...y, lang, prefix: '' };
  const o = overlay(y), L = ui('lt');
  const courseName = y.course === 'A' ? 'išplėstinis kursas' : y.course === 'B' ? 'bendrasis kursas' : '';
  return {
    ...y, lang, prefix: 'lt/',
    // As in official documents: "9 (I gimnazijos) klasė".
    title: `${y.grade} (${y.gymn} gimnazijos) klasė${courseName ? ` · ${courseName}` : ''}`,
    subtitle: courseName ? `${y.grade} (${y.gymn} gimnazijos) klasė` : 'Fizika',
    exam: y.exam ? LT_EXAM[y.exam] ?? y.exam : y.exam,
    semesters: y.semesters.map((s) => ({
      ...s,
      title: L.semester[s.id],
      units: s.units.map((u) => ({
        ...u,
        title: o.units?.[u.id]?.title ?? u.lt,
        goals: o.units?.[u.id]?.goals ?? u.goals,
        needs: o.units?.[u.id]?.needs ?? u.needs,
        lessons: u.lessons.map((l) => ({ ...l, title: o.lessons?.[l.id] ?? l.title })),
      })),
      tests: s.tests.map((t) => ({ ...t, title: o.lessons?.[t.id] ?? t.title })),
    })),
  };
}

export async function years(lang: Lang = 'en'): Promise<Year[]> {
  return (await rawYears()).map((y) => localize(y, lang));
}

export const yearHref = (y: Year) => `${base}${y.prefix}${y.path}/`;
export const unitHref = (y: Year, u: { id: string }) => `${base}${y.prefix}${y.path}/${u.id}/`;
export const lessonHref = (y: Year, l: { slug?: string }) => (l.slug ? `${base}${y.prefix}${l.slug}/` : null);

/** One step of the year, in order: every lesson of every unit, then each semester's tests. */
export interface Step {
  id: string; title: string; kind: string; periods: number; href: string | null; outcomes: string[];
  semester: string; unitN: number | null; unitId: string | null; unitTitle: string | null; unitHref: string | null;
  n: number | null; of: number | null;
}

export function sequence(y: Year): Step[] {
  const out: Step[] = [];
  let unitN = 0;
  for (const s of y.semesters) {
    for (const u of s.units) {
      if (u.kind !== 'ready') unitN++;
      u.lessons.forEach((l, i) => out.push({
        id: l.id, title: l.title, kind: l.kind, periods: l.periods, href: lessonHref(y, l), outcomes: l.outcomes, semester: s.title,
        unitN: u.kind === 'ready' ? 0 : unitN, unitId: u.id, unitTitle: u.title, unitHref: unitHref(y, u), n: i + 1, of: u.lessons.length,
      }));
    }
    for (const t of s.tests) out.push({ id: t.id, title: t.title, kind: t.kind, periods: t.periods, href: lessonHref(y, t), outcomes: t.outcomes, semester: s.title, unitN: null, unitId: null, unitTitle: null, unitHref: null, n: null, of: null });
  }
  return out;
}

/** Units numbered through the year (Unit 1 … Unit 9); the start-of-year refresh block is Unit 0. */
export function numberedUnits(y: Year) {
  let n = 0;
  return y.semesters.map((s) => ({ ...s, units: s.units.map((u) => ({ ...u, n: u.kind === 'ready' ? 0 : ++n })) }));
}

/** Where a published lesson (English slug) sits in each year plan that uses it. */
export async function contextsForSlug(slug: string, lang: Lang = 'en') {
  const out: { year: Year; step: Step; next: Step | null; prev: Step | null }[] = [];
  for (const y of await years(lang)) {
    const seq = sequence(y);
    const i = seq.findIndex((s) => s.href === `${base}${y.prefix}${slug}/`);
    if (i >= 0) out.push({ year: y, step: seq[i], next: seq[i + 1] ?? null, prev: seq[i - 1] ?? null });
  }
  return out;
}

/* ------------------------------------------------------------------ routes (root and /lt/) */

export async function gradePaths(lang: Lang = 'en') {
  const ys = await years(lang);
  return [...new Set(ys.map((y) => y.grade))].map((g) => ({ params: { grade: String(g) }, props: { list: ys.filter((y) => y.grade === g) } }));
}

export async function secondPaths(lang: Lang = 'en') {
  const out: { params: Record<string, string>; props: Record<string, unknown> }[] = [];
  for (const y of await years(lang)) {
    if (y.course) { out.push({ params: { grade: String(y.grade), second: y.course.toLowerCase() }, props: { year: y } }); continue; }
    const all = numberedUnits(y).flatMap((s) => s.units.map((u) => ({ u, semester: s.title })));
    all.forEach(({ u, semester }, i) => out.push({
      params: { grade: String(y.grade), second: u.id },
      props: { year: y, unit: u, semester, prev: all[i - 1]?.u ?? null, next: all[i + 1]?.u ?? null },
    }));
  }
  return out;
}

export async function unitOfCoursePaths(lang: Lang = 'en') {
  const out: { params: Record<string, string>; props: Record<string, unknown> }[] = [];
  for (const y of await years(lang)) {
    if (!y.course) continue;
    const all = numberedUnits(y).flatMap((s) => s.units.map((u) => ({ u, semester: s.title })));
    all.forEach(({ u, semester }, i) => out.push({
      params: { grade: String(y.grade), course: y.course!.toLowerCase(), unit: u.id },
      props: { year: y, unit: u, semester, prev: all[i - 1]?.u ?? null, next: all[i + 1]?.u ?? null },
    }));
  }
  return out;
}

/* ------------------------------------------------------------------ the school calendar (src/lib/calendar.mjs) */

export interface CalSlot {
  id: string | null; special: string | null; code: string; title: string; href: string | null; kind: string; part: number; parts: number;
  /** The unit the lesson belongs to (null for semester tests and special slots). */
  unit: string | null; unitHref: string | null;
}
export interface CalWeek {
  n: number; from: string; to: string; dates: string; semester: string; preliminary: boolean; slots: CalSlot[];
  /** A holiday between the previous week and this one. */
  breakBefore: { title: string; dates: string } | null;
}
export interface YearCalendar { weeks: CalWeek[]; weekOf: Record<string, number> }

/** The year's school weeks, with each slot's lesson number ("1.3"), title and link, in the year's language. */
export function yearCalendar(y: Year): YearCalendar | null {
  const cal = buildCalendar(y);
  if (!cal) return null;
  const L = ui(y.lang);
  const steps = new Map(sequence(y).map((s) => [s.id, s]));
  const breaks = (y.calendar?.breaks ?? []).map((b) => ({ ...b, title: y.lang === 'lt' ? b.lt : b.title }));
  const weeks = cal.weeks.map((w, i): CalWeek => {
    const prev = cal.weeks[i - 1];
    const br = prev ? breaks.find((b) => b.from > prev.to && b.from < w.from) : undefined;
    return {
      ...w,
      dates: dateRange(w.from, w.to, y.lang),
      breakBefore: br ? { title: br.title, dates: dateRange(br.from, br.to, y.lang) } : null,
      slots: w.slots.map((sl): CalSlot => {
        if ('special' in sl) return { id: null, special: sl.special, code: '', title: L.weekSlot[sl.special] ?? sl.special, href: null, kind: sl.special, part: 1, parts: 1, unit: null, unitHref: null };
        const st = steps.get(sl.id)!;
        return {
          id: sl.id, special: null, code: st.unitN != null ? `${st.unitN}.${st.n}` : '',
          title: sl.parts > 1 ? `${st.title} (${L.partOf(sl.part, sl.parts)})` : st.title,
          href: st.href ?? `${st.unitHref ?? yearHref(y)}#${st.id}`, kind: st.kind, part: sl.part, parts: sl.parts,
          unit: st.unitTitle, unitHref: st.unitHref,
        };
      }),
    };
  });
  return { weeks, weekOf: cal.weekOf };
}

/** Weeks of a unit or any set of lessons: "3–6 sav. · rugsėjo 14 – spalio 9". Null without a calendar. */
export function weeksOf(y: Year, cal: YearCalendar | null, ids: string[]) {
  if (!cal) return null;
  const ns = ids.map((id) => cal.weekOf[id]).filter((n) => n != null);
  if (!ns.length) return null;
  const a = cal.weeks[Math.min(...ns) - 1], b = cal.weeks[Math.max(...ns) - 1];
  const L = ui(y.lang);
  return { from: a.n, to: b.n, label: L.weeksShort(a.n, b.n), dates: dateRange(a.from, b.to, y.lang) };
}

/** A week's slots in runs: consecutive lessons of one unit ("1.9–1.12 · Quadratic equations"), a test, or n special slots. */
export function weekRuns(w: CalWeek) {
  const runs: { label: string; title: string; href: string | null; special: boolean }[] = [];
  let i = 0;
  while (i < w.slots.length) {
    const s = w.slots[i];
    let j = i + 1;
    const same = (t: CalSlot) => (s.unit ? t.unit === s.unit : s.id ? t.id === s.id : t.special === s.special);
    while (j < w.slots.length && same(w.slots[j])) j++;
    const last = w.slots[j - 1], k = j - i;
    if (s.unit) runs.push({ label: k > 1 ? `${s.code}–${last.code}` : s.code, title: s.unit, href: s.href, special: false });
    else if (s.id) runs.push({ label: '', title: s.title.replace(/ \(.*\)$/, ''), href: s.href, special: false });
    else runs.push({ label: k > 1 ? `${k} ×` : '', title: s.title, href: null, special: true });
    i = j;
  }
  return runs;
}


/** Relative teaching weeks from proposed allocations; no school dates or compulsory pacing are implied. */
export function proposedUnitWeeks(y: Year, unit: {id:string}) {
  const units=y.semesters.flatMap(s=>s.units);
  const index=units.findIndex(u=>u.id===unit.id);
  const before=units.slice(0,index).reduce((sum,u)=>sum+u.hours,0);
  const hours=units[index].hours;
  return ui(y.lang).weeksShort(Math.floor(before/y.lessonsPerWeek)+1,Math.ceil((before+hours)/y.lessonsPerWeek));
}
