const test = require('node:test');
const assert = require('node:assert/strict');
const { backend, ui, tick, copy, source } = require('./helpers.cjs');
const vm = require('node:vm');

function holdNext(object, method) {
  const original = object[method];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  object[method] = (...args) => {
    object[method] = original;
    return gate.then(() => original(...args));
  };
  return release;
}
const shortcuts = [
  { title: 'A', url: 'https://a.test/', workspaceId: 'w_default', icon: '' },
  { title: 'B', url: 'https://b.test/', workspaceId: 'w_default', icon: '' }
];
const snippets = [
  { id: 'a', title: 'A', text: 'Alpha', tags: [] },
  { id: 'b', title: 'B', text: 'Beta', tags: [] }
];

test('late startup autofocus cannot steal focus from an editor opened by the user', async t => {
  const page = await ui('popup', backend({ snippets }), name => name === 'popup.js'
    ? 'window.pendingFrames=[];window.requestAnimationFrame=cb=>window.pendingFrames.push(cb);' + source(name)
    : source(name));
  t.after(page.dispose);
  page.find('modeSnippetsBtn').click(); page.find('quickAddBtn').click(); await tick();
  assert.equal(page.w.document.activeElement, page.find('snippetEditTitle'));
  for (const frame of page.w.pendingFrames) frame();
  assert.equal(page.w.document.activeElement, page.find('snippetEditTitle'));
});

test('a Settings change during the initial read cannot overwrite saved workspaces with defaults', async t => {
  const settings = { rows: 3, cols: 5, theme: 'light', workspaces: [
    { id: 'w_default', name: 'Main' }, { id: 'work', name: 'Work' }
  ] };
  const server = backend({ settings, shortcuts });
  const release = holdNext(server.chrome.storage.local, 'get');
  const page = await ui('options', server); t.after(page.dispose);
  page.find('rows').value = 7;
  page.find('rows').dispatchEvent(new page.w.Event('change', { bubbles: true }));
  release(); await tick();
  assert.deepEqual(server.state.settings, settings);
  assert.equal(server.messages.length, 0);
  assert.equal(page.find('rows').value, '3');
  page.find('rows').value = 6;
  page.find('rows').dispatchEvent(new page.w.Event('change', { bubbles: true }));
  await tick();
  assert.equal(server.state.settings.rows, 6);
  assert.equal(server.state.settings.workspaces[1].name, 'Work');
});

test('popup quick-start during a slow initial read cannot replace an existing collection', async t => {
  const server = backend({ shortcuts });
  const release = holdNext(server.chrome.storage.local, 'get');
  const page = await ui('popup', server); t.after(page.dispose);
  page.w.document.querySelector('.quick-start-chip').click();
  release(); await tick();
  assert.deepEqual(server.state.shortcuts, shortcuts);
  assert.equal(server.messages.length, 0);
});

for (const [collection, selector, data] of [
  ['shortcuts', '#shortcutsList .delete', shortcuts],
  ['snippets', '#snippetsList .delete-btn', snippets]
]) {
  test(`repeated stale ${collection} delete cannot remove the neighboring item during a delayed save`, async t => {
    const server = backend({ [collection]: data });
    const page = await ui('options', server); t.after(page.dispose);
    const release = holdNext(server.chrome.storage.local, 'set');
    const button = page.w.document.querySelector(selector);
    button.click(); button.click();
    release(); await tick();
    assert.deepEqual(server.state[collection].map(item => item.title), ['B']);
  });
}

test('pending dialog save cannot be canceled or changed and its callback cannot close another draft', async t => {
  const server = backend({ shortcuts });
  const page = await ui('options', server); t.after(page.dispose);
  page.find('addShortcutBtn').click();
  page.input('shortcutTitle', 'New'); page.input('shortcutUrl', 'https://new.test');
  const release = holdNext(server.chrome.storage.local, 'set');
  page.find('saveModalBtn').click();
  page.find('cancelModalBtn').click();
  assert.equal(page.find('editModal').classList.contains('active'), true);
  page.find('addShortcutBtn').click();
  release(); await tick();
  assert.deepEqual(server.state.shortcuts.map(item => item.title), ['A', 'B', 'New']);
  assert.equal(page.find('editModal').classList.contains('active'), false);
});

test('a delayed active-tab query cannot open Quick Add after changing popup mode', async t => {
  const server = backend({ shortcuts, snippets });
  let complete;
  server.chrome.tabs.query = (_options, callback) => { complete = callback; };
  const page = await ui('popup', server); t.after(page.dispose);
  page.find('quickAddBtn').click();
  page.find('modeSnippetsBtn').click();
  complete([{ title: 'Current tab', url: 'https://current.test/' }]); await tick();
  assert.equal(page.find('quickAddToast').style.display, 'none');
});

test('a delayed snippet draft read cannot reopen a sheet after leaving Snippets', async t => {
  const server = backend({ snippets });
  const page = await ui('popup', server); t.after(page.dispose);
  page.find('modeSnippetsBtn').click();
  const release = holdNext(server.chrome.storage.local, 'get');
  page.find('quickAddBtn').click(); await tick();
  page.find('modeShortcutsBtn').click();
  release(); await tick();
  assert.equal(page.find('snippetEditSheet').style.display, 'none');
});

test('shortcut deletion and removal of its usage count use one atomic checked write', async t => {
  const server = backend({ shortcuts: [shortcuts[0]], usageCounts: { 'https://a.test/': 12 } });
  const before = copy(server.state);
  const page = await ui('popup', server); t.after(page.dispose);
  page.find('editBtn').click();
  const set = server.chrome.storage.local.set;
  server.chrome.storage.local.set = values => Object.hasOwn(values, 'shortcuts')
    ? Promise.reject(new Error('QUOTA_BYTES')) : set(values);
  page.w.document.querySelector('.shortcut-item .remove-btn').click(); await tick();
  assert.deepEqual(server.state, before);
  assert.equal(server.messages.filter(message => message.type === 'storage').length, 1);
});

test('stale row handles still identify the same shortcut after a completed deletion', async t => {
  const server = backend({ shortcuts });
  const page = await ui('options', server); t.after(page.dispose);
  const [first, second] = [...page.find('shortcutsList').children];
  const staleDelete = first.querySelector('.delete');
  const staleEdit = second.querySelector('[title="Edit"]');
  staleDelete.click(); await tick();
  staleDelete.click(); staleEdit.click();
  assert.equal(page.find('shortcutTitle').value, 'B');
  page.input('shortcutTitle', 'Updated B');
  page.find('saveModalBtn').click(); await tick();
  assert.deepEqual(server.state.shortcuts.map(item => item.title), ['Updated B']);
  assert.equal(server.state.shortcuts[0].url, 'https://b.test/');
});

test('an invalidated launch channel reports the error and restores launch controls', async t => {
  const page = await ui('popup', backend({ shortcuts })); t.after(page.dispose);
  page.w.chrome.runtime.sendMessage = () => { throw new Error('Extension context invalidated'); };
  page.w.document.querySelector('.shortcut-item').click(); await tick();
  assert.match(page.find('popupToast').textContent, /context invalidated/);
  assert.equal(page.find('openGroupBtn').disabled, false);
  assert.equal(page.closed, 0);
});

test('an obsolete active-tab result cannot change the chosen workspace', async t => {
  const server = backend({ settings: { workspaces: [{ id: 'w_default', name: 'Main' }, { id: 'work', name: 'Work' }] } });
  let complete;
  server.chrome.tabs.query = (_options, callback) => { complete = callback; };
  const page = await ui('popup', server); t.after(page.dispose);
  page.find('quickAddBtn').click();
  page.find('workspaceTabs').children[1].click();
  complete([{ title: 'Current', url: 'https://current.test/' }]); await tick();
  assert.equal(page.find('quickAddToast').style.display, 'none');
  assert.equal(server.state.activeWorkspaceId, 'work');
});

test('closing the popup during a delayed save still commits in the worker without touching a closed view', async () => {
  const server = backend({ snippets });
  const page = await ui('popup', server);
  page.find('modeSnippetsBtn').click(); page.find('quickAddBtn').click(); await tick();
  page.input('snippetEditTitle', 'New'); page.input('snippetEditText', 'Keep this'); await tick();
  const release = holdNext(server.chrome.storage.local, 'set');
  page.find('snippetEditSave').click(); await tick();
  page.dispose(); release(); await tick();
  assert.equal(server.state.snippets.at(-1).text, 'Keep this');
  assert.equal(server.state.snippetDraft, null);
  const reopened = await ui('popup', server);
  assert.match(reopened.find('modeSnippetsBtn').textContent, /3/); reopened.dispose();
});

test('a callback API failure uses lastError and never reports successful clipboard removal', async t => {
  const server = backend({});
  server.chrome.permissions.remove = (_options, cb) => {
    server.chrome.runtime.lastError = { message: 'Permission operation failed' };
    try { cb(); } finally { delete server.chrome.runtime.lastError; }
  };
  const page = await ui('options', server); t.after(page.dispose);
  const toggle = page.find('clipboardReadToggle');
  toggle.checked = false; toggle.dispatchEvent(new page.w.Event('change', { bubbles: true })); await tick();
  assert.match(page.find('toast').textContent, /Could not change/);
  assert.equal(toggle.checked, true);
  assert.equal(toggle.disabled, false);
});

test('a failed initial clipboard permission check stays unavailable instead of claiming a grant', async t => {
  const server = backend({});
  server.chrome.permissions.contains = (_options, cb) => {
    server.chrome.runtime.lastError = { message: 'Check failed' };
    try { cb(); } finally { delete server.chrome.runtime.lastError; }
  };
  const page = await ui('options', server); t.after(page.dispose);
  assert.equal(page.find('clipboardReadToggle').disabled, true);
  assert.match(page.find('toast').textContent, /Could not check/);
});

test('notification denial does not turn a successful context-menu save into a failed mutation', async () => {
  const server = backend({});
  server.chrome.notifications.create = (_notice, cb) => {
    server.chrome.runtime.lastError = { message: 'OS notifications denied' };
    try { cb(); } finally { delete server.chrome.runtime.lastError; }
  };
  server.events.menu({ menuItemId: 'add-to-quicklaunch', linkUrl: 'https://new.test/' }, {}); await tick();
  assert.equal(server.state.shortcuts.length, 1);
  assert.equal(server.state.shortcuts[0].url, 'https://new.test/');
});

test('partial launch retains tab, group and usage warnings together', async () => {
  const server = backend({ shortcuts: [...shortcuts, { title: 'Fails', url: 'https://fail.test', workspaceId: 'w_default' }] });
  server.chrome.failGroup = true; server.failWrite = true;
  const result = await server.client().runtime.sendMessage({ type: 'launch', workspaceId: 'w_default' });
  assert.equal(result.ok, true);
  assert.match(result.warning, /2 of 3/);
  assert.match(result.warning, /could not group/);
  assert.match(result.warning, /counts could not be saved/);
  assert.equal(server.opened.length, 2);
});

test('a rebuilt view cancels an old drag rather than reordering stale row positions', async t => {
  const server = backend({ shortcuts });
  const page = await ui('popup', server); t.after(page.dispose);
  page.find('editBtn').click();
  const [first, second] = page.w.document.querySelectorAll('.shortcut-item');
  page.w.document.elementFromPoint = () => second;
  first.dispatchEvent(new page.w.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 20, clientY: 20 }));
  page.w.document.dispatchEvent(new page.w.MouseEvent('pointermove', { clientX: 80, clientY: 80 }));
  page.find('sortBtn').click();
  page.w.document.dispatchEvent(new page.w.MouseEvent('pointerup'));
  await tick();
  assert.deepEqual(server.state.shortcuts.map(item => item.title), ['A', 'B']);
  assert.equal(server.messages.filter(message => message.values?.shortcuts).length, 0);
});

test('focus loss during control locking cannot reverse a deletion and a subsequent inline rename', async t => {
  const server = backend({ shortcuts });
  const page = await ui('popup', server); t.after(page.dispose);
  page.find('editBtn').click();
  const title = page.w.document.querySelector('.shortcut-title');
  title.click(); title.textContent = 'Renamed A';
  // jsdom does not implement inert focus loss. Model that native boundary:
  // a blur handler can enqueue a second save while a write locks the controls.
  let triggered = false;
  Object.defineProperty(page.find('app-container'), 'inert', { configurable: true, set(value) {
    if (value && !triggered) { triggered = true; title.dispatchEvent(new page.w.Event('blur')); }
  } });
  page.w.document.querySelectorAll('.shortcut-item .remove-btn')[1].click(); await tick();
  assert.equal(server.state.shortcuts.length, 1);
  assert.equal(server.state.shortcuts[0].title, 'Renamed A');
});

test('the real bundled parser falling over on deeply nested Markdown leaves a usable literal preview', async t => {
  const text = '>'.repeat(20000) + 'text';
  const page = await ui('popup', backend({ snippets: [{ id: 'nested', title: 'Nested', text }] })); t.after(page.dispose);
  page.find('modeSnippetsBtn').click();
  vm.runInContext('document.querySelector(".snippet-expand-btn").click()', page.dom.getInternalVMContext(), { timeout: 1000 });
  assert.equal(page.w.document.querySelector('.snippet-markdown').textContent, text);
  assert.equal(page.w.document.querySelector('.storage-recovery'), null);
  page.w.document.querySelector('.snippet-copy-btn').click(); await tick();
  assert.deepEqual(page.clipboardWrites, [text]);
});

for (const name of ['popup', 'options']) {
  test(`${name} exports committed defaults after an external reset, instead of stale editor settings`, async t => {
    const server = backend({ settings: { rows: 7, theme: 'light' }, shortcuts });
    const page = await ui(name, server); t.after(page.dispose);
    await server.chrome.storage.local.clear();
    let exported;
    page.w.Blob = class { constructor(parts) { exported = JSON.parse(parts.join('')); } };
    page.w.URL.createObjectURL = () => 'blob:test'; page.w.URL.revokeObjectURL = () => {};
    page.w.HTMLAnchorElement.prototype.click = () => {};
    page.find('exportBtn').click(); await tick();
    assert.equal(exported.settings.rows, 4);
    assert.equal(exported.settings.theme, 'dark');
    assert.deepEqual(exported.shortcuts, []);
    assert.deepEqual(exported.snippets, []);
  });
}
