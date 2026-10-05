/**
 * Year, unit and home pages: ticks, progress bars, "Next lesson", the weekly goal and "my year".
 * Everything is read from and written to this browser only (see progress.ts).
 */
import { load, doneMap, setDone, doneThisWeek, weekStreak, getPref, setPref } from './progress';
import { ui, langFrom } from '../i18n/ui';

const L = ui(langFrom(document.documentElement.lang));

interface SeqItem { id: string; title: string; href: string | null; label: string; unitHref: string | null; unitId: string | null }

const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));

/** "YYYY-MM-DD" of today, in the pupil's time zone. */
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function refresh() {
  const done = doneMap(load());

  for (const cb of $$<HTMLInputElement>('input[data-done]')) {
    cb.checked = !!done[cb.value];
    cb.closest('[data-row]')?.classList.toggle('is-done', cb.checked);
  }

  for (const el of $$('[data-progress]')) {
    const ids = (el.dataset.ids || '').split(' ').filter(Boolean);
    const k = ids.filter((id) => done[id]).length;
    el.style.setProperty('--p', String(ids.length ? k / ids.length : 0));
    el.classList.toggle('is-started', k > 0);
    el.classList.toggle('is-complete', ids.length > 0 && k === ids.length);
    const t = el.querySelector('.am-pct');
    if (t) t.textContent = `${k} of ${ids.length}`;
    el.setAttribute('aria-valuenow', String(k));
    el.setAttribute('aria-valuemax', String(ids.length));
  }

  for (const el of $$('[data-next]')) {
    const seq: SeqItem[] = JSON.parse(el.dataset.seq || '[]');
    // Start from the unit the pupil's class is on, if they pinned one; otherwise from the start of the year.
    // Only lessons that are on the site: the plan's weeks are in "This week".
    const pinned = getPref('classUnit:' + el.dataset.year);
    const from = Math.max(0, pinned ? seq.findIndex((s) => s.unitId === pinned) : 0);
    const open = (s: SeqItem) => !!s.href && !done[s.id];
    const next = seq.slice(from).find(open) ?? seq.find(open);
    const title = el.querySelector('.am-next-title')!, meta = el.querySelector('.am-next-meta')!, link = el.querySelector<HTMLAnchorElement>('a.am-next-go')!, note = el.querySelector('.am-next-note');
    if (!next) {
      const all = seq.every((s) => done[s.id]);
      title.textContent = all ? L.finishedYear : L.allOnSiteDone;
      meta.textContent = all ? L.finishedYearNote : '';
      link.hidden = true;
      if (note) note.textContent = '';
      continue;
    }
    title.textContent = next.title;
    meta.textContent = next.label;
    link.hidden = false;
    link.href = next.href ?? `${next.unitHref ?? ''}#${next.id}`;
    link.textContent = next.href ? L.openLesson : L.openUnit;
    if (note) note.textContent = next.href ? '' : L.notOnSite;
  }

  for (const el of $$('[data-week]')) {
    const goal = parseInt(getPref('weekGoal') || el.dataset.default || '4', 10);
    const n = doneThisWeek();
    const dots = el.querySelector('.am-week-dots')!;
    dots.innerHTML = '';
    for (let i = 0; i < Math.max(goal, n); i++) { const d = document.createElement('i'); if (i < n) d.className = 'on'; dots.appendChild(d); }
    el.querySelector('.am-week-text')!.textContent = L.weekText(n, goal);
    const s = weekStreak();
    el.querySelector('.am-week-streak')!.textContent = L.streak(s);
    const sel = el.querySelector<HTMLSelectElement>('select');
    if (sel && document.activeElement !== sel) sel.value = String(goal);
  }

  // The school calendar: the current week (or the coming one, in a break or at the weekend) and the next one.
  const today = todayIso();
  for (const el of $$('[data-cal-now]')) {
    const weeks = $$('[data-cal-week]', el);
    let cur = weeks.find((w) => w.dataset.from! <= today && today <= w.dataset.to!);
    const now = !!cur;
    if (!cur) cur = weeks.find((w) => w.dataset.from! > today);
    const intro = el.querySelector<HTMLElement>('[data-cal-intro]')!;
    intro.hidden = !(cur === weeks[0] && !now) && !!cur;
    intro.textContent = cur ? el.dataset.notStarted! : el.dataset.over!;
    el.querySelector('[data-cal-label]')!.textContent = now || !cur ? el.dataset.labelThis! : el.dataset.labelComing!;
    for (const w of weeks) w.hidden = w !== cur;
    // A break is mentioned only while it lasts, before the week that follows it.
    for (const b of $$('[data-break]', el)) b.hidden = now;
    for (const li of $$('[data-slot]', el)) li.classList.toggle('is-done', !!done[li.dataset.slot!]);
    const nxt = cur ? weeks[weeks.indexOf(cur) + 1] : undefined;
    const line = el.querySelector<HTMLElement>('[data-cal-next]')!;
    line.hidden = !nxt;
    if (nxt) {
      const items = [...new Set($$('[data-slot]', nxt).map((li) => li.querySelector('.am-slot-n')?.textContent || li.textContent!.trim()))];
      line.textContent = `${now ? el.dataset.labelNext : el.dataset.labelAfter} (${nxt.dataset.short}): ${items.join(', ')}`;
    }
  }
  for (const row of $$('[data-cal-row]')) row.classList.toggle('is-now', row.dataset.from! <= today && today <= row.dataset.to!);

  for (const el of $$('[data-pin-unit]')) {
    const [year, unit] = el.dataset.pinUnit!.split(':');
    const on = getPref('classUnit:' + year) === unit;
    el.setAttribute('aria-pressed', String(on));
    el.textContent = on ? L.pinnedUnit : L.pinUnit;
    el.classList.toggle('am-btn-on', on);
  }
  for (const el of $$('[data-class-badge]')) {
    const [year, unit] = el.dataset.classBadge!.split(':');
    const on = getPref('classUnit:' + year) === unit;
    el.hidden = !on;
    el.closest('.am-unit-card')?.classList.toggle('is-class', on);
  }

  const mine = getPref('year');
  for (const el of $$('[data-set-year]')) {
    const isMine = mine === el.dataset.setYear;
    el.classList.toggle('is-mine', isMine);
    const b = el.querySelector('button');
    if (b) { b.textContent = isMine ? L.isMine : L.makeMine; b.setAttribute('aria-pressed', String(isMine)); }
  }
  for (const el of $$('[data-mine-only]')) el.hidden = !mine || el.dataset.mineOnly !== mine;
  for (const el of $$('[data-no-mine]')) el.hidden = !!mine;
  for (const el of $$('[data-has-mine]')) el.hidden = !mine;
}

function init() {
  document.addEventListener('change', (e) => {
    const t = e.target as HTMLElement;
    if (t instanceof HTMLInputElement && t.dataset.done !== undefined) setDone(t.value, t.checked);
    if (t instanceof HTMLSelectElement && t.closest('[data-week]')) { setPref('weekGoal', t.value); refresh(); }
  });
  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-choose-year]');
    if (t) setPref('year', t.dataset.chooseYear!);
    const pin = (e.target as HTMLElement).closest<HTMLElement>('[data-pin-unit]');
    if (pin) {
      const [year, unit] = pin.dataset.pinUnit!.split(':');
      setPref('classUnit:' + year, getPref('classUnit:' + year) === unit ? '' : unit);
      refresh();
    }
    const b = (e.target as HTMLElement).closest('[data-set-year] button');
    if (b) {
      const box = b.closest<HTMLElement>('[data-set-year]')!;
      const mine = getPref('year') === box.dataset.setYear;
      setPref('year', mine ? '' : box.dataset.setYear!);
      refresh();
    }
  });
  document.addEventListener('am:progress', refresh);
  window.addEventListener('storage', refresh);
  refresh();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
