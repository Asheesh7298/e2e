/**
 * URL globs for `browser.waitForURL`, in Playwright's grammar. Playwright's
 * `waitForURL` reads a string as a glob and its `toHaveURL` never does, so
 * the glob lives here, beside the route grammar, and `urlMatches` in core
 * stays the exact comparison `expect(browser).toHaveURL` makes.
 */

import { TestError, urlMatches } from '@e2e-dev/core/engine';
import { escapeRegexpChar } from './route-pattern.ts';

/** Schemes whose URLs Playwright never resolves against a base, so a glob that starts with one stays as written. */
const UNRESOLVED_GLOB_SCHEMES = ['about:', 'data:', 'chrome:', 'edge:', 'file:'];

/** Whether `waitForURL` reads a string as a glob: it holds a `*` or a `{`, escaped or not. */
export function isUrlGlob(value: string): boolean {
  return value.includes('*') || value.includes('{');
}

/**
 * What `browser.waitForURL` waits for, compiled once: a string with a `*` or
 * a `{` as a URL glob, and anything else as `expect(browser).toHaveURL`
 * compares it. A glob that nests a `{` or leaves one unmatched is
 * `INVALID_ARGUMENT` before the first read.
 */
export function urlWaitMatcher(expected: string | RegExp, baseHref: string): (current: string) => boolean {
  if (typeof expected !== 'string' || !isUrlGlob(expected)) return (current) => urlMatches(current, expected, baseHref);
  const pattern = new RegExp(urlGlobSource(resolveUrlGlob(expected, baseHref)));
  return (current) => pattern.test(serialized(current));
}

/** The current URL as `urlMatches` compares it: serialized by the URL parser, else as given. */
function serialized(url: string): string {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}

/**
 * Resolves a relative URL glob against the base URL, as Playwright's
 * `resolveGlobBase` does: each path segment that holds a glob character is
 * swapped for a placeholder the URL parser leaves alone, the rest resolves,
 * and the segments go back. One that landed in the origin goes back
 * lowercased (the scheme and host match in any case); the rest go back
 * percent-encoded the way the parser encodes what it reads, so `/検索?q=*`
 * matches the URL a browser reports. A glob that starts with `*` matches any
 * origin and stays as written; so does one that starts with an unresolved
 * scheme, or does not parse against the base.
 */
function resolveUrlGlob(glob: string, baseHref: string): string {
  if (glob.startsWith('*') || UNRESOLVED_GLOB_SCHEMES.some((scheme) => glob.startsWith(scheme))) return glob;
  // A placeholder prefix neither the glob nor the base holds, so restoring a segment never lands on the user's own text.
  let tag = '$_';
  while (glob.includes(tag) || baseHref.includes(tag)) tag += '_';
  const originals = new Map<string, string>();
  const hold = (original: string, placeholder: string): string => {
    if (original === '') return '';
    originals.set(placeholder, original);
    return placeholder;
  };
  const relative = glob.split('/').map((segment, index) => {
    if (segment === '.' || segment === '..' || segment === '') return segment;
    if (index === 0 && segment.endsWith(':')) return isUrlGlob(segment) ? hold(segment, 'http:') : segment;
    if (!/[*?{}\\]/.test(segment)) return segment;
    // The query is held on its own, so a later `..` stays in the query instead of eating this segment.
    const query = segment.indexOf('?');
    if (query === -1) return hold(segment, `${tag}${String(index)}_$`);
    return hold(segment.slice(0, query), `${tag}${String(index)}_$`) + hold(segment.slice(query), `?${tag}${String(index)}_$`);
  }).join('/');
  let url: URL;
  try {
    url = new URL(relative, baseHref);
  } catch {
    return glob;
  }
  let resolved = url.href;
  for (const [placeholder, original] of originals) {
    const segment = url.origin.includes(placeholder)
      ? original.toLowerCase()
      : original.replace(/[^\x21-\x7e]/gu, (ch) => encodeURIComponent(ch));
    resolved = resolved.replace(placeholder, () => segment);
  }
  return resolved;
}

/**
 * Compiles a URL glob to a regexp source matching the whole URL, in
 * Playwright's grammar: `*` matches within one path segment, `**` across `/`
 * (a `**` segment may also match none), `{a,b}` matches either, and `\`
 * escapes the next character. `?` and everything else is literal, so a query
 * string reads as written. A nested or unbalanced `{` is `INVALID_ARGUMENT`.
 */
function urlGlobSource(glob: string): string {
  const invalid = (problem: string): TestError =>
    new TestError('INVALID_ARGUMENT', `URL glob ${JSON.stringify(glob)} ${problem}`);
  let source = '^';
  let inGroup = false;
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i]!;
    if (ch === '\\' && i + 1 < glob.length) {
      i += 1;
      source += escapeRegexpChar(glob[i]!);
      continue;
    }
    if (ch === '*') {
      const before = glob[i - 1];
      let stars = 1;
      while (glob[i + 1] === '*') {
        stars += 1;
        i += 1;
      }
      if (stars === 1) {
        source += '([^/]*)';
      } else if (glob[i + 1] === '/') {
        source += before === '/' ? '((.+/)|)' : '(.*/)';
        i += 1;
      } else {
        source += '(.*)';
      }
      continue;
    }
    if (ch === '{') {
      if (inGroup) throw invalid("nests a '{'");
      inGroup = true;
      source += '(';
    } else if (ch === '}') {
      if (!inGroup) throw invalid("has an unmatched '}'");
      inGroup = false;
      source += ')';
    } else if (ch === ',' && inGroup) {
      source += '|';
    } else {
      source += escapeRegexpChar(ch);
    }
  }
  if (inGroup) throw invalid("has an unmatched '{'");
  return `${source}$`;
}
