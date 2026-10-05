/**
 * Lesson runtime: turns a lesson page (typed blocks from MDX) into the "lesson path".
 * Works in three modes: step by step (pupils), show all (teachers, projector), print (PDF).
 */
import type { FigureHandle, MountFn } from './figkit';
import { judge } from './mathparse';
import { checkQuantity, parseNumber } from './quantity-checker.mjs';
import { markSeen, recordItem, load, getPref, setPref, setDone } from './progress';
import { ui, langFrom } from '../i18n/ui';

const L = ui(langFrom(document.documentElement.lang));

const figureModules = import.meta.glob<{ default: MountFn }>('../figures/*.ts');

const KIND_LABEL: Record<string, string> = L.kind;

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function btn(label: string, cls = 'am-btn', onClick?: () => void) {
  const b = el('button', cls, label);
  b.type = 'button';
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

const isPrint = document.documentElement.classList.contains('am-print');

/* ------------------------------------------------------------------ figures */

interface FigSlot { el: HTMLElement; handle?: FigureHandle; mounting?: Promise<FigureHandle | undefined> }
const figSlots = new WeakMap<HTMLElement, FigSlot>();

function figSlot(figEl: HTMLElement): FigSlot {
  let s = figSlots.get(figEl);
  if (!s) { s = { el: figEl }; figSlots.set(figEl, s); }
  return s;
}

async function mountFigure(figEl: HTMLElement): Promise<FigureHandle | undefined> {
  const slot = figSlot(figEl);
  if (slot.handle) return slot.handle;
  if (slot.mounting) return slot.mounting;
  slot.mounting = (async () => {
    const id = figEl.dataset.figure!;
    const load = figureModules[`../figures/${id}.ts`];
    const cap = $('.am-fig-cap', figEl)!;
    if (!load) { cap.textContent = L.missingFigure(id); return undefined; }
    const mod = await load();
    const props = JSON.parse(figEl.dataset.props || '{}');
    if (figEl.dataset.state) props.state = figEl.dataset.state;
    if (isPrint && figEl.dataset.printState) props.printState = figEl.dataset.printState;
    const handle = mod.default({
      box: $('.am-fig-box', figEl)!, bar: $('.am-fig-bar', figEl)!, props, print: isPrint,
      setCaption: (t) => { cap.textContent = t; },
    });
    for (const r of (figEl.dataset.reveals || '').split(' ').filter(Boolean)) handle.reveal?.(r);
    slot.handle = handle;
    figEl.classList.add('is-mounted');
    return handle;
  })();
  return slot.mounting;
}

function figureOf(node: Element): HTMLElement | null {
  return node.closest('.am-block')?.querySelector<HTMLElement>('.am-figure') ?? null;
}
function setFigState(node: Element, state: string) {
  const f = figureOf(node);
  if (!f) return;
  f.dataset.state = state;
  figSlot(f).handle?.setState(state);
}
function revealOnFigure(node: Element, key: string) {
  const f = figureOf(node);
  if (!f) return;
  f.dataset.reveals = ((f.dataset.reveals || '') + ' ' + key).trim();
  figSlot(f).handle?.reveal?.(key);
}

function watchFigures(root: ParentNode) {
  const figs = $$('.am-figure', root);
  // Print: mount only the figures this PDF shows (hidden blocks have no size to draw in).
  if (isPrint) return Promise.all(figs.filter((f) => f.offsetParent !== null).map(mountFigure));
  if (!('IntersectionObserver' in window)) return Promise.all(figs.map(mountFigure));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && (e.target as HTMLElement).offsetWidth > 0) { io.unobserve(e.target); mountFigure(e.target as HTMLElement); }
  }, { rootMargin: '300px' });
  figs.forEach((f) => io.observe(f));
  return Promise.resolve([]);
}

/* ------------------------------------------------------------------ lesson path */

function initLesson(lesson: HTMLElement) {
  const slug = lesson.dataset.slug!, title = lesson.dataset.title!, url = location.pathname;
  const blocks = $$('.am-block', lesson).filter((b) => b.parentElement?.closest('.am-block') === null || !b.parentElement?.closest('.am-block'));
  const rail = $('.am-rail', lesson)!;
  let current = 0;

  const railBtns = blocks.map((b, i) => {
    const kind = b.dataset.kind!;
    const r = btn('', 'am-rail-btn', () => {
      if (mode() === 'steps') { show(i, true); return; }
      // Show all: highlight the chosen step at once, and keep it while the page scrolls there.
      markRail(i); railLock = i;
      setTimeout(() => { if (railLock === i) railLock = null; }, 1500); // browsers without "scrollend"
      b.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    r.innerHTML = `<i aria-hidden="true"></i><span>${KIND_LABEL[kind] ?? kind}</span>`;
    r.title = b.dataset.title || '';
    if (kind === 'teacher') r.classList.add('am-teacher-only');
    rail.appendChild(r);
    return r;
  });

  // Back / Next at the foot of each block (step mode)
  blocks.forEach((b, i) => {
    const nav = el('div', 'am-block-nav not-content');
    const next = blocks.slice(i + 1).find((x) => x.dataset.kind !== 'teacher');
    if (i > 0) nav.appendChild(btn(L.back, 'am-btn', () => show(i - 1, true)));
    if (next) {
      const j = blocks.indexOf(next);
      nav.appendChild(btn(L.nextKind(KIND_LABEL[next.dataset.kind!] ?? ''), 'am-btn am-btn-pri', () => show(j, true)));
    } else nav.appendChild(el('span', 'am-done', L.endOfLesson));
    b.appendChild(nav);
  });

  function mode() { return lesson.classList.contains('mode-all') ? 'all' : 'steps'; }

  /** Highlight step i in the rail. */
  function markRail(i: number) {
    railBtns.forEach((r, k) => { r.classList.toggle('is-current', k === i); if (k === i) r.setAttribute('aria-current', 'step'); else r.removeAttribute('aria-current'); });
    railBtns[i]?.classList.add('is-seen');
  }
  // Show all: the rail follows the block being read (the last one whose top has passed under the toolbar).
  let railLock: number | null = null, spyQueued = false;
  function spy() {
    spyQueued = false;
    if (mode() !== 'all' || railLock !== null) return;
    const line = Math.max($('.am-toolbar', lesson)?.getBoundingClientRect().bottom ?? 0, 64) + 48;
    const shown = blocks.map((b, k) => [b, k] as const).filter(([b]) => b.offsetParent !== null);
    let cur = shown[0]?.[1] ?? 0;
    for (const [b, k] of shown) if (b.getBoundingClientRect().top <= line) cur = k;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2 && shown.length) cur = shown[shown.length - 1][1];
    markRail(cur);
  }
  addEventListener('scroll', () => { if (!spyQueued) { spyQueued = true; requestAnimationFrame(spy); } }, { passive: true });
  addEventListener('scrollend', () => { railLock = null; });
  for (const ev of ['wheel', 'touchstart', 'keydown'] as const) addEventListener(ev, () => { if (railLock !== null) { railLock = null; } }, { passive: true });
  function setMode(m: 'steps' | 'all') {
    lesson.classList.toggle('mode-all', m === 'all');
    lesson.classList.toggle('mode-steps', m === 'steps');
    $$('[data-mode]', lesson).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    setPref('mode', m);
    if (m === 'steps') show(current, false); else spy();
    watchFigures(lesson);
  }

  function show(i: number, scroll: boolean) {
    current = Math.max(0, Math.min(blocks.length - 1, i));
    blocks.forEach((b, k) => b.classList.toggle('is-current', k === current));
    railBtns.forEach((r, k) => { r.classList.toggle('is-current', k === current); if (k === current) r.setAttribute('aria-current', 'step'); else r.removeAttribute('aria-current'); });
    const b = blocks[current];
    railBtns[current].classList.add('is-seen');
    markSeen(slug, title, url, b.dataset.kind!);
    if (scroll) {
      // Only when the pupil moves: writing a hash during page load makes the browser jump to it.
      history.replaceState(null, '', '#' + b.id);
      lesson.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const h = $('.am-block-title', b) ?? $('.am-kind', b);
      if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }
    $$('.am-figure', b).forEach((f) => requestAnimationFrame(() => mountFigure(f)));
  }

  $$('[data-mode]', lesson).forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as 'steps' | 'all')));
  // Links inside the lesson (the start card's quick refreshes): open the block that holds the target, and the box itself.
  lesson.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[href^="#"]');
    const target = a && document.getElementById(decodeURIComponent(a.hash.slice(1)));
    const i = target ? blocks.findIndex((b) => b.contains(target)) : -1;
    if (!target || i < 0) return;
    e.preventDefault();
    if (target instanceof HTMLDetailsElement) target.open = true;
    if (mode() === 'steps') show(i, false);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('summary', target)?.focus({ preventScroll: true });
  });
  $('[data-action="teacher"]', lesson)?.addEventListener('click', (e) => {
    const on = lesson.classList.toggle('teacher-on');
    (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(on));
  });
  $('[data-action="projector"]', lesson)?.addEventListener('click', (e) => {
    const on = document.documentElement.classList.toggle('am-projector');
    (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(on));
    setPref('projector', on ? '1' : '0');
    if (on && mode() === 'steps') setMode('all');
  });
  if (getPref('projector') === '1') { document.documentElement.classList.add('am-projector'); $('[data-action="projector"]', lesson)?.setAttribute('aria-pressed', 'true'); }

  // Keep pinned figures clear of the sticky toolbar, whatever its height.
  const toolbar = $('.am-toolbar', lesson);
  if (toolbar && 'ResizeObserver' in window) new ResizeObserver(() => lesson.style.setProperty('--am-toolbar-h', toolbar.offsetHeight + 'px')).observe(toolbar);

  const fromHash = blocks.findIndex((b) => '#' + b.id === location.hash);
  if (fromHash >= 0) current = fromHash;
  setMode((getPref('mode') as 'steps' | 'all') || 'steps');
  if (mode() === 'steps') show(current, false);

  return { slug, title, url };
}

/* ------------------------------------------------------------------ frames (steps inside Explain) */

function initFrames(root: ParentNode) {
  for (const group of $$('.am-frames', root)) {
    const frames = $$('.am-frame', group);
    if (!frames.length) continue;
    if (isPrint) { const last = frames[frames.length - 1].dataset.state; const f = figureOf(group); if (f && last) f.dataset.printState = last; continue; }
    const tabs = el('nav', 'am-frame-tabs not-content');
    tabs.setAttribute('aria-label', L.stepsNav);
    const nav = el('div', 'am-frame-nav not-content');
    const back = btn(L.back, 'am-btn', () => go(cur - 1, true));
    const next = btn(L.nextStep, 'am-btn am-btn-pri', () => go(cur + 1, true));
    const count = el('span', 'am-frame-count');
    nav.append(back, next, count);
    const tabBtns = frames.map((f, i) => {
      const t = btn(`${i + 1}. ${f.dataset.title ?? ''}`, 'am-frame-tab', () => go(i, true));
      tabs.appendChild(t);
      f.addEventListener('click', () => { if (group.closest('.mode-all')) go(i); });
      return t;
    });
    group.prepend(tabs);
    group.appendChild(nav);
    let cur = 0;
    const seen = new Set<number>();
    group.classList.add('is-js');
    function go(i: number, focus = false) {
      cur = Math.max(0, Math.min(frames.length - 1, i));
      seen.add(cur);
      frames.forEach((f, k) => f.classList.toggle('is-current', k === cur));
      tabBtns.forEach((t, k) => { if (k === cur) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current'); t.classList.toggle('is-seen', seen.has(k)); });
      back.disabled = cur === 0;
      next.disabled = cur === frames.length - 1;
      count.textContent = L.seen(seen.size, frames.length);
      if (frames[cur].dataset.state) setFigState(group, frames[cur].dataset.state!);
      if (focus && !group.closest('.mode-all')) { const h = $('.am-frame-title', frames[cur]); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
    }
    go(0);
  }
}

/* ------------------------------------------------------------------ worked examples with fading */

function initExamples(root: ParentNode) {
  for (const ex of $$('.am-example', root)) {
    const n = parseInt(ex.dataset.fade || '0', 10);
    if (!n) continue;
    const steps = $$('.am-ex-step', ex);
    steps.slice(-n).forEach((s) => {
      s.classList.add('is-faded');
      if (isPrint) {
        // Worksheet: the pupil writes this step, so it must not be in the PDF at all (not even as hidden text).
        if (document.documentElement.classList.contains('am-print-worksheet')) {
          const body = $('.am-ex-body', s);
          if (body) [...body.childNodes].forEach((n) => { if (!(n instanceof HTMLElement && n.classList.contains('am-ex-label'))) n.remove(); });
        }
        return;
      }
      const prompt = el('div', 'am-yourturn not-content');
      prompt.append(el('span', '', L.yourTurn));
      prompt.appendChild(btn(L.showStep, 'am-btn am-btn-sm', () => { s.classList.remove('is-faded'); s.classList.add('is-revealed'); prompt.remove(); }));
      s.prepend(prompt);
    });
  }
}

/* ------------------------------------------------------------------ check items */

interface ItemCtx { slug: string; title: string; url: string }

function feedback(item: HTMLElement, cls: 'ok' | 'no' | 'hint' | 'info', content: string | Node) {
  const fb = $('.am-fb', item)!;
  fb.innerHTML = '';
  const box = el('div', `am-fbox am-fbox-${cls}`);
  if (typeof content === 'string') box.innerHTML = content; else box.appendChild(content);
  fb.appendChild(box);
}

function setupItem(item: HTMLElement, ctx: ItemCtx) {
  const ctrl = el('div', 'am-ctrl');
  const fb = el('div', 'am-fb');
  fb.setAttribute('aria-live', 'polite');
  $('.am-item-body', item)!.after(ctrl, fb);
  const state = { tries: parseInt(item.dataset.tries || '2', 10), hints: 0, done: false };
  const hints = $$('.am-hint', item);
  const solution = $('.am-solution', item);
  const triesEl = el('span', 'am-tries');
  const updTries = () => { triesEl.textContent = state.done ? '' : L.triesLeft(state.tries); };
  let hintBtn: HTMLButtonElement | null = null;
  if (hints.length) {
    hintBtn = btn(L.hint(0, hints.length), 'am-btn am-btn-hint', () => {
      if (state.hints >= hints.length) return;
      hints[state.hints].classList.add('is-shown');
      state.hints++;
      hintBtn!.textContent = L.hint(state.hints, hints.length);
      if (state.hints >= hints.length) hintBtn!.disabled = true;
    });
  }
  const solBtn = solution ? btn(L.showSolution, 'am-btn am-btn-ghost', () => { solution.classList.add('is-shown'); solBtn!.remove(); }) : null;
  function finish(ok: boolean) {
    state.done = true;
    item.classList.add(ok ? 'is-right' : 'is-given-up');
    updTries();
    if (hintBtn) hintBtn.disabled = true;
    if (!ok && solution) solution.classList.add('is-shown');
    else if (solBtn) ctrl.appendChild(solBtn);
    if (ok && item.dataset.reveal) revealOnFigure(item, item.dataset.reveal);
    if (!ok && item.dataset.reveal) revealOnFigure(item, item.dataset.reveal);
    recordItem(ctx.slug, ctx.title, ctx.url, item.dataset.id || 'item', { ok, tries: parseInt(item.dataset.tries || '2', 10) - state.tries + (ok ? 1 : 0), hints: state.hints });
    autoDone(item);
  }
  /** Returns true if tries remain. */
  function miss(): boolean {
    state.tries--;
    updTries();
    if (state.tries <= 0) { finish(false); return false; }
    return true;
  }
  return { ctrl, state, finish, miss, hintBtn, triesEl, updTries };
}

function okHtml(item: HTMLElement) { return $('.am-ok', item)?.innerHTML ?? ''; }

/** A lesson counts as done once every item in its Check block has been answered (right or not). */
function autoDone(item: HTMLElement) {
  const lesson = item.closest<HTMLElement>('.am-lesson');
  const id = lesson?.dataset.planId;
  if (!lesson || !id) return;
  const items = $$('.am-block-check .am-item', lesson).filter((i) => !i.closest('.am-check-form[hidden]'));
  if (items.length && items.every((i) => i.classList.contains('is-right') || i.classList.contains('is-given-up') || i.classList.contains('is-reviewed'))) setDone(id, true);
}

function whyFor(nodes: HTMLElement[]) { return nodes.map((n) => n.innerHTML).join(' '); }

function initChoice(item: HTMLElement, ctx: ItemCtx) {
  const multi = item.dataset.kind === 'multi';
  const opts = $$('.am-opt', item);
  const box = el('div', 'am-opts');
  opts[0].before(box);
  const order = item.dataset.shuffle === 'false' ? opts : [...opts].sort(() => Math.random() - 0.5);
  const S = setupItem(item, ctx);
  const buttons = order.map((o) => {
    const b = el('button', 'am-opt-btn');
    b.type = 'button';
    const why = $$('.am-why', o);
    why.forEach((w) => w.remove());
    b.innerHTML = $('.am-opt-text', o)!.innerHTML;
    (b as any)._why = why;
    (b as any)._correct = o.dataset.correct === '1';
    if (multi) b.setAttribute('aria-pressed', 'false');
    box.appendChild(b);
    o.remove();
    return b;
  });
  const reveal = () => buttons.forEach((b) => { if ((b as any)._correct) b.classList.add('right'); b.disabled = true; });
  if (!multi) {
    for (const b of buttons) b.addEventListener('click', () => {
      if (S.state.done) return;
      buttons.forEach((x) => x.classList.remove('wrong'));
      const why = whyFor((b as any)._why);
      if ((b as any)._correct) { b.classList.add('right'); reveal(); feedback(item, 'ok', `<b>${L.correct}</b> ${why}`); S.finish(true); }
      else {
        b.classList.add('wrong');
        if (S.miss()) feedback(item, 'no', `${why || L.notThis} ${L.tryAgain}`);
        else { reveal(); feedback(item, 'info', `${why} ${L.correctHighlighted}`); }
      }
    });
  } else {
    for (const b of buttons) b.addEventListener('click', () => { if (!S.state.done) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); });
    S.ctrl.appendChild(btn(L.check, 'am-btn am-btn-pri', () => {
      if (S.state.done) return;
      const wrongPicked = buttons.filter((b) => b.getAttribute('aria-pressed') === 'true' && !(b as any)._correct);
      const missed = buttons.filter((b) => b.getAttribute('aria-pressed') !== 'true' && (b as any)._correct);
      buttons.forEach((b) => b.classList.remove('wrong'));
      if (!wrongPicked.length && !missed.length) { reveal(); feedback(item, 'ok', `<b>${L.correct}</b> ${L.allRight}`); S.finish(true); return; }
      wrongPicked.forEach((b) => b.classList.add('wrong'));
      const msg = [wrongPicked.length ? `${L.wrongChosen(wrongPicked.length)} ${whyFor(wrongPicked.flatMap((b) => (b as any)._why))}` : '', missed.length ? L.missing(missed.length) : ''].filter(Boolean).join(' ');
      if (S.miss()) feedback(item, 'no', msg + ' ' + L.tryAgain); else { reveal(); feedback(item, 'info', L.correctOptionsHighlighted); }
    }));
  }
  if (S.hintBtn) S.ctrl.appendChild(S.hintBtn);
  S.ctrl.appendChild(S.triesEl); S.updTries();
}

function initNumeric(item: HTMLElement, ctx: ItemCtx) {
  const S = setupItem(item, ctx);
  const answer = item.dataset.answer!;
  const decimals = item.dataset.decimals ? parseInt(item.dataset.decimals, 10) : undefined;
  const ordered = item.dataset.ordered === 'true';
  const whys = $$('.am-why[data-value]', item);
  whys.forEach((w) => w.remove());
  const label = el('label', 'am-num-label', item.dataset.prefix || L.answer);
  const input = el('input', 'am-num-input');
  input.id = `in-${item.dataset.id}`;
  label.htmlFor = input.id;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.inputMode = 'text';
  input.placeholder = item.dataset.placeholder || (answer.includes(';') ? L.placeholderMany : L.placeholderOne);
  const unit = item.dataset.unit ? el('span', 'am-num-unit', item.dataset.unit) : null;
  const check = btn(L.check, 'am-btn am-btn-pri', run);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
  S.ctrl.append(label, input, ...(unit ? [unit] : []), check);
  if (S.hintBtn) S.ctrl.appendChild(S.hintBtn);
  S.ctrl.appendChild(S.triesEl); S.updTries();
  const expectedN = answer.split(';').length;
  function run() {
    if (S.state.done) return;
    const raw = input.value;
    if (!raw.trim()) { feedback(item, 'info', L.typeFirst); return; }
    const { verdict } = judge(raw, answer, decimals, ordered);
    if (verdict === 'ok') {
      input.disabled = true; check.disabled = true;
      feedback(item, 'ok', `<b>${L.correct}</b> ${okHtml(item)}`);
      S.finish(true); return;
    }
    if (verdict === 'unreadable') { feedback(item, 'info', L.unreadable); return; }
    if (verdict === 'count') {
      // A typical incomplete answer (one root of two) can have its own <Why>; it does not cost a try.
      const w = whys.find((x) => judge(raw, x.dataset.value!, decimals, ordered).verdict === 'ok');
      feedback(item, w ? 'hint' : 'info', w ? `${w.innerHTML} ${L.giveN(expectedN)}` : L.giveN(expectedN));
      return;
    }
    if (verdict === 'round') { feedback(item, 'hint', L.roundTo(decimals!)); return; }
    const w = whys.find((x) => judge(raw, x.dataset.value!, decimals, ordered).verdict === 'ok');
    const why = w ? w.innerHTML : L.notQuite;
    if (S.miss()) feedback(item, 'no', `${why} ${L.tryAgain}`);
    else { input.disabled = true; check.disabled = true; feedback(item, 'info', `${why} ${L.theAnswerIs($('.am-key-val', item)?.innerHTML ?? answer, !!$('.am-solution', item))}`); }
  }
}

function initQuantity(item: HTMLElement, ctx: ItemCtx) {
  const S = setupItem(item, ctx);
  const spec = JSON.parse(item.dataset.spec!);
  const lt = document.documentElement.lang.startsWith('lt');
  const input = el('input', 'am-num-input'); input.id = `in-${item.dataset.id}`;
  input.inputMode = 'decimal'; input.autocomplete = 'off'; input.placeholder = lt ? 'pvz., 16,8' : 'e.g. 16.8';
  const label = el('label', 'am-num-label', item.dataset.prefix || L.answer); label.htmlFor = input.id;
  const select = el('select', 'am-btn'); select.id = `unit-${item.dataset.id}`;
  const unitLabel = el('label', 'am-num-label', lt ? 'Vienetas' : 'Unit'); unitLabel.htmlFor=select.id;
  for (const u of spec.accepted_units) { const o=el('option', undefined, u); o.value=u; select.append(o); }
  const check=btn(L.check,'am-btn am-btn-pri',run);
  S.ctrl.append(label,input,unitLabel,select,check);
  if(S.hintBtn) S.ctrl.append(S.hintBtn); S.ctrl.append(S.triesEl); S.updTries();
  const whys=$$('.am-why[data-value]',item); whys.forEach(w=>w.remove());
  input.addEventListener('keydown',e=>{if(e.key==='Enter')run();});
  function run() {
    if(S.state.done)return;
    const result=checkQuantity(input.value,select.value,spec);
    if(result.code==='correct'){feedback(item,'ok',`<b>${L.correct}</b> ${okHtml(item)}`);input.disabled=true;select.disabled=true;check.disabled=true;S.finish(true);return;}
    const messages:Record<string,string>={format:'Enter one finite number, using a point or comma; select the unit separately.',unit:'Select a unit accepted for this quantity.',range:'An absolute temperature cannot be below 0 K.',sign:'Check the sign convention and the direction of temperature change.',value:'Check the mass unit, temperature difference and calculation.'};
    let why=lt ? result.message : messages[result.code];
    const parsed=parseNumber(input.value);
    const w=whys.find(w=>parseNumber(w.dataset.value!)?.value===parsed?.value); if(w) why=w.innerHTML;
    if(['format','unit','range'].includes(result.code)){feedback(item,'info',why);return;}
    if(S.miss())feedback(item,'no',`${why} ${L.tryAgain}`);
    else {input.disabled=true;select.disabled=true;check.disabled=true;feedback(item,'info',`${why} ${L.theAnswerIs(item.dataset.answer!,true)}`);}
  }
}

function initOrder(item: HTMLElement, ctx: ItemCtx) {
  const S = setupItem(item, ctx);
  const src = $$('.am-order-item', item);
  src.forEach((s, i) => { s.dataset.i = String(i); });
  let order = [...src];
  do { order.sort(() => Math.random() - 0.5); } while (order.length > 1 && order.every((s, i) => s.dataset.i === String(i)));
  const list = el('ol', 'am-order-list');
  src[0].before(list);
  function draw() {
    list.innerHTML = '';
    order.forEach((s, i) => {
      const li = el('li', 'am-order-li');
      const txt = el('div', 'am-order-txt'); txt.innerHTML = s.innerHTML;
      const up = btn('↑', 'am-btn am-btn-sm', () => { if (i > 0) { [order[i - 1], order[i]] = [order[i], order[i - 1]]; draw(); (list.children[i - 1].querySelector('button') as HTMLButtonElement)?.focus(); } });
      const dn = btn('↓', 'am-btn am-btn-sm', () => { if (i < order.length - 1) { [order[i + 1], order[i]] = [order[i], order[i + 1]]; draw(); (list.children[i + 1].querySelectorAll('button')[1] as HTMLButtonElement)?.focus(); } });
      up.setAttribute('aria-label', L.moveUp); dn.setAttribute('aria-label', L.moveDown);
      up.disabled = i === 0 || S.state.done; dn.disabled = i === order.length - 1 || S.state.done;
      li.append(txt, el('span', 'am-order-btns'));
      li.lastElementChild!.append(up, dn);
      list.appendChild(li);
    });
  }
  src.forEach((s) => (s.hidden = true));
  draw();
  S.ctrl.appendChild(btn(L.check, 'am-btn am-btn-pri', () => {
    if (S.state.done) return;
    const first = order.findIndex((s, i) => s.dataset.i !== String(i));
    $$('.am-order-li', list).forEach((li) => li.classList.remove('wrong'));
    if (first < 0) { S.state.done = true; draw(); feedback(item, 'ok', `<b>${L.correct}</b> ${L.rightOrder}`); S.finish(true); return; }
    list.children[first].classList.add('wrong');
    if (S.miss()) feedback(item, 'no', L.outOfPlace(first + 1));
    else { order = [...src]; draw(); feedback(item, 'info', L.correctOrder); }
  }));
  if (S.hintBtn) S.ctrl.appendChild(S.hintBtn);
  S.ctrl.appendChild(S.triesEl); S.updTries();
}

function initMark(item: HTMLElement, ctx: ItemCtx) {
  const S = setupItem(item, ctx);
  const fig = figureOf(item);
  if (!fig) { feedback(item, 'info', L.needsFigure); return; }
  let armed = false, start: [number, number] | null = null;
  const go = btn(L.startTap, 'am-btn am-btn-pri', () => {
    armed = true; go.textContent = L.tapNow; go.classList.add('is-armed');
    if (innerWidth < 900) fig.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  S.ctrl.append(go);
  // Equivalent without a pointer: choose the point from a list.
  const choices = (item.dataset.choices || '').split('|').map((c) => c.trim()).filter(Boolean);
  let chooseListButton: HTMLButtonElement | null = null;
  let list: HTMLElement | null = null;
  if (choices.length) {
    const alt = btn(L.chooseList, 'am-btn am-btn-ghost', () => {
      alt.remove();
      list = el('div', 'am-opts');
      list.setAttribute('role', 'group');
      list.setAttribute('aria-label', L.pointsList);
      for (const c of choices) {
        const ok = c.startsWith('*');
        const b = btn(ok ? c.slice(1) : c, 'am-opt-btn', () => {
          if (S.state.done) return;
          if (ok) { b.classList.add('right'); list?.querySelectorAll('button').forEach((x) => ((x as HTMLButtonElement).disabled = true)); go.disabled = true; go.textContent = L.done; feedback(item, 'ok', `<b>${L.correct}</b> ${okHtml(item)}`); S.finish(true); }
          else { b.classList.add('wrong'); if (S.miss()) feedback(item, 'no', L.notThisPoint); else { list?.querySelectorAll('button').forEach((x) => ((x as HTMLButtonElement).disabled = true)); go.disabled = true; go.textContent = L.shown; feedback(item, 'info', `${okHtml(item)} ${L.markedOnFigure}`); } }
        });
        list.appendChild(b);
      }
      $('.am-fb', item)!.before(list);
      (list.firstElementChild as HTMLElement)?.focus();
    });
    chooseListButton = alt;
    S.ctrl.appendChild(alt);
  }
  if (S.hintBtn) S.ctrl.appendChild(S.hintBtn);
  S.ctrl.appendChild(S.triesEl); S.updTries();
  const box = $('.am-fig-box', fig)!;
  box.addEventListener('pointerdown', (e) => { start = [e.clientX, e.clientY]; });
  box.addEventListener('pointerup', async (e) => {
    if (!armed || S.state.done || !start || Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 6) return;
    const h = await mountFigure(fig);
    if (!h?.hit) return;
    const hit = h.hit(item.dataset.target!, e);
    if (hit === 'ambiguous') { feedback(item, 'hint', L.ambiguousFigure); return; }
    if (hit === true) {
      armed = false; go.disabled = true; go.textContent = L.done;
      chooseListButton?.remove();
      list?.querySelectorAll('button').forEach((x) => ((x as HTMLButtonElement).disabled = true));
      feedback(item, 'ok', `<b>${L.correct}</b> ${okHtml(item)}`);
      S.finish(true);
    } else if (S.miss()) feedback(item, 'hint', L.notThere);
    else { armed = false; go.disabled = true; go.textContent = L.shown; chooseListButton?.remove(); list?.querySelectorAll('button').forEach((x) => ((x as HTMLButtonElement).disabled = true)); feedback(item, 'info', `${okHtml(item)} ${L.markedOnFigure}`); }
  });
}

function initTask(item: HTMLElement, ctx: ItemCtx) {
  const S = setupItem(item, ctx);
  const marks = $$('.am-mark', item);
  const itemId = item.dataset.id || 'task';
  const previous = load().lessons[ctx.slug]?.items[itemId];
  const total = marks.reduce((s, m) => s + parseFloat(m.dataset.pts || '1'), 0);
  const score = el('span', 'am-score');
  const markList = $('.am-marks', item);
  const go = btn(L.writtenMark, 'am-btn am-btn-pri', () => {
    markList?.classList.add('is-shown');
    $('.am-solution', item)?.classList.add('is-shown');
    go.remove();
    upd();
  });
  S.ctrl.append(go);
  if (S.hintBtn) S.ctrl.appendChild(S.hintBtn);
  S.triesEl.remove();
  marks.forEach((m, i) => {
    const cb = el('input'); cb.type = 'checkbox'; cb.id = `${item.dataset.id}-m${i}`; cb.checked = !!previous?.marks?.[i];
    const lab = el('label'); lab.htmlFor = cb.id;
    while (m.firstChild) lab.appendChild(m.firstChild);
    lab.appendChild(el('span', 'am-pts', `${m.dataset.pts || 1} ${L.pt}`));
    m.append(cb, lab);
    cb.addEventListener('change', upd);
  });
  markList?.appendChild(score);
  const scoreNow = () => marks.reduce((s, m) => s + ($<HTMLInputElement>('input', m)!.checked ? parseFloat(m.dataset.pts || '1') : 0), 0);
  if (previous?.marks) score.textContent = L.yourMark(scoreNow(), total);
  if (previous) {
    markList?.classList.add('is-shown');
    $('.am-solution', item)?.classList.add('is-shown');
    go.remove();
  }
  function upd() {
    const got = scoreNow();
    score.textContent = L.yourMark(got, total);
    item.classList.add('is-reviewed');
    autoDone(item);
    recordItem(ctx.slug, ctx.title, ctx.url, itemId, { ok: got === total, tries: 1, hints: S.state.hints, marks: marks.map((m) => !!$<HTMLInputElement>('input', m)?.checked) });
  }
}

function initItems(root: ParentNode, ctx: ItemCtx) {
  for (const item of $$('.am-item', root)) {
    if (isPrint) continue;
    const k = item.dataset.kind;
    if (k === 'choice' || k === 'multi') initChoice(item, ctx);
    else if (k === 'numeric') initNumeric(item, ctx);
    else if (k === 'quantity') initQuantity(item, ctx);
    else if (k === 'order') initOrder(item, ctx);
    else if (k === 'mark') initMark(item, ctx);
    else if (k === 'task') initTask(item, ctx);
  }
}

/* ------------------------------------------------------------------ print preparation */

/** Deterministic shuffle so the worksheet and the answer key show the same order. */
function seeded(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
function shuffled<T>(xs: T[], rnd: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function preparePrint(root: ParentNode) {
  const key = document.documentElement.classList.contains('am-print-key');
  $$<HTMLDetailsElement>('details.am-refresh', root).forEach((d) => { d.open = true; });
  for (const item of $$('.am-item', root)) {
    const k = item.dataset.kind, rnd = seeded(item.dataset.id || '');
    if (key && item.dataset.reveal) {
      const f = figureOf(item);
      if (f) f.dataset.reveals = ((f.dataset.reveals || '') + ' ' + item.dataset.reveal).trim();
    }
    if (k === 'choice' || k === 'multi') {
      const opts = $$('.am-opt', item);
      const list = el('ol', 'am-popts');
      opts[0].before(list);
      shuffled(opts, rnd).forEach((o) => list.appendChild(o));
    }
    if (k === 'order') {
      const steps = $$('.am-order-item', item);
      const list = el('ol', 'am-porder');
      steps[0].before(list);
      let order = shuffled(steps, rnd);
      if (order.every((s, i) => s === steps[i])) order = [...steps.slice(1), steps[0]];
      (key ? steps : order).forEach((s) => list.appendChild(s));
    }
  }
}

/* ------------------------------------------------------------------ boot */

function boot() {
  const lesson = $('.am-lesson');
  if (!lesson) return;
  let ctx: ItemCtx;
  if (isPrint) {
    lesson.classList.add('mode-all');
    ctx = { slug: lesson.dataset.slug!, title: lesson.dataset.title!, url: location.pathname };
  } else ctx = initLesson(lesson);
  if (isPrint) preparePrint(lesson);
  initFrames(lesson);
  initExamples(lesson);
  initItems(lesson, ctx);
  if (isPrint) {
    watchFigures(lesson).then(() => requestAnimationFrame(() => { (window as any).__amReady = true; }));
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
