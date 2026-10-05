import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

/**
 * Lesson metadata. Every lesson must say where it sits in the Lithuanian
 * programme, so a curriculum change means re-tagging, not rewriting.
 */
const achievement = z.string().regex(/^[A-F][1-4]$/);

export const lessonMeta = z.object({
  grade: z.union([z.literal(9), z.literal(10), z.literal(11), z.literal(12)]),
  unit: z.string(),
  /** Course: grades 9–10 are a common core; 11–12 split into B (general) and A (extended). */
  course: z.array(z.enum(['core', 'B', 'A'])).min(1),
  /** Programme item IDs from the general programme, e.g. "32.1.1.1". */
  curriculum: z.array(z.string()).min(1),
  /** Version of the programme text the tags refer to. */
  curriculumVersion: z.string().default('Fizikos bendroji programa · 2026-10-04'),
  contentArea: z.enum(['thermal', 'mechanics', 'waves', 'electricity', 'optics', 'modern', 'methods']),
  achievements: z.array(achievement).min(1),
  /** Highest achievement level the lesson reaches: 1 threshold … 4 advanced. */
  levels: z.array(z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])).min(1),
  exam: z.array(z.enum(['PUPP', 'VBE-I', 'VBE-II'])).default([]),
  minutes: z.number().int().positive(),
  /** Short phrase used on cards and the print header. */
  kicker: z.string().optional(),
  /** The lesson objective ("pamokos uždavinys"), one pupil-facing sentence: the first line of the start card. */
  goal: z.string().optional(),
});

/**
 * Year plans: the school year as a pupil meets it. Year → semester → unit → lesson (≈ one class period).
 * One file per grade (and per course in grades 11–12) in src/content/years/.
 */
export const planLesson = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  /** Docs id of the published lesson page, e.g. "9/quadratics/quadratic-formula". Absent while it is being written. */
  slug: z.string().optional(),
  kind: z.enum(['lesson', 'review', 'practice', 'check', 'test']).default('lesson'),
  /** Class periods (45 min) the lesson takes. */
  periods: z.number().int().positive().default(1),
  /** Learning-outcome ids the lesson teaches (src/content/outcomes/grade<N>.yaml). */
  outcomes: z.array(z.string()).default([]),
});
export const planUnit = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** "ready": the start-of-year refresh block, shown as Unit 0 and not counted in the unit numbers. */
  kind: z.enum(['unit', 'ready']).default('unit'),
  title: z.string(),
  /** The topic's name in the Lithuanian programme, as pupils hear it at school. */
  lt: z.string(),
  curriculum: z.array(z.string()).default([]),
  /** Lessons for this topic in NŠA's model plan (the 70 % core). */
  hours: z.number().int().positive(),
  /** When a class usually meets this unit. */
  months: z.string(),
  goals: z.array(z.string()).min(1),
  needs: z.array(z.string()).default([]),
  lessons: z.array(planLesson).default([]),
});
const yearPlan = z.strictObject({
  path: z.string(),
  grade: z.number().int().min(9).max(12),
  gymn: z.enum(['I', 'II', 'III', 'IV']),
  course: z.enum(['B', 'A']).optional(),
  title: z.string(),
  subtitle: z.string(),
  schoolYear: z.string(),
  lessonsPerWeek: z.number().int().positive(),
  weeks: z.number().int().positive(),
  exam: z.string().nullable(),
  /** School weeks with dates (src/lib/calendar.mjs, which also checks them against the lessons). */
  calendar: z.strictObject({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    breaks: z.array(z.strictObject({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), title: z.string(), lt: z.string(),
    })).default([]),
    preliminary: z.array(z.enum(['autumn', 'spring'])).default([]),
    weeks: z.array(z.array(z.string()).min(1)).min(1),
  }).optional(),
  semesters: z.array(z.strictObject({
    id: z.enum(['autumn', 'spring']),
    title: z.string(),
    months: z.string(),
    units: z.array(planUnit).min(1),
    tests: z.array(planLesson).default([]),
  })).length(2),
});

/** Learning outcomes and the learning tree of a grade (checked in depth by scripts/check-outcomes.mjs). */
const outcome = z.object({
  id: z.string(), item: z.string(), quote: z.string(), achievement: z.array(achievement).min(1),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]), needs: z.array(z.string()),
  en: z.string().startsWith('I can '), lt: z.string().startsWith('Moku '),
});
const outcomeTree = z.object({
  programme: z.string(),
  semester: z.string(),
  roots: z.array(z.object({ id: z.string(), item: z.string(), quote: z.union([z.string(), z.array(z.string())]), en: z.string(), lt: z.string(), refresh: z.string(), refreshLt: z.string() })),
  outcomes: z.array(outcome),
  lessons: z.array(z.object({
    id: z.string(), kind: z.string().optional(),
    outcomes: z.array(z.string()).optional(), needs: z.array(z.string()).optional(), revisits: z.array(z.string()).optional(), samples: z.array(z.string()).optional(),
    optionalRoutes: z.array(z.object({ id: z.string(), needs: z.array(z.string()), revisits: z.array(z.string()) })).optional(),
  })),
});

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({ extend: z.object({ lesson: lessonMeta.optional() }) }),
  }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
  years: defineCollection({ loader: glob({ pattern: '*.yaml', base: './src/content/years' }), schema: yearPlan }),
  outcomes: defineCollection({ loader: glob({ pattern: '*.yaml', base: './src/content/outcomes' }), schema: outcomeTree }),
};
