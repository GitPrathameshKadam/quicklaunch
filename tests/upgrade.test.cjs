const test = require('node:test');
const assert = require('node:assert/strict');
const { backend, ui, tick, copy } = require('./helpers.cjs');

// Synthetic 2.6 data shape, checked against the byte-verified submitted archive.
// This verifies application migration behavior, not a real Store upgrade.
const legacy = () => ({
  settings: { rows: 3, cols: 5, showTitles: false, fontSize: 14, gridGap: 8,
    theme: 'light', visualStyle: 'glassmorphism', accentColor: '#468cff', popupWidth: 440,
    iconShape: 'square', iconSize: 64, openInNewTab: false, showBadges: false,
    hotkeyAction: 'type', workspaces: [{ id: 'w_work', name: 'Work' }, { id: 'w_default', name: 'Main' }] },
  shortcuts: [{ title: 'Work site', url: 'https://work.test/', icon: '', workspaceId: 'w_work' },
    { title: 'Main site', url: 'https://main.test/', icon: '', workspaceId: 'w_default' }],
  snippets: [{ id: 'snip_1727680000000', title: 'Legacy prompt', text: '  {{clipboard}}\n```js\nconst x = 1;\n```\n ', tags: ['work', 'code'] }],
  usageCounts: { 'https://work.test/': 42, 'https://main.test/': 3 },
  activeWorkspaceId: 'w_work', sortMode: 'most-used', searchPosition: 'bottom',
  snippetDraft: { title: 'Unfinished', text: 'Keep this draft', tags: 'work' }
});

test('install/update menu initialization and first 2.7 page reads do not rewrite legacy saved data', async t => {
  const data = legacy(); const before = copy(data); const server = backend(data);
  server.events.installed({ reason: 'update', previousVersion: '2.6' }); await tick();
  const popup = await ui('popup', server); t.after(popup.dispose);
  const options = await ui('options', server); t.after(options.dispose);
  assert.deepEqual(server.state, before);
  assert.equal(options.find('rows').value, '3');
  assert.equal(options.w.document.documentElement.dataset.theme, 'light');
  assert.equal(popup.find('app-container').classList.contains('search-bottom'), true);
  assert.equal(popup.find('workspaceTabs').querySelector('.active').textContent, 'Work (1)');
  popup.find('modeSnippetsBtn').click();
  assert.equal(popup.w.document.querySelector('.snippet-title').textContent, 'Legacy prompt');
});

test('first 2.7 preference save and a cold worker restart preserve legacy content and view state', async t => {
  const before = legacy(); const server = backend(before);
  const options = await ui('options', server); t.after(options.dispose);
  options.find('rows').value = 6; options.find('rows').dispatchEvent(new options.w.Event('change')); await tick();
  for (const key of ['shortcuts', 'snippets', 'usageCounts', 'activeWorkspaceId', 'sortMode', 'searchPosition', 'snippetDraft']) {
    assert.deepEqual(server.state[key], before[key], key);
  }
  assert.deepEqual(server.state.settings.workspaces, before.settings.workspaces);
  assert.equal(server.state.settings.rows, 6);
  const restarted = backend(server.state);
  const reopened = await ui('popup', restarted); t.after(reopened.dispose);
  assert.equal(reopened.find('app-container').classList.contains('search-bottom'), true);
  const result = await restarted.client().runtime.sendMessage({ type: 'launch', url: 'https://work.test/' });
  assert.equal(result.ok, true);
  assert.equal(restarted.opened[0].id, 55);
  assert.equal(restarted.state.usageCounts['https://work.test/'], 43);
  assert.deepEqual(restarted.state.snippets, before.snippets);
});
