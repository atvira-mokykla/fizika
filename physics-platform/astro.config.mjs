// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import fs from 'node:fs';
import yaml from 'js-yaml';
import { buildCalendar, weekSpan } from './src/lib/calendar.mjs';

/** Parse a YAML file. The year plans are validated by the content schema (src/content.config.ts), not here. */
/** @returns {any} */
const readYaml = (/** @type {string} */ f) => yaml.load(fs.readFileSync(f, 'utf8'));

/**
 * Sidebar from the year plans: grade → semester → unit → published lessons, in English and Lithuanian, with each unit's and
 * lesson's school week from the calendar (src/lib/calendar.mjs). src/route-data.ts then keeps only the page's own grade.
 * The order matters there: one group per grade 9–12, then the "All grades" link.
 */
function yearSidebar() {
  const dir = './src/content/years';
  /** @type {any[]} */
  const ys = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml')).map((f) => readYaml(`${dir}/${f}`))
    .sort((a, b) => a.grade - b.grade || (a.course === 'B' ? -1 : 1));
  /** @returns {any} */
  const overlay = (/** @type {any} */ y) => {
    const f = `./src/i18n/years-lt/${y.path.replace('/', '-')}.yaml`;
    return fs.existsSync(f) ? readYaml(f) ?? {} : {};
  };
  /** @type {Record<string, string>} */
  const LT_SEM = { autumn: 'I pusmetis', spring: 'II pusmetis' };
  const yearItems = (/** @type {any} */ y) => {
    const o = overlay(y);
    const cal = buildCalendar(y);
    /** A week badge, "wk 3–6" / "3–6 sav.", for a set of lessons. */
    const weeks = (/** @type {string[]} */ ids) => {
      const s = cal && weekSpan(cal.weekOf, ids);
      if (!s) return undefined;
      const r = s[0] === s[1] ? `${s[0]}` : `${s[0]}–${s[1]}`;
      return { text: { en: `wk ${r}`, lt: `${r} sav.` }, variant: /** @type {const} */ ('default'), class: 'am-wk' };
    };
    // The semester of the current (or coming) school week when the site is built; the first one without a calendar.
    const today = new Date().toISOString().slice(0, 10);
    const nowSemester = cal ? (cal.weeks.find((w) => w.to >= today) ?? cal.weeks[cal.weeks.length - 1]).semester : y.semesters[0].id;
    let n = 0;
    return [
      cal
        ? { label: 'Year plan and calendar', translations: { lt: 'Metų planas ir kalendorius' }, link: `/${y.path}/` }
        : { label: 'The whole year', translations: { lt: 'Visi metai' }, link: `/${y.path}/` },
      ...(cal ? [{ label: 'This week', translations: { lt: 'Šią savaitę' }, link: `/${y.path}/#this-week` }] : []),
      ...y.semesters.map((/** @type {any} */ s) => ({
        label: s.title,
        translations: { lt: LT_SEM[s.id] },
        collapsed: s.id !== nowSemester,
        items: s.units.map((/** @type {any} */ u) => {
          // The start-of-year refresh block (kind: ready) is Unit 0 and does not count.
          if (u.kind !== 'ready') n++;
          const lessons = u.lessons ?? [];
          const link = `/${y.path}/${u.id}/`;
          const k = u.kind === 'ready' ? 0 : n;
          const label = `${k} · ${u.title}`, lt = `${k} · ${o.units?.[u.id]?.title ?? u.lt}`;
          const badge = weeks(lessons.map((/** @type {any} */ l) => l.id));
          /** @type {any[]} */
          const published = lessons.map((/** @type {any} */ l, /** @type {number} */ i) => ({ l, i })).filter((/** @type {any} */ p) => p.l.slug);
          return published.length
            ? {
              label, translations: { lt }, badge, collapsed: true,
              items: [
                { label: 'Unit overview', translations: { lt: 'Temos apžvalga' }, link },
                ...published.map(({ l, i }) => ({
                  slug: l.slug, label: `${k}.${i + 1} ${l.title}`,
                  translations: { lt: `${k}.${i + 1} ${o.lessons?.[l.id] ?? l.title}` }, badge: weeks([l.id]),
                })),
              ],
            }
            : { label, translations: { lt }, badge, link };
        }),
      })),
    ];
  };
  /** @type {Record<number, string>} */
  const GYMN = { 9: 'I', 10: 'II', 11: 'III', 12: 'IV' };
  return [
    ...[9, 10, 11, 12].map((g) => {
      const list = ys.filter((y) => y.grade === g);
      const first = list[0];
      const label = `Grade ${g} · ${first.gymn} gimn.`, lt = `${g} (${GYMN[g]} gimn.) klasė`;
      if (list.length === 1 && !first.course) return { label, translations: { lt }, collapsed: true, items: yearItems(first) };
      return {
        label, translations: { lt }, collapsed: true,
        items: list.map((y) => ({ label: `Course ${y.course}`, translations: { lt: y.course === 'A' ? 'Išplėstinis kursas (A)' : 'Bendrasis kursas (B)' }, collapsed: true, items: yearItems(y) })),
      };
    }),
    { label: 'Change grade', translations: { lt: 'Keisti klasę' }, link: '/' },
  ];
}

// tools/publish.sh sets these for the public repository; the defaults match it.
const site = process.env.SITE_URL ?? 'https://atvira-mokykla.github.io';
const base = (process.env.BASE_PATH ?? '/fizika/').replace(/\/$/, '');

export default defineConfig({
  cacheDir: ".cache/astro",
  vite: { cacheDir: ".cache/vite" },
  site,
  base,
  redirects: {
    '/teachers.html': '/lt/teachers/',
    '/alignment.html': '/lt/9/thermal/',
    '/g9-thermal-01.html': '/lt/9/thermal/temperature-energy-heat/',
    '/g9-thermal-02.html': '/lt/9/thermal/specific-heat-and-graphs/',
    '/g9-thermal-03.html': '/lt/9/thermal/water-mixing-investigation/',
    '/g9-thermal-04.html': '/lt/9/thermal/heat-balance/',
  },
  trailingSlash: 'always',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: 'ignore' }]],
    }),
  },
  integrations: [
    starlight({
      title: 'Atvira mokykla',
      description: 'Free, open, interactive physics for Lithuanian gymnasium pupils (grades 9–12) and their teachers.',
      logo: { src: './src/assets/logo.svg' },
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        lt: { label: 'Lietuvių', lang: 'lt' },
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/atvira-mokykla/fizika' }],
      customCss: [
        '@fontsource-variable/atkinson-hyperlegible-next',
        '@fontsource-variable/bricolage-grotesque',
        '@fontsource/jetbrains-mono/500.css',
        'katex/dist/katex.min.css',
        './src/styles/theme.css',
        './src/styles/lesson.css',
        './src/styles/year.css',
      ],
      sidebar: yearSidebar(),
      routeMiddleware: './src/route-data.ts',
      components: {
        PageTitle: './src/components/overrides/PageTitle.astro',
      },
      tableOfContents: false,
      pagination: false,
      lastUpdated: false,
    }),
  ],
});
