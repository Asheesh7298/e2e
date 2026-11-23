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
  readonly testIdAttribute: string;
  readonly secureFieldSelector: string;
}

/** The selector step for one role query; the body is JSON, kept whole by Playwright's selector parser. */
export function readsAsSelector(body: ReadsAsSelectorBody): string {
  return `${READS_AS_SELECTOR_ENGINE}=${JSON.stringify(body)}`;
}

/**
 * The engine behind `e2e-reads-as=<json>`: each query root is a match of the
 * query before it, kept when the reader agrees, so the query's matches keep
 * their order. A node the full read throws on keeps Playwright's role and
 * answers `disabled` from that state's read alone; one that throws there too
 * stays a match.
 */
export const READS_AS_SELECTOR_ENGINE_SOURCE = `() => {
  const read = (${readSemanticsFunction.toString()});
  const queryAll = (root, selector) => {
    if (root.nodeType !== 1) return [];
    const body = JSON.parse(selector);
    const reader = { testIdAttribute: body.testIdAttribute, secureFieldSelector: body.secureFieldSelector };
    let node;
    try {
      node = read(root, { ...reader, mode: { kind: 'node' } });
    } catch {
      if (body.disabled === undefined) return [root];
      try {
        return read(root, { ...reader, mode: { kind: 'disabled' } }) === body.disabled ? [root] : [];
      } catch {
        return [root];
      }
    }
    if (body.role !== undefined && node.role !== body.role) return [];
    if (body.disabled !== undefined && node.states.disabled !== body.disabled) return [];
    return [root];
  };
  return { queryAll, query: (root, selector) => queryAll(root, selector)[0] ?? null };
}`;
