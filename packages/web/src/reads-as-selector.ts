/**
 * The selector engine that keeps a role query's matches to the ones the
 * reader agrees with. Playwright's `getByRole` and the reader, which follows
 * Chrome, can disagree on a landmark's scope and on `aria-disabled` casing;
 * appended to the query (`<query> >> e2e-reads-as=<json>`), it makes a locator
 * find what its matchers then read.
 */

import { readSemanticsFunction } from './in-page/read-semantics.ts';

/** Playwright selector engine name; `e2e-reads-as=<json>` keeps the matches that read as the body says. */
export const READS_AS_SELECTOR_ENGINE = 'e2e-reads-as';

/** What a match must read as, and the reader's options. */
interface ReadsAsSelectorBody {
  readonly role?: string;
  readonly disabled?: boolean;
  /** Keeps only the matches the reader cannot read: the branch that takes Playwright's `disabled` state for them. */
  readonly unreadable?: boolean;
  readonly testIdAttribute: string;
  readonly secureFieldSelector: string;
}

/** The selector step for one role query; the body is JSON, kept whole by Playwright's selector parser. */
export function readsAsSelector(body: ReadsAsSelectorBody): string {
  return `${READS_AS_SELECTOR_ENGINE}=${JSON.stringify(body)}`;
}

/**
 * The engine behind `e2e-reads-as=<json>`: each query root is a match of the
 * query before it, kept when the reader agrees. A node the reader cannot read
 * keeps Playwright's answer: its role here, and its `disabled` state through
 * the `unreadable` branch, so a page that breaks the reader loses no match and
 * gains none.
 */
export const READS_AS_SELECTOR_ENGINE_SOURCE = `() => {
  const read = (${readSemanticsFunction.toString()});
  const queryAll = (root, selector) => {
    if (root.nodeType !== 1) return [];
    const body = JSON.parse(selector);
    let node;
    try {
      node = read(root, { testIdAttribute: body.testIdAttribute, secureFieldSelector: body.secureFieldSelector, mode: { kind: 'node' } });
    } catch {
      return body.unreadable === true || body.disabled === undefined ? [root] : [];
    }
    if (body.unreadable === true) return [];
    if (body.role !== undefined && node.role !== body.role) return [];
    if (body.disabled !== undefined && node.states.disabled !== body.disabled) return [];
    return [root];
  };
  return { queryAll, query: (root, selector) => queryAll(root, selector)[0] ?? null };
}`;
