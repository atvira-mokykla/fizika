/** Build-time helpers for the learning outcomes and the learning tree (src/content/outcomes/grade<N>.yaml). */
import { getCollection } from 'astro:content';
import type { Lang } from '../i18n/ui';
import { sequence, type Step, type Year } from './plan';

export async function tree(grade: number, course?: 'A' | 'B') {
  const id = grade === 11 && course ? `grade${grade}-${course.toLowerCase()}` : `grade${grade}`;
  return (await getCollection('outcomes')).find((e) => e.id === id)?.data ?? null;
}
type Tree = NonNullable<Awaited<ReturnType<typeof tree>>>;

/** An outcome or root in the page language: "I can …" / "Moku …" for outcomes, the skill statement for roots. */
export function outcomeText(t: Tree, id: string, lang: Lang): string | null {
  const o = t.outcomes.find((x) => x.id === id) ?? t.roots.find((x) => x.id === id);
  return o ? o[lang] : null;
}

export interface StartCard {
  outcomes: { id: string; text: string }[];
  /** Grade 5–8 skills the lesson's outcomes need directly, with where to refresh them. */
  roots: { id: string; topic: string; refreshStep: Step | null }[];
  /** Earlier lessons whose outcomes this lesson needs. */
  earlier: Step[];
}

/** What the start card of a lesson shows: its outcomes, and what it needs from before. */
export async function startCard(y: Year, planId: string, lang: Lang): Promise<StartCard | null> {
  const t = await tree(y.grade, y.course);
  const l = t?.lessons.find((x) => x.id === planId);
  if (!t || !l?.outcomes?.length) return null;
  const seq = sequence(y);
  const own = new Set(l.outcomes);
  const needs = [...new Set(l.outcomes.flatMap((id) => t.outcomes.find((o) => o.id === id)?.needs ?? []))].filter((n) => !own.has(n));
  const teacher = (id: string) => t.lessons.find((x) => x.outcomes?.includes(id))?.id;
  // A root is refreshed by the first Unit 0 review lesson that samples it.
  const refresher = (id: string) => t.lessons.find((x) => x.kind === 'review' && (x.samples?.includes(id) || x.revisits?.includes(id)))?.id;
  const step = (id?: string) => (id ? seq.find((s) => s.id === id) ?? null : null);
  const roots = t.roots.filter((r) => needs.includes(r.id))
    .map((r) => ({ id: r.id, topic: lang === 'lt' ? r.refreshLt : r.refresh, refreshStep: step(refresher(r.id)) }));
  const earlierIds = [...new Set(needs.filter((n) => !t.roots.some((r) => r.id === n)).map(teacher).filter(Boolean))] as string[];
  const earlier = seq.filter((s) => earlierIds.includes(s.id));
  return {
    outcomes: l.outcomes.map((id) => ({ id, text: outcomeText(t, id, lang) ?? id })),
    roots,
    earlier,
  };
}
