import katex from 'katex';

/** Render `$…$` segments of a prop string to KaTeX HTML at build time. */
export function inlineTex(s: string | undefined): string {
  if (!s) return '';
  return s.replace(/\$([^$]+)\$/g, (_, t: string) =>
    katex.renderToString(t, { throwOnError: false, strict: 'ignore' }),
  );
}
