const test = require('node:test');
const assert = require('node:assert/strict');
const { backend, ui, tick, source, copy } = require('./helpers.cjs');
const vm = require('node:vm');
const initial = () => ({ settings: { workspaces: [{ id: 'w_default', name: 'Main' }, { id: 'work', name: 'Work' }] },
  shortcuts: [{ title: 'Site', url: 'https://site.test', workspaceId: 'w_default' }],
  snippets: [{ id: 'a', title: 'Template', text: 'Hello {{clipboard}}', tags: [] }] });

function backup() { const c = vm.createContext({ URL }); vm.runInContext(source('backup.js'), c); return c.QuickLaunchBackup; }
function current() { const b = backup(), data = initial(); return { ...data, settings: b.settings(data.settings, {}), usageCounts: {}, sortMode: 'manual' }; }

test('stale options cannot overwrite a newer context-menu shortcut', async () => {
  const server = backend(initial()), page = await ui('options', server);
  server.events.menu({ menuItemId: 'add-to-quicklaunch', linkUrl: 'https://new.test' }, {});
  await tick();
  page.find('addShortcutBtn').click();
  page.input('shortcutTitle', 'Older tab'); page.input('shortcutUrl', 'https://old.test');
  page.find('saveModalBtn').click(); await tick();
  assert.equal(server.state.shortcuts.length, 2);
  assert.equal(server.state.shortcuts[1].url, 'https://new.test');
  assert.match(page.w.document.querySelector('.storage-recovery').textContent, /another QuickLaunch window/);
  assert.ok(page.find('editModal').classList.contains('active'));
  page.dispose();
});

test('rapid edits from one context serialize without self conflicts', async () => {
  const server = backend(initial()), page = await ui('options', server);
  const rows = page.find('rows');
  for (const n of [5, 6, 7]) { rows.value = n; rows.dispatchEvent(new page.w.Event('change')); }
  await tick();
  assert.equal(server.state.settings.rows, 7);
  assert.equal(page.w.document.querySelector('.storage-recovery'), null);
  page.dispose();
});

test('appearance preview reports the columns that fit a narrow popup', async () => {
  const data = initial(); Object.assign(data.settings, { popupWidth: 300, cols: 10, iconSize: 64, gridGap: 8 });
  const page = await ui('options', backend(data));
  assert.equal(page.find('previewSummary').textContent, '300px popup · 3 columns');
  page.find('cols').value = 1; page.find('cols').dispatchEvent(new page.w.Event('change')); await tick();
  assert.equal(page.find('previewSummary').textContent, '300px popup · 1 column');
  page.dispose();
});

test('repeat-copy preference persists and survives validated backup settings', async () => {
  const server = backend(initial()), page = await ui('options', server);
  assert.equal(page.find('keepOpenAfterCopy').checked, false);
  page.find('keepOpenAfterCopy').checked = true;
  page.find('keepOpenAfterCopy').dispatchEvent(new page.w.Event('change')); await tick();
  assert.equal(server.state.settings.keepOpenAfterCopy, true);
  assert.equal(backup().settings(server.state.settings, {}).keepOpenAfterCopy, true);
  assert.equal(backup().settings({ keepOpenAfterCopy: 'true' }, { keepOpenAfterCopy: false }).keepOpenAfterCopy, false);
  page.dispose();
  const reopened = await ui('options', server); assert.equal(reopened.find('keepOpenAfterCopy').checked, true); reopened.dispose();
});

test('storage failure keeps keyboard focus on recovery instead of returning to the editor', async () => {
  const server = backend(initial()), page = await ui('popup', server);
  page.find('modeSnippetsBtn').click(); page.find('quickAddBtn').click(); await tick();
  server.failWrite = true; page.input('snippetEditText', 'Failure'); await tick();
  const reload = page.w.document.querySelector('.storage-recovery button');
  assert.ok(reload); assert.equal(page.w.document.activeElement, reload);
  page.key(reload, 'Tab'); assert.equal(page.w.document.activeElement, reload);
  page.key(reload, 'Tab', { shiftKey: true }); assert.equal(page.w.document.activeElement, reload);
  page.dispose();
});

test('quota failure leaves modal open and does not claim success', async () => {
  const server = backend(initial()), page = await ui('options', server);
  server.failWrite = true;
  page.find('addSnippetBtn').click();
  page.input('modalSnippetTitle', 'New'); page.input('modalSnippetText', 'Some text');
  page.find('saveSnippetModalBtn').click(); await tick();
  assert.equal(server.state.snippets.length, 1);
  assert.equal(page.find('snippetModal').style.display, 'flex');
  assert.ok(page.w.document.querySelector('.storage-recovery'));
  assert.notEqual(page.find('toast').textContent, 'Snippet saved!');
  page.dispose();
});

test('read failure does not render an apparently empty writable installation', async () => {
  const server = backend(initial()); server.failRead = true;
  const page = await ui('popup', server);
  assert.equal(page.w.QuickLaunchStorage.blocked, true);
  assert.ok(page.w.document.querySelector('.storage-recovery'));
  page.dispose();
});

test('concurrent menu additions preserve both shortcuts and scope duplicates by workspace', async () => {
  const data = initial(); data.activeWorkspaceId = 'work';
  const server = backend(data);
  for (const url of ['https://site.test', 'https://two.test']) server.events.menu({ menuItemId: 'add-to-quicklaunch', linkUrl: url }, {});
  await tick();
  assert.equal(server.state.shortcuts.length, 3);
  assert.equal(server.state.shortcuts[1].workspaceId, 'work');
  assert.equal(server.state.shortcuts[2].url, 'https://two.test');
});

test('worker launch finishes and records only successfully opened tabs', async () => {
  const data = initial(); data.shortcuts.push({ title: 'Fails', url: 'https://fail.test', workspaceId: 'w_default' });
  const server = backend(data);
  const result = await server.client().runtime.sendMessage({ type: 'launch', workspaceId: 'w_default' });
  assert.equal(result.ok, true);
  assert.match(result.warning, /1 of 2/);
  assert.equal(server.opened[0].windowId, 7);
  assert.equal(server.state.usageCounts['https://site.test'], 1);
  assert.equal(server.state.usageCounts['https://fail.test'], undefined);
});

test('group failure leaves opened tabs accessible and reports the failure', async () => {
  const server = backend(initial()); server.chrome.failGroup = true;
  const result = await server.client().runtime.sendMessage({ type: 'launch', workspaceId: 'w_default' });
  assert.equal(result.ok, true); assert.match(result.warning, /could not group/);
  assert.equal(server.opened.length, 1); assert.equal(server.notices.length, 1);
});

test('untrusted senders cannot invoke the mutation interface', () => {
  const server = backend(initial()); let replied = false;
  assert.equal(server.events.message({ type: 'storage' }, { id: 'outside', url: 'https://outside.test' }, () => { replied = true; }), false);
  assert.equal(replied, false);
});

test('partial snippets restore preserves existing shortcuts; empty collections can restore', () => {
  const b = backup(), state = current();
  const result = b.importData({ snippets: [{ id: 'b', text: 'restored' }] }, state, 'replace', prefix => prefix + 'new');
  assert.equal(result.shortcuts.length, 1); assert.equal(result.snippets[0].id, 'b');
  assert.equal(b.importData({ snippets: [] }, state, 'replace', () => 'new').snippets.length, 0);
});

test('invalid collection cannot silently erase existing shortcuts during restore', () => {
  assert.throws(() => backup().importData({ shortcuts: [{ url: 'javascript:alert(1)' }], snippets: [{ id: 'b', text: 'valid' }] }, current(), 'replace', () => 'new'), /invalid collection/);
  assert.throws(() => backup().importData({ shortcuts: null, snippets: [] }, current(), 'replace', () => 'new'), /invalid collection/);
  assert.throws(() => backup().importData({ snippets: {}, shortcuts: [] }, current(), 'replace', () => 'new'), /invalid collection/);
});

test('partial restore cannot move preserved shortcuts out of their workspace', () => {
  const data = current();
  data.shortcuts[0].workspaceId = 'work';
  assert.throws(() => backup().importData({ snippets: [], settings: { workspaces: [{ id: 'w_default', name: 'Main' }] } }, data, 'replace', () => 'new'), /partial backup would remove workspaces/);
  assert.equal(data.shortcuts[0].workspaceId, 'work');
});

test('merge keeps same URL in separate workspaces and repeated imports do not inflate counts', () => {
  const b = backup(), state = current();
  const data = { shortcuts: [{ url: 'https://site.test', workspaceId: 'work' }],
    settings: state.settings, usageCounts: { 'https://site.test': 5 } };
  const first = b.importData(data, state, 'merge', prefix => prefix + 'new');
  const second = b.importData(data, first, 'merge', prefix => prefix + 'new');
  assert.equal(second.shortcuts.length, 2); assert.equal(second.usageCounts['https://site.test'], 5);
});

test('workspace and old snippet ID collisions preserve both datasets', () => {
  const b = backup(), state = current();
  const result = b.importData({ settings: { workspaces: [{ id: 'work', name: 'Different' }] },
    shortcuts: [{ url: 'https://other.test', workspaceId: 'work' }],
    snippets: [{ id: 'a', title: 'Other', text: 'Different text' }] }, state, 'merge', prefix => prefix + 'new');
  assert.equal(result.shortcuts[1].workspaceId, 'w_new');
  assert.equal(result.snippets.length, 2); assert.equal(result.snippets[1].id, 'snip_new');
});

test('unsupported URL schemes are rejected rather than converted to another host', () => {
  const b = backup();
  for (const url of ['ftp://example.com', 'javascript:alert(1)', 'data:text/html,test']) assert.equal(b.inputUrl(url), null);
  assert.equal(b.inputUrl('example.com'), 'https://example.com');
  assert.equal(b.inputUrl('localhost:3000/path'), 'https://localhost:3000/path');
  assert.equal(b.inputUrl('HTTPS://EXAMPLE.COM'), 'HTTPS://EXAMPLE.COM');
});

test('failed transaction does not poison the background queue', async () => {
  const server = backend(initial());
  const expected = { snippets: JSON.stringify(server.state.snippets) };
  server.failWrite = true;
  const first = await server.client().runtime.sendMessage({ type: 'storage', operation: 'set', values: { snippets: [] }, expected });
  assert.equal(first.ok, false);
  server.failWrite = false;
  const second = await server.client().runtime.sendMessage({ type: 'storage', operation: 'set', values: { snippets: [] }, expected });
  assert.equal(second.ok, true); assert.equal(server.state.snippets.length, 0);
});

test('stale clear cannot erase newer saved data', async () => {
  const server = backend(initial()), page = await ui('options', server);
  server.events.menu({ menuItemId: 'add-to-quicklaunch', linkUrl: 'https://new.test' }, {}); await tick();
  page.find('resetAllBtn').click(); await tick();
  assert.equal(server.state.shortcuts.length, 2);
  assert.equal(page.w.QuickLaunchStorage.blocked, true);
  page.dispose();
});

test('workspace overflow is rejected before any imported shortcut changes workspaces', () => {
  const b = backup();
  const settings = { workspaces: Array.from({ length: 10 }, (_, i) => ({ id: 'x' + i, name: 'X' + i })) };
  assert.throws(() => b.importData({ settings, shortcuts: [{ url: 'https://site.test', workspaceId: 'x9' }] }, current(), 'merge', () => 'new'), /at most 10/);
});

test('default Main workspace is not a shared mutable object across normalizations', () => {
  const b = backup(); b.workspaces(undefined)[0].name = 'Changed';
  assert.equal(b.workspaces(undefined)[0].name, 'Main');
});

test('options dialogs keep keyboard focus inside and return it to the opener', async () => {
  const page = await ui('options', backend(initial()));
  page.find('addShortcutBtn').focus(); page.find('addShortcutBtn').click();
  assert.equal(page.w.document.activeElement, page.find('shortcutTitle'));
  page.key(page.find('shortcutTitle'), 'Tab', { shiftKey: true });
  assert.equal(page.w.document.activeElement, page.find('saveModalBtn'));
  page.key(page.find('saveModalBtn'), 'Tab');
  assert.equal(page.w.document.activeElement, page.find('shortcutTitle'));
  page.find('cancelModalBtn').click();
  assert.equal(page.w.document.activeElement, page.find('addShortcutBtn'));
  page.dispose();
});

test('saving a new snippet atomically clears its own draft but preserves a changed draft', async () => {
  const server = backend(initial());
  const draft = { title: 'A', text: 'one', tags: '' };
  await server.client().runtime.sendMessage({ type: 'draft', value: draft });
  const expected = { snippets: JSON.stringify(server.state.snippets) };
  await server.client().runtime.sendMessage({ type: 'storage', operation: 'set', values: { snippets: [] }, expected, clearDraft: draft });
  assert.equal(server.state.snippetDraft, null);
  const newer = { title: 'B', text: 'two', tags: '' };
  await server.client().runtime.sendMessage({ type: 'draft', value: newer });
  await server.client().runtime.sendMessage({ type: 'storage', operation: 'set', values: { snippets: [] }, expected: { snippets: '[]' }, clearDraft: draft });
  assert.deepEqual(server.state.snippetDraft, newer);
});

test('malformed stored shortcuts do not prevent valid workspace launches', async () => {
  const data = initial(); data.shortcuts.unshift(null);
  const server = backend(data);
  const result = await server.client().runtime.sendMessage({ type: 'launch', workspaceId: 'w_default' });
  assert.equal(result.ok, true); assert.equal(server.opened.length, 1);
});

test('a disconnected extension draft channel stops editing and offers recovery', async () => {
  const page = await ui('popup', backend(initial()));
  page.w.chrome.runtime.sendMessage = () => { throw new Error('Extension context invalidated'); };
  await page.w.QuickLaunchStorage.saveDraft({ title: 'A', text: 'text', tags: '' });
  assert.equal(page.w.QuickLaunchStorage.blocked, true);
  assert.ok(page.w.document.querySelector('.storage-recovery'));
  page.dispose();
});
