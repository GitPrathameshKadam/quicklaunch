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
