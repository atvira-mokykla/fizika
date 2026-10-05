// @ts-check
/**
 * The school calendar of a year plan: school weeks with dates, the official holidays, and the lessons of each week.
 * Plain JavaScript, so that astro.config.mjs (the sidebar) and the pages (through plan.ts) use the same code.
 *
 * A year plan may have
 *   calendar:
 *     start: "2026-09-01"                 # the first school day
 *     breaks: [{ from, to, title, lt }]   # holidays (BUP); a week whose five weekdays all fall in one is skipped
 *     preliminary: [spring]               # semesters whose weeks are a first draft
 *     weeks:                              # one list per school week, in order
 *       - [g9-rd-1, g9-rd-2, g9-rd-3, g9-rd-4]
 * Every lesson of the plan appears once per class period, in the plan's order. The other slots are SPECIAL.
 */

/** Slots that are not pages: a flexible period (practice or catch-up), the targeted refresh, feedback on a test. */
export const SPECIAL = ['reserve', 'refresh', 'feedback'];

const DAY = 86400000;
/** @param {string} s "YYYY-MM-DD" */
const ms = (s) => Date.parse(`${s}T00:00:00Z`);
/** @param {number} t */
const iso = (t) => new Date(t).toISOString().slice(0, 10);

/**
 * School weeks, Monday to Friday, from the first school day. A week whose five weekdays all fall in a break is skipped.
 * The first week starts on the first school day (1 September may be a Tuesday).
 * @param {string} start
 * @param {{ from: string, to: string }[]} breaks
 * @param {number} count
 */
export function schoolWeeks(start, breaks, count) {
  const inBreak = (/** @type {number} */ t) => breaks.some((b) => t >= ms(b.from) && t <= ms(b.to));
  const s = ms(start);
  let monday = s - ((new Date(s).getUTCDay() + 6) % 7) * DAY;
  /** @type {{ from: string, to: string }[]} */
  const out = [];
  while (out.length < count) {
    // The week runs from its first to its last school day (1 September may be a Tuesday; Easter Monday is off).
    const days = [0, 1, 2, 3, 4].map((k) => monday + k * DAY).filter((t) => t >= s && !inBreak(t));
    if (days.length) out.push({ from: iso(days[0]), to: iso(days[days.length - 1]) });
    monday += 7 * DAY;
    if (out.length === 0 && monday - s > 400 * DAY) throw new Error('calendar: no school week found');
  }
  return out;
}

/**
 * @typedef {{ id: string, part: number, parts: number } | { special: string }} Slot
 * @typedef {{ n: number, from: string, to: string, semester: string, preliminary: boolean, slots: Slot[] }} Week
 */

/**
 * The weeks of a year plan, checked against its lessons. Returns null when the plan has no calendar.
 * Throws (and so fails the build) when a lesson is missing, repeated, out of order, or a week is too full.
 * @param {any} year a year plan, as read from src/content/years/*.yaml
 * @returns {{ weeks: Week[], weekOf: Record<string, number> } | null}
 */
export function buildCalendar(year) {
  const c = year.calendar;
  if (!c) return null;
  const where = `calendar of ${year.path}`;
  const real = (/** @type {string} */ d) => !Number.isNaN(ms(d)) && iso(ms(d)) === d;
  if (!real(c.start)) throw new Error(`${where}: start "${c.start}" is not a real date`);
  (c.breaks ?? []).forEach((/** @type {{ from: string, to: string }} */ b, /** @type {number} */ i, /** @type {any[]} */ all) => {
    if (!real(b.from) || !real(b.to) || b.from > b.to) throw new Error(`${where}: break ${b.from}–${b.to} is not a valid range`);
    if (i > 0 && all[i - 1].to >= b.from) throw new Error(`${where}: breaks must be in order and must not overlap`);
  });
  if (year.weeks && c.weeks.length > year.weeks) throw new Error(`${where}: ${c.weeks.length} weeks, but the year has ${year.weeks}`);
  /** @type {{ id: string, semester: string, periods: number }[]} */
  const order = [];
  for (const s of year.semesters) {
    for (const u of s.units) for (const l of u.lessons ?? []) order.push({ id: l.id, semester: s.id, periods: l.periods ?? 1 });
    for (const t of s.tests ?? []) order.push({ id: t.id, semester: s.id, periods: t.periods ?? 1 });
  }
  const expected = order.flatMap((o) => Array(o.periods).fill(o.id));
  const semesterOf = Object.fromEntries(order.map((o) => [o.id, o.semester]));
  const periodsOf = Object.fromEntries(order.map((o) => [o.id, o.periods]));
  /** @type {string[][]} */
  const raw = c.weeks;
  const got = raw.flat().filter((x) => !SPECIAL.includes(x));
  for (let i = 0; i < Math.max(got.length, expected.length); i++) {
    if (got[i] !== expected[i]) {
      throw new Error(`${where}: slot ${i + 1} is "${got[i] ?? '(none)'}", but the plan's order needs "${expected[i] ?? '(nothing more)'}". `
        + 'Every lesson must appear once per class period, in the order of the year plan.');
    }
  }
  raw.forEach((w, i) => {
    if (w.length > year.lessonsPerWeek) throw new Error(`${where}: week ${i + 1} has ${w.length} slots, more than ${year.lessonsPerWeek}`);
    if (w.length === 0) throw new Error(`${where}: week ${i + 1} is empty`);
  });

  const dates = schoolWeeks(c.start, c.breaks ?? [], raw.length);
  /** @type {Record<string, number>} */
  const weekOf = {};
  /** @type {Record<string, number>} */
  const seen = {};
  let semester = order[0]?.semester ?? 'autumn';
  /** @type {Week[]} */
  const weeks = raw.map((w, i) => {
    const first = w.find((x) => !SPECIAL.includes(x));
    if (first) semester = semesterOf[first];
    const slots = w.map((x) => {
      if (SPECIAL.includes(x)) return { special: x };
      seen[x] = (seen[x] ?? 0) + 1;
      if (!(x in weekOf)) weekOf[x] = i + 1;
      return { id: x, part: seen[x], parts: periodsOf[x] };
    });
    return { n: i + 1, ...dates[i], semester, preliminary: (c.preliminary ?? []).includes(semester), slots };
  });
  return { weeks, weekOf };
}

/** The first and last week of a set of lessons, e.g. a unit: [3, 6]. Null if none is in the calendar. */
export function weekSpan(/** @type {Record<string, number>} */ weekOf, /** @type {string[]} */ ids) {
  const ns = ids.map((id) => weekOf[id]).filter((n) => n != null);
  return ns.length ? [Math.min(...ns), Math.max(...ns)] : null;
}

const LT_MONTHS = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A date range without the year: "14–18 Sep", "28 Sep – 2 Oct"; in Lithuanian "rugsėjo 14–18", "rugsėjo 28 – spalio 2".
 * @param {string} from @param {string} to @param {'en' | 'lt'} lang
 */
export function dateRange(from, to, lang) {
  const a = new Date(ms(from)), b = new Date(ms(to));
  const [ma, da, mb, db] = [a.getUTCMonth(), a.getUTCDate(), b.getUTCMonth(), b.getUTCDate()];
  if (lang === 'lt') return ma === mb ? `${LT_MONTHS[ma]} ${da}–${db}` : `${LT_MONTHS[ma]} ${da} – ${LT_MONTHS[mb]} ${db}`;
  return ma === mb ? `${da}–${db} ${EN_MONTHS[ma]}` : `${da} ${EN_MONTHS[ma]} – ${db} ${EN_MONTHS[mb]}`;
}
