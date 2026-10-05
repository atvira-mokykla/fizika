/**
 * A small, safe evaluator for pupils' answers.
 * Accepts decimal commas or points, √ and sqrt(), π/pi, ^, fractions and implicit
 * multiplication (2√3, 3(x)). No variables: answers are numbers. "3 ± √2" stands for two values.
 */

type Tok = { t: 'num'; v: number; dec: number } | { t: 'op'; v: string } | { t: 'fn'; v: string } | { t: '(' } | { t: ')' };

export function normalise(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, '-')
    .replace(/[·×⋅]/g, '*')
    .replace(/:/g, '/')
    .replace(/\s+/g, '')
    .replace(/^[a-z][\w₀-₉]*=/, ''); // "x=3", "x₁=3" → "3"
}

function tokenize(s: string): Tok[] | null {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const num = /^\d+(?:[.,]\d+)?/.exec(s.slice(i));
    if (num) {
      const txt = num[0].replace(',', '.');
      out.push({ t: 'num', v: parseFloat(txt), dec: (txt.split('.')[1] || '').length });
      i += num[0].length;
      continue;
    }
    if (s.startsWith('sqrt', i)) { out.push({ t: 'fn', v: 'sqrt' }); i += 4; continue; }
    if (c === '√') { out.push({ t: 'fn', v: 'sqrt' }); i++; continue; }
    if (s.startsWith('pi', i)) { out.push({ t: 'num', v: Math.PI, dec: 0 }); i += 2; continue; }
    if (c === 'π') { out.push({ t: 'num', v: Math.PI, dec: 0 }); i++; continue; }
    if ('+-*/^'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    if (c === '(') { out.push({ t: '(' }); i++; continue; }
    if (c === ')') { out.push({ t: ')' }); i++; continue; }
    return null;
  }
  // implicit multiplication: num|) followed by num|fn|(
  const res: Tok[] = [];
  for (let k = 0; k < out.length; k++) {
    const a = res[res.length - 1], b = out[k];
    if (a && (a.t === 'num' || a.t === ')') && (b.t === 'num' || b.t === 'fn' || b.t === '(')) res.push({ t: 'op', v: '*' });
    res.push(b);
  }
  return res;
}

/** Recursive-descent parser: expr := term (± term)*, term := unary (*|/ unary)*, unary := -unary | pow, pow := atom (^ unary)? */
function parse(toks: Tok[]): number | null {
  let p = 0;
  const peek = () => toks[p];
  function expr(): number { let v = term(); while (peek()?.t === 'op' && '+-'.includes((peek() as any).v)) { const o = (toks[p++] as any).v; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
  function term(): number { let v = unary(); while (peek()?.t === 'op' && '*/'.includes((peek() as any).v)) { const o = (toks[p++] as any).v; const r = unary(); v = o === '*' ? v * r : v / r; } return v; }
  function unary(): number { const t = peek(); if (t?.t === 'op' && (t.v === '-' || t.v === '+')) { p++; const v = unary(); return t.v === '-' ? -v : v; } return pow(); }
  function pow(): number { const b = atom(); const t = peek(); if (t?.t === 'op' && t.v === '^') { p++; return Math.pow(b, unary()); } return b; }
  function atom(): number {
    const t = toks[p++];
    if (!t) throw new Error('end');
    if (t.t === 'num') return t.v;
    if (t.t === 'fn') { const a = atom(); return Math.sqrt(a); }
    if (t.t === '(') { const v = expr(); if (toks[p++]?.t !== ')') throw new Error(')'); return v; }
    throw new Error('unexpected');
  }
  try { const v = expr(); return p === toks.length && Number.isFinite(v) ? v : null; } catch { return null; }
}

export interface Parsed { value: number; decimals: number; exact: boolean }

/** Parse one answer. `decimals` is the number of decimal places typed; `exact` is true when no decimal point was used. */
export function parseAnswer(raw: string): Parsed | null {
  const s = normalise(raw);
  if (!s) return null;
  const toks = tokenize(s);
  if (!toks) return null;
  const v = parse(toks);
  if (v === null) return null;
  const nums = toks.filter((t): t is Extract<Tok, { t: 'num' }> => t.t === 'num');
  const decimals = Math.max(0, ...nums.map((t) => t.dec));
  return { value: v, decimals, exact: decimals === 0 };
}

/** Split a pupil's list of answers ("7; -2", "7 or -2", "7, -2"). Decimal commas stay intact. */
export function splitAnswers(raw: string): string[] {
  const s = raw.replace(/\b(or|and|arba|ir)\b/gi, ';');
  if (s.includes(';')) return s.split(';').map((x) => x.trim()).filter(Boolean);
  if (/,\s/.test(s)) return s.split(/,\s+/).map((x) => x.trim()).filter(Boolean);
  if (parseAnswer(s)) return [s];
  if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
  return [s];
}

/**
 * "3 ± √2" (also typed "3 +/- √2", or "3 +- √2" when a pair is expected) is two values: 3 + √2 and 3 − √2.
 * Only one ± per value is expanded; a value with more stays as it is and cannot be read.
 * `plusMinus` also reads "+-" as ±. Without it, "3+-2" is ordinary arithmetic, 3 + (−2).
 */
export function expandPm(s: string, plusMinus = true): string[] {
  const t = s.replace(plusMinus ? /\+\s*\/?\s*[-−–]/g : /\+\s*\/\s*[-−–]/g, '±');
  if ((t.match(/±/g) || []).length !== 1) return [t];
  return [t.replace('±', '+'), t.replace('±', '-')];
}

export type Verdict = 'ok' | 'round' | 'wrong' | 'unreadable' | 'count';

/**
 * Compare one parsed answer with the expected value.
 * An exactly equal value (√13, 3/2, 9) is always accepted.
 * With `decimals` set, a decimal answer must have exactly that many places and equal the
 * correctly rounded value. A correct value with more or fewer places gets 'round' (a hint
 * that does not use up a try); any other value is simply wrong, so there is no probing.
 */
export function judgeOne(p: Parsed, expected: number, decimals?: number): Verdict {
  const eps = 1e-9 * Math.max(1, Math.abs(expected));
  if (Math.abs(p.value - expected) <= eps) return 'ok';
  if (decimals === undefined || p.exact) return 'wrong';
  const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
  const same = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
  if (p.decimals === decimals) return same(p.value, round(expected, decimals)) ? 'ok' : 'wrong';
  if (p.decimals > decimals) return same(round(p.value, decimals), round(expected, decimals)) ? 'round' : 'wrong';
  return same(p.value, round(expected, p.decimals)) ? 'round' : 'wrong';
}

/** Judge a whole response against one or several expected values: order-free, or in order when `ordered` (a; b; c, or a pair). */
export function judge(raw: string, expected: string, decimals?: number, ordered = false): { verdict: Verdict; values: number[] } {
  const exp = expected.split(';').flatMap((e) => expandPm(e)).map((e) => parseAnswer(e)?.value).filter((v): v is number => v !== undefined);
  // "+-" means ± only when that gives the expected number of values; otherwise it is plus a negative number.
  const split = splitAnswers(raw);
  const asPairs = split.flatMap((p) => expandPm(p));
  const parts = asPairs.length === exp.length ? asPairs : split.flatMap((p) => expandPm(p, false));
  const parsed = parts.map(parseAnswer);
  if (parsed.some((p) => !p)) return { verdict: 'unreadable', values: [] };
  const ps = parsed as Parsed[];
  const values = ps.map((p) => p.value);
  if (ps.length !== exp.length) return { verdict: 'count', values };
  if (ordered) {
    const vs = ps.map((p, i) => judgeOne(p, exp[i], decimals));
    return { verdict: vs.includes('wrong') ? 'wrong' : vs.includes('round') ? 'round' : 'ok', values };
  }
  const left = [...exp];
  let worst: Verdict = 'ok';
  for (const p of ps) {
    let bestIdx = -1, best: Verdict = 'wrong';
    for (const [i, e] of left.entries()) {
      const v = judgeOne(p, e, decimals);
      if (v === 'ok' && best !== 'ok') { best = v; bestIdx = i; } else if (v === 'round' && best === 'wrong') { best = v; bestIdx = i; }
    }
    if (bestIdx < 0) return { verdict: 'wrong', values };
    left.splice(bestIdx, 1);
    if (best === 'round') worst = 'round';
  }
  return { verdict: worst, values };
}
