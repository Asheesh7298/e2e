/** A role query finds what its matchers read, where Playwright's `getByRole` and the Chrome-matching reader disagree. */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFixtureApp, type FixtureApp } from '../helpers/fixture-app.ts';
import { createProject, resultByTitle, runExisting, type FixtureProject } from '../helpers/run-project.ts';

const SUITE = `import { test, expect } from 'e2e';

const PAGE = [
  '<div role="Article" aria-label="Post"><header aria-label="Post header">Post</header><footer aria-label="Post footer">Post</footer></div>',
  '<header aria-label="Site header">Site</header>',
  '<nav role="none"><header aria-label="Nav header">Nav</header></nav>',
  '<nav role="none" aria-label="N"><header aria-label="Conflict header">Kept</header></nav>',
  '<aside role="none" tabindex="0"><footer aria-label="Conflict footer">Kept</footer></aside>',
  '<div role="region"><header aria-label="Exact region header">Region</header></div>',
  '<div role="region group"><header aria-label="Region group header">Group</header></div>',
  '<div role="region "><header aria-label="Region spaced header">Spaced</header></div>',
  '<div role="doc-chapter article"><footer aria-label="Chapter footer">Chapter</footer></div>',
  '<div role="doc-foo article"><footer aria-label="Unknown footer">Unknown</footer></div>',
  '<h3 aria-disabled="TrUe">Archived</h3>',
  '<h3>Open</h3>',
].join('');

test('role queries agree with the matchers', async ({ app, browser, screen }) => {
  await app.open('/');
  await browser.evaluate((html) => { document.body.innerHTML = html; }, PAGE);
  await expect(screen.getByRole('banner', { name: 'Post header' })).toHaveCount(0);
  await expect(screen.getByRole('contentinfo', { name: 'Post footer' })).toHaveCount(0);
  await expect(screen.getByRole('banner', { name: 'Site header' })).toHaveRole('banner');
  await expect(screen.getByRole('banner', { name: 'Nav header' })).toHaveRole('banner');
  await expect(screen.getByRole('banner', { name: 'Conflict header' })).toHaveCount(0);
  await expect(screen.getByRole('contentinfo', { name: 'Conflict footer' })).toHaveCount(0);
  await expect(screen.getByRole('banner', { name: 'Exact region header' })).toHaveCount(0);
  await expect(screen.getByRole('banner', { name: 'Region group header' })).toHaveRole('banner');
  await expect(screen.getByRole('banner', { name: 'Region spaced header' })).toHaveRole('banner');
  await expect(screen.getByRole('contentinfo', { name: 'Chapter footer' })).toHaveRole('contentinfo');
  await expect(screen.getByRole('contentinfo', { name: 'Unknown footer' })).toHaveCount(0);
  await expect(screen.getByRole('heading', { name: 'Archived', disabled: false })).toHaveCount(0);
  await expect(screen.getByRole('heading', { name: 'Archived', disabled: true })).toBeDisabled();
  await expect(screen.getByRole('heading', { name: 'Open', disabled: false })).toBeEnabled();
  await expect(screen.getByRole('heading', { name: 'Open', disabled: true })).toHaveCount(0);
});

test('takes the disabled state from Playwright for a node the reader cannot read', async ({ app, browser, screen }) => {
  await app.open('/');
  await browser.evaluate(() => {
    customElements.define('plan-group', class extends HTMLElement { get labels() { return ['Go']; } });
    document.body.innerHTML = '<plan-group role="button" aria-label="Go" aria-disabled="true"><span>GoText</span></plan-group>';
  });
  await expect(screen.getByRole('button', { name: 'Go', disabled: false }).getByText('GoText')).toHaveCount(0);
  await expect(screen.getByRole('button', { name: 'Go', disabled: true }).getByText('GoText')).toHaveCount(1);
  expect(await screen.getByRole('button', { name: 'Go', disabled: false }).count()).toBe(0);
});
`;

describe('role queries and the reader', () => {
  let app: FixtureApp;
  let project: FixtureProject;

  beforeAll(async () => {
    app = await startFixtureApp();
    project = createProject({ 'tests/roles.e2e.ts': SUITE });
  }, 60_000);

  afterAll(async () => {
    project?.cleanup();
    await app?.close();
  });

  it('finds a landmark and a disabled state as the matchers read them', async () => {
    const outcome = await runExisting(project, { appUrl: app.url, config: { tests: 'tests/**/*.e2e.ts', reporters: ['json'] as const } });
    const result = resultByTitle(outcome, 'role queries agree with the matchers');
    expect(result.attempts.at(-1)?.error, JSON.stringify(result.attempts.at(-1)?.error)).toBeUndefined();
    expect(result.status).toBe('passed');
    const unreadable = resultByTitle(outcome, 'takes the disabled state from Playwright for a node the reader cannot read');
    expect(unreadable.attempts.at(-1)?.error, JSON.stringify(unreadable.attempts.at(-1)?.error)).toBeUndefined();
    expect(unreadable.status).toBe('passed');
  }, 120_000);
});
