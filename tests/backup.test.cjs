const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { URL, globalThis: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'backup.js'), 'utf8'), context);
const backup = context.globalThis.QuickLaunchBackup;

test('fresh install always has a renderable Main workspace', () => {
  const result = backup.settings(undefined, { rows: 4, workspaces: [] });
  assert.equal(result.workspaces[0].id, 'w_default');
});

test('import preserves workspace order and repairs a missing Main workspace', () => {
  const ordered = backup.workspaces([
    { id: 'w_work', name: 'Work' }, { id: 'w_default', name: 'Main' }
  ]);
  assert.deepEqual(Array.from(ordered, w => w.id), ['w_work', 'w_default']);
  assert.equal(backup.workspaces([{ id: 'w_work', name: 'Work' }])[0].id, 'w_default');
});

test('imports reject unusable links and unsafe icon data', () => {
  const shortcuts = backup.shortcuts([
    { url: 'mailto:hello@example.com' },
    { url: 'https://example.com', title: 'Site', icon: 'data:image/svg+xml;base64,PHN2Zz4=' }
  ], new Set(['w_default']));
  assert.equal(shortcuts.length, 1);
  assert.equal(shortcuts[0].icon, '');
  assert.equal(shortcuts[0].url, 'https://example.com');
});

test('a snippets-only backup can be validated', () => {
  const snippets = backup.snippets([{ id: 'note', title: 'Note', text: 'hello', tags: ['text', 3] }]);
  assert.equal(snippets.length, 1);
  assert.equal(snippets[0].tags[0], 'text');
  assert.equal(snippets[0].tags.length, 1);
});

test('legacy appearance overrides are ignored while color mode is preserved', () => {
  const defaults = { theme: 'system', workspaces: [] };
  const result = backup.settings({ theme: 'light', visualStyle: 'claymorphism', accentColor: '#ff0000' }, defaults);
  assert.equal(result.theme, 'light');
  assert.equal(Object.hasOwn(result, 'visualStyle'), false);
  assert.equal(Object.hasOwn(result, 'accentColor'), false);
  assert.equal(backup.settings({ theme: 'invalid' }, defaults).theme, 'system');
});

test('a fresh or externally reset installation exports a complete restorable backup', () => {
  const data = backup.exportData({}, { rows: 4, theme: 'dark', workspaces: [] }, '2.7');
  assert.equal(data.shortcuts.length, 0);
  assert.equal(data.snippets.length, 0);
  assert.equal(data.settings.workspaces[0].id, 'w_default');
  const current = { settings: backup.settings(undefined, {}), shortcuts: [], snippets: [], usageCounts: {}, sortMode: 'manual' };
  const restored = backup.importData(data, current, 'replace', () => 'new');
  assert.equal(restored.shortcuts.length, 0);
  assert.equal(restored.settings.theme, 'dark');
});

test('bulk snippet imports remain ordered and repeated merges are idempotent', () => {
  const data = { snippets: Array.from({ length: 4000 }, (_, i) => ({ id: String(i), title: 'Note ' + i, text: 'Body ' + i, tags: ['tag'] })) };
  const current = { settings: backup.settings(undefined, {}), shortcuts: [], snippets: [], usageCounts: {}, sortMode: 'manual' };
  const first = backup.importData(data, current, 'merge', () => 'new');
  const second = backup.importData(data, first, 'merge', () => 'new');
  assert.equal(first.snippets.length, 4000);
  assert.equal(first.snippets[3999].text, 'Body 3999');
  assert.equal(second.addedSnippets, 0);
  assert.equal(second.snippets.length, 4000);
});

test('an ID generator collision cannot produce a backup that loses a snippet on reopening', () => {
  const current = { settings: backup.settings(undefined, {}), shortcuts: [], snippets: [{ id: 'same', title: 'Existing', text: 'One', tags: [] }], usageCounts: {}, sortMode: 'manual' };
  assert.throws(() => backup.importData({ snippets: [{ id: 'same', title: 'Different', text: 'Two' }] }, current, 'merge', () => 'same'), /unique snippet ID/);
  assert.equal(current.snippets.length, 1);
});
