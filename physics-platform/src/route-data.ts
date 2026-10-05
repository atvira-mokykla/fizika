/**
 * Starlight route middleware: the menu of a grade's page shows that grade only (and in grades 11–12, that course only).
 * A pupil works in one year, so on /9/… (and /lt/9/…) the menu is grade 9, open, with a "Change grade" link below it.
 * Elsewhere (the home page) it shows every grade, closed.
 * yearSidebar() in astro.config.mjs builds the menu in a fixed order: grades 9, 10, 11, 12, then the "Change grade" link;
 * a grade with two courses has the groups Course B, Course A.
 */
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  const groups = route.sidebar;
  const change = groups[groups.length - 1];
  if (groups.length !== 5 || change?.type !== 'link') return; // not the menu yearSidebar() builds: leave it alone
  const m = /^(?:lt\/)?(9|10|11|12)\/(?:([ab])\/)?/.exec(context.url.pathname.slice(BASE.length));
  const grade = m ? groups[Number(m[1]) - 9] : undefined;
  if (grade?.type !== 'group') { route.sidebar = groups.slice(0, -1); return; }
  const courses = grade.entries.filter((e) => e.type === 'group');
  const course = m![2] && courses.length === 2 ? courses[m![2] === 'b' ? 0 : 1] : undefined;
  route.sidebar = course?.type === 'group'
    ? [{ ...course, label: `${grade.label} · ${course.label}`, collapsed: false }, change]
    : [{ ...grade, collapsed: false }, change];
});
