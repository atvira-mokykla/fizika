/** Small, explicit liquid-water models. Original code, MIT. */
export const WATER_C = 4200;
export const NOTEBOOK_KEY = 'physics.am.thermal-notebook.v1';
export type Lang = 'en' | 'lt';
export const nfmt = (n: number, lang: Lang, digits = 2) => new Intl.NumberFormat(lang === 'lt' ? 'lt-LT' : 'en-GB', { maximumFractionDigits: digits }).format(n);
export function heating(mass: number, power: number, seconds: number) {
  if (![mass, power, seconds].every(Number.isFinite) || mass <= 0 || power < 0 || seconds < 0) throw new RangeError('Invalid model input');
  const energy = power * seconds;
  return { temperature: 20 + energy / (mass * WATER_C), energy, slope: power / (mass * WATER_C) };
}
export function mixing(coolMass: number, warmMass: number, coolT: number, warmT: number, finalT?: number) {
  if (![coolMass, warmMass, coolT, warmT].every(Number.isFinite) || coolMass <= 0 || warmMass <= 0 || (finalT !== undefined && !Number.isFinite(finalT))) throw new RangeError('Invalid model input');
  const ideal = (coolMass * coolT + warmMass * warmT) / (coolMass + warmMass);
  const final = finalT ?? ideal;
  const coolChange = coolMass * WATER_C * (final - coolT);
  const warmChange = warmMass * WATER_C * (final - warmT);
  return { ideal, final, coolChange, warmChange, residual: -warmChange - coolChange, mass: coolMass + warmMass };
}
/** Fixed density 1000 kg/m³: height encodes amount, never temperature. */
export const waterHeight = (mass: number, capacity = .4, height = 130) => height * mass / capacity;

export const readingKeys = ['coolMass', 'warmMass', 'coolT', 'warmT', 'finalT', 'delay', 'later30', 'later60'] as const;
export const noteKeys = ['prediction', 'reason', 'observations', 'revision'] as const;
export const metaKeys = ['balanceResolution', 'probeResolution', 'accuracy', 'cup', 'readingOrder'] as const;
export type ReadingKey = typeof readingKeys[number];
export type Trial = Record<ReadingKey | typeof noteKeys[number], string>;
export type Provenance = 'entered-measurement' | 'supplied-synthetic' | 'simulation';
export interface Notebook { version: 1; source: Provenance; meta: Record<typeof metaKeys[number], string>; trials: Trial[] }
export function emptyNotebook(): Notebook {
  return { version: 1, source: 'entered-measurement', meta: Object.fromEntries(metaKeys.map(k => [k, ''])) as Notebook['meta'], trials: [0, 1].map(() => Object.fromEntries([...readingKeys, ...noteKeys].map(k => [k, ''])) as Trial) };
}
export function reading(raw: string): number | null {
  const text = raw.trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
/** Validate shape and preserve raw observations, including decimal commas and blanks. */
export function validateNotebook(value: unknown): Notebook | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Notebook;
  if (v.version !== 1 || !['entered-measurement', 'supplied-synthetic', 'simulation'].includes(v.source) || !v.meta || typeof v.meta !== 'object' || !Array.isArray(v.trials) || v.trials.length !== 2) return null;
  const result = emptyNotebook(); result.source = v.source;
  for (const key of metaKeys) {
    if (typeof v.meta[key] !== 'string' || v.meta[key].length > 1000) return null;
    result.meta[key] = v.meta[key];
  }
  for (let i = 0; i < 2; i++) {
    if (!v.trials[i] || typeof v.trials[i] !== 'object') return null;
    for (const key of [...readingKeys, ...noteKeys]) {
      const text = v.trials[i][key];
      if (typeof text !== 'string' || text.length > 2000) return null;
      result.trials[i][key] = text;
    }
  }
  return result;
}
export function analyseTrial(trial: Trial) {
  const values = ['coolMass', 'warmMass', 'coolT', 'warmT', 'finalT'].map(k => reading(trial[k as ReadingKey]));
  if (values.some(v => v === null)) return null;
  const [mc, mw, tc, tw, tf] = values as number[];
  // Broad analysis bounds reject impossible masses and non-water readings, without
  // rejecting an observed final reading merely because it disagrees with the model.
  if (mc <= 0 || mw <= 0 || mc > 2000 || mw > 2000 || [tc, tw, tf].some(t => t < 0 || t > 100)) return null;
  return mixing(mc / 1000, mw / 1000, tc, tw, tf);
}
export function syntheticNotebook(): Notebook {
  const book = emptyNotebook(); book.source = 'supplied-synthetic';
  for (const [i, final] of ['29.2', '29.4'].entries()) Object.assign(book.trials[i], { coolMass: '100', warmMass: '100', coolT: '20', warmT: '40', finalT: final, delay: i ? '11' : '12', later30: i ? '29.2' : '29.0', later60: i ? '29.0' : '28.8' });
  return book;
}
