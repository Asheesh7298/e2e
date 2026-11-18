import { describe, expect, it } from 'vitest';
import { isUrlGlob, urlWaitMatcher } from '../../src/url-glob.ts';

const BASE = 'http://localhost:3000/';

/** Whether `browser.waitForURL(expected)` is done at `current`. */
function waits(expected: string | RegExp, current: string): boolean {
  return urlWaitMatcher(expected, BASE)(current);
}

describe('waitForURL globs', () => {
  it('reads a string with a * or a { as a glob, resolved against the base URL', () => {
    expect(isUrlGlob('**/checkout')).toBe(true);
    expect(isUrlGlob('/a?q=1')).toBe(false);
    expect(waits('**/checkout', 'http://localhost:3000/checkout')).toBe(true);
    expect(waits('**/checkout', 'https://shop.test/checkout')).toBe(true);
    expect(waits('/orders/*', 'http://localhost:3000/orders/42')).toBe(true);
    expect(waits('/orders/*', 'http://other.test/orders/42')).toBe(false);
    expect(waits('a/*', 'http://localhost:3000/a/b')).toBe(true);
    expect(waits('https://*.example.com/**', 'https://shop.example.com/a')).toBe(true);
    expect(waits('https://*.example.com/**', 'https://example.com/a')).toBe(false);
  });

  it('keeps * in one segment, lets ** cross /, and reads {a,b} as either', () => {
    expect(waits('/orders/*', 'http://localhost:3000/orders/42/items')).toBe(false);
    expect(waits('/orders/**', 'http://localhost:3000/orders/42/items')).toBe(true);
    expect(waits('/a/**/b', 'http://localhost:3000/a/b')).toBe(true);
    expect(waits('/a/**/b', 'http://localhost:3000/a/x/y/b')).toBe(true);
    expect(waits('/{cart,checkout}', 'http://localhost:3000/cart')).toBe(true);
    expect(waits('/{cart,checkout}', 'http://localhost:3000/home')).toBe(false);
  });

  it('reads ? as the literal start of a query, which a later .. stays inside', () => {
    expect(waits('**/search?q=*', 'http://localhost:3000/search?q=shoes')).toBe(true);
    expect(waits('**/search?q=*', 'http://localhost:3000/searchXq=shoes')).toBe(false);
    expect(waits('**/search?q=?', 'http://localhost:3000/search?q=a')).toBe(false);
    expect(waits('/x*?q=1/../y', 'http://localhost:3000/xyz?q=1/../y')).toBe(true);
    expect(waits('/x*?q=1/../y', 'http://localhost:3000/y')).toBe(false);
  });

  it('globs the scheme, matching it and the host in any case, and keeps the path in its case', () => {
    expect(waits('http{,s}://localhost:3000/a', 'http://localhost:3000/a')).toBe(true);
    expect(waits('http{,s}://localhost:3000/a', 'https://localhost:3000/a')).toBe(true);
    expect(waits('http{,s}://localhost:3000/a', 'ftp://localhost:3000/a')).toBe(false);
    expect(waits('https://*.EXAMPLE.COM/**', 'https://shop.example.com/a')).toBe(true);
    expect(waits('https://*.example.com/A*', 'https://shop.example.com/abc')).toBe(false);
  });

  it('leaves a glob that starts with about: unresolved, and reads an escaped * as itself', () => {
    expect(waits('about:*', 'about:blank')).toBe(true);
    expect(waits('/a\\*b', 'http://localhost:3000/a*b')).toBe(true);
    expect(waits('/a\\*b', 'http://localhost:3000/axb')).toBe(false);
  });

  it('matches text and spaces in a glob segment the way the browser encodes them', () => {
    expect(waits('/検索/*', 'http://localhost:3000/%E6%A4%9C%E7%B4%A2/1')).toBe(true);
    expect(waits('/検索?q=*', 'http://localhost:3000/%E6%A4%9C%E7%B4%A2?q=1')).toBe(true);
    expect(waits('/search?q=café*', 'http://localhost:3000/search?q=caf%C3%A9-1')).toBe(true);
    expect(waits('/files/my file*', 'http://localhost:3000/files/my%20file.pdf')).toBe(true);
    expect(waits('/files/my%20file*', 'http://localhost:3000/files/my%20file.pdf')).toBe(true);
  });

  it('compares a string with no * or { exactly, as toHaveURL does', () => {
    expect(waits('/search?q=shoes', 'http://localhost:3000/search?q=shoes')).toBe(true);
    expect(waits('/search?q=s', 'http://localhost:3000/search?q=shoes')).toBe(false);
    expect(waits(/\/orders\/\d+$/, 'http://localhost:3000/orders/7')).toBe(true);
  });

  it('refuses a nested or unbalanced { before the first read', () => {
    for (const glob of ['**/{a,{b}}', '**/{a', '**/a}']) {
      expect(() => urlWaitMatcher(glob, BASE), glob).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }));
    }
  });
});
