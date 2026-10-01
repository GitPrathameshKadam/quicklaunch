const test = require('node:test');
const assert = require('node:assert/strict');
const { backend, ui, tick, source } = require('./helpers.cjs');
const vm = require('node:vm');
const state = () => ({ settings: { workspaces: [{ id: 'w_default', name: 'Main' }, { id: 'work', name: 'Work' }] },
  shortcuts: [{ title: 'Zulu', url: 'https://z.test', workspaceId: 'w_default' }, { title: 'Alpha', url: 'https://a.test', workspaceId: 'w_default' }],
  snippets: [{ id: 'a', title: 'Template', text: 'Hello {{clipboard}}', tags: [] }] });

function clock(page) {
  const timers = new Map(); let now = 0, next = 0;
  page.w.setTimeout = (fn, delay = 0) => { timers.set(++next, { fn, at: now + delay }); return next; };
  page.w.clearTimeout = id => timers.delete(id);
  return { advance(ms) {
    const end = now + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      now = due[1].at; timers.delete(due[0]); due[1].fn();
    }
    now = end;
  } };
}

function snippet() { const c = vm.createContext({ Date }); vm.runInContext(source('snippet.js'), c); return c.QuickLaunchSnippet; }

test('clipboard expansion preserves dollar patterns and treats inserted placeholders as literal text', async () => {
  const text = await snippet().expand('{{clipboard}} / {{CLIPBOARD}}', { hasPermission: async () => true,
    readClipboard: async () => "$& $' $` $$ {{date}}" });
  assert.equal(text, "$& $' $` $$ {{date}} / $& $' $` $$ {{date}}");
});

test('clipboard denial and read failure stop copy and leave the popup open', async () => {
  const server = backend(state()); server.chrome.clipboardPermission = false;
  const page = await ui('popup', server);
  page.find('modeSnippetsBtn').click();
  page.w.document.querySelector('.snippet-item').click(); await tick();
  assert.equal(page.clipboardWrites.length, 0);
  assert.match(page.find('popupToast').textContent, /Enable clipboard access/);
  assert.equal(page.closed, 0);
  await assert.rejects(snippet().expand('{{clipboard}}', { hasPermission: async () => true,
    readClipboard: async () => { throw new Error('Read denied'); } }), /not copied/);
  page.dispose();
});

test('collapsed snippets parse zero markdown, expansion is cached, and active HTML is inert', async () => {
  const data = state(); data.snippets[0].text = '# Heading\n\n```javascript\nconst x = 1;\n```\n\n<img src="https://leak.test/x" onerror="alert(1)">\n\n![leak](https://leak.test/y)\n\n[bad](javascript:alert(1))';
  const page = await ui('popup', backend(data));
  let parses = 0; const parse = page.w.marked.parse;
  page.w.marked = { ...page.w.marked, parse: (...args) => { parses++; return parse(...args); } };
  page.find('modeSnippetsBtn').click();
  assert.equal(parses, 0);
  const button = page.w.document.querySelector('.snippet-expand-btn');
  button.click(); button.click(); button.click();
  assert.equal(parses, 1);
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  const markdown = page.w.document.querySelector('.snippet-markdown');
  assert.equal(markdown.querySelector('img, iframe, script, [onerror], [style]'), null);
  assert.equal(markdown.querySelector('a')?.getAttribute('href'), null);
  assert.equal(markdown.querySelector('code').classList.contains('hljs'), true);
  assert.equal(page.clipboardWrites.length, 0);
  page.dispose();
});

test('large preview uses plain text without markdown work', async () => {
  const data = state(); data.snippets[0].text = 'x'.repeat(100001);
  const page = await ui('popup', backend(data));
  page.w.marked = { ...page.w.marked, parse: () => { throw new Error('Must not parse huge content'); } };
  page.find('modeSnippetsBtn').click(); page.w.document.querySelector('.snippet-expand-btn').click();
  assert.equal(page.w.document.querySelector('.snippet-markdown').textContent.length, 100001);
  page.dispose();
});

test('numeric and workspace hotkeys cannot launch behind an open snippet sheet', async () => {
  const server = backend(state()), page = await ui('popup', server);
  page.find('modeSnippetsBtn').click(); page.find('quickAddBtn').click(); await tick();
  page.find('snippetEditTitle').focus();
  page.key(page.find('snippetEditTitle'), '1');
  page.key(page.find('snippetEditTitle'), '2', { ctrlKey: true }); await tick();
  assert.equal(server.opened.length, 0);
  assert.equal(page.find('modeSnippetsBtn').getAttribute('aria-pressed'), 'true');
  assert.equal(page.find('snippetEditSheet').style.display, 'block');
  page.dispose();
});

test('modifier keys do not accidentally trigger number shortcuts', async () => {
  const server = backend(state()), page = await ui('popup', server);
  for (const options of [{ altKey: true }, { metaKey: true }, { ctrlKey: true }]) page.key(page.find('searchInput'), '0', options);
  await tick(); assert.equal(server.opened.length, 0);
  page.dispose();
});

test('arrow navigation starts from the actual focused tile, and snippets have keyboard copy controls', async () => {
  const page = await ui('popup', backend(state()));
  const items = [...page.w.document.querySelectorAll('.shortcut-item')];
  items[1].focus(); page.key(items[1], 'ArrowLeft');
  assert.equal(page.w.document.activeElement, items[0]);
  page.find('modeSnippetsBtn').click(); page.find('searchInput').focus(); page.key(page.find('searchInput'), 'ArrowDown');
  assert.equal(page.w.document.activeElement.className, 'snippet-item');
  assert.ok(page.w.document.querySelector('button[aria-label="Copy Template"]'));
  page.dispose();
});

test('switching an empty grid to snippets hides shortcut onboarding and workspace tabs', async () => {
  const data = state(); data.shortcuts = [];
  const page = await ui('popup', backend(data));
  assert.equal(page.find('emptyState').style.display, 'flex');
  page.find('modeSnippetsBtn').click();
  assert.equal(page.find('emptyState').style.display, 'none');
  assert.equal(page.find('workspaceTabs').style.display, 'none');
  page.find('editBtn').click();
  page.w.document.querySelector('.snippet-action-btn.remove').click(); await tick();
  assert.equal(page.find('gridContainer').style.display, 'none');
  page.dispose();
});

test('search numeric target follows sort order, and alphanumeric queries do not inject a shortcut', async () => {
  const data = state(); data.sortMode = 'az';
  const page = await ui('popup', backend(data));
  page.input('searchInput', '1'); page.find('sortBtn').click(); page.find('sortBtn').click(); page.find('sortBtn').click();
  assert.equal(page.w.document.querySelector('.shortcut-title').textContent, 'Alpha');
  page.input('searchInput', '1xyz'); page.find('sortBtn').click();
  assert.equal(page.w.document.querySelectorAll('.shortcut-item').length, 0);
  page.dispose();
});

test('popup exports latest committed data and the separate search-position preference', async () => {
  const server = backend(state()), page = await ui('popup', server);
  server.events.menu({ menuItemId: 'add-to-quicklaunch', linkUrl: 'https://new.test' }, {}); await tick();
  await server.chrome.storage.local.set({ searchPosition: 'bottom' });
  let exported;
  page.w.Blob = class { constructor(parts) { exported = JSON.parse(parts.join('')); } };
  page.w.URL.createObjectURL = () => 'blob:test'; page.w.URL.revokeObjectURL = () => {};
  page.w.HTMLAnchorElement.prototype.click = () => {};
  page.find('exportBtn').click(); await tick();
  assert.equal(exported.shortcuts.length, 3);
  assert.equal(exported.settings.searchPosition, 'bottom');
  assert.equal(exported.version, '2.7');
  assert.match(page.find('popupToast').textContent, /Exported 3 shortcuts/);
  page.dispose();
});

test('new snippet saves preserve exact whitespace and draft survives immediate input', async () => {
  const server = backend(state()), page = await ui('popup', server);
  page.find('modeSnippetsBtn').click(); page.find('quickAddBtn').click(); await tick();
  page.input('snippetEditTitle', 'Whitespace'); page.input('snippetEditText', '  indented\n\n'); await tick();
  assert.equal(server.state.snippetDraft.text, '  indented\n\n');
  page.find('snippetEditSave').click(); await tick();
  assert.equal(server.state.snippets[1].text, '  indented\n\n');
  assert.equal(server.state.snippetDraft, null);
  page.dispose();
});

test('compact layout fits icons and keyboard rows follow the adapted grid', async () => {
  const data = state(); Object.assign(data.settings, { popupWidth: 300, cols: 10, iconSize: 64 });
  data.shortcuts = Array.from({ length: 8 }, (_, i) => ({ title: 'Site ' + i, url: `https://site.test/${i}`, workspaceId: 'w_default' }));
  const page = await ui('popup', backend(data));
  assert.equal(page.find('gridContainer').style.gridTemplateColumns, 'repeat(3, minmax(0, 1fr))');
  const items = [...page.w.document.querySelectorAll('.shortcut-item')];
  items[0].focus(); page.key(items[0], 'ArrowDown');
  assert.equal(page.w.document.activeElement, items[3]);
  page.dispose();
});

test('Markdown parser exceptions fall back to literal text rather than breaking the popup', async () => {
  const page = await ui('popup', backend(state()));
  page.w.marked = { ...page.w.marked, parse: () => { throw new Error('Malformed Markdown'); } };
  page.find('modeSnippetsBtn').click(); page.w.document.querySelector('.snippet-expand-btn').click();
  assert.equal(page.w.document.querySelector('.snippet-markdown').textContent, 'Hello {{clipboard}}');
  page.dispose();
});

test('editing a shortcut still targets the same item after another tile is deleted', async () => {
  const server = backend(state()), page = await ui('popup', server);
  page.find('editBtn').click();
  page.w.document.querySelectorAll('.edit-url-btn')[1].click();
  page.w.document.querySelectorAll('.remove-btn')[0].click(); await tick();
  page.input('editSheetTitle', 'Edited Alpha'); page.find('editSheetSave').click(); await tick();
  assert.equal(server.state.shortcuts.length, 1);
  assert.equal(server.state.shortcuts[0].title, 'Edited Alpha');
  assert.equal(server.state.shortcuts[0].url, 'https://a.test');
  page.dispose();
});

test('rapid draft inputs reach the worker before popup teardown and retain the last value', async () => {
  const server = backend(state()), page = await ui('popup', server);
  page.find('modeSnippetsBtn').click(); page.find('quickAddBtn').click(); await tick();
  for (const text of ['one', 'two', 'latest']) page.input('snippetEditText', text);
  assert.equal(server.messages.filter(m => m.type === 'draft').at(-1).value.text, 'latest');
  page.dispose(); await tick();
  assert.equal(server.state.snippetDraft.text, 'latest');
});

test('popup dialogs contain keyboard focus and Escape returns to their trigger', async () => {
  const page = await ui('popup', backend(state()));
  page.find('modeSnippetsBtn').click(); page.find('quickAddBtn').click(); await tick();
  const first = page.find('snippetEditTitle'), last = page.find('snippetEditSave');
  assert.equal(page.w.document.activeElement, first);
  first.focus(); assert.equal(page.key(first, 'Tab', { shiftKey: true }), false);
  assert.equal(page.w.document.activeElement, last);
  assert.equal(page.key(last, 'Tab'), false);
  assert.equal(page.w.document.activeElement, first);
  page.key(first, 'Escape');
  assert.equal(page.find('snippetEditSheet').style.display, 'none');
  assert.equal(page.w.document.activeElement, page.find('quickAddBtn'));
  page.find('modeShortcutsBtn').click(); page.find('quickAddBtn').click(); await tick();
  assert.equal(page.w.document.activeElement, page.find('qaConfirmBtn'));
  page.key(page.find('qaConfirmBtn'), 'Tab');
  assert.equal(page.w.document.activeElement, page.find('qaCancelBtn'));
  page.dispose();
});

test('view transitions cancel earlier motion and skip animation for reduced motion', async () => {
  const page = await ui('popup', backend(state()));
  let animations = 0, cancellations = 0;
  page.find('snippetsContainer').animate = () => { animations++; return { cancel: () => { cancellations++; } }; };
  page.find('modeSnippetsBtn').click();
  page.find('modeShortcutsBtn').click(); page.find('modeSnippetsBtn').click();
  assert.equal(animations, 2); assert.equal(cancellations, 1);
  page.w.matchMedia = () => ({ matches: true });
  page.find('modeShortcutsBtn').click(); page.find('modeSnippetsBtn').click();
  assert.equal(animations, 2); assert.equal(cancellations, 2);
  assert.equal(page.find('snippetsContainer').style.display, 'flex');
  page.dispose();
});

test('edit controls have accessible names and are not nested inside launch links', async () => {
  const page = await ui('popup', backend(state()));
  page.find('editBtn').click();
  const edit = page.w.document.querySelector('button[aria-label="Edit Zulu"]');
  assert.ok(edit); assert.equal(edit.closest('a'), null);
  edit.click(); assert.equal(page.find('editShortcutSheet').style.display, 'block');
  page.find('editSheetCancel').click(); page.find('modeSnippetsBtn').click();
  assert.ok(page.w.document.querySelector('button[aria-label="Edit Template"]'));
  assert.ok(page.w.document.querySelector('button[aria-label="Remove Template"]'));
  page.dispose();
});

test('global ranked search identifies workspaces and Enter uses the latest query', async () => {
  const data = state(); data.shortcuts = [
    { title: 'Docs archive', url: 'https://archive.test', workspaceId: 'w_default' },
    { title: 'Docs', url: 'https://docs.test', workspaceId: 'work' }];
  const server = backend(data), page = await ui('popup', server), time = clock(page);
  page.input('searchInput', 'docs'); time.advance(100);
  assert.equal(page.w.document.querySelector('.shortcut-title').textContent, 'Docs');
  assert.equal(page.w.document.querySelector('.shortcut-workspace').textContent, 'Work');
  assert.match(page.find('searchStatus').textContent, /2 results · All workspaces/);
  page.input('searchInput', 'archive'); page.find('searchInput').focus(); page.key(page.find('searchInput'), 'Enter'); await tick();
  assert.equal(server.opened[0].url, 'https://archive.test');
  page.dispose();
});

test('ranked snippet results and number/Enter copy refer to the same item', async () => {
  const data = state(); data.settings.keepOpenAfterCopy = true;
  data.snippets = [{ id: 'b', title: 'Other', text: 'market review', tags: [] },
    { id: 'a', title: 'Market review', text: 'First result', tags: ['daily'] }];
  const page = await ui('popup', backend(data)), time = clock(page);
  page.find('modeSnippetsBtn').click(); page.input('searchInput', 'market review'); time.advance(100);
  assert.equal(page.w.document.querySelector('.snippet-title').textContent, 'Market review');
  page.find('searchInput').focus(); page.key(page.find('searchInput'), '1'); await tick();
  page.key(page.find('searchInput'), 'Enter'); await tick();
  assert.deepEqual(page.clipboardWrites, ['First result', 'First result']);
  page.dispose();
});

test('Escape and empty-result Clear search restore content without stale status', async () => {
  const page = await ui('popup', backend(state())), time = clock(page);
  page.input('searchInput', 'no-such-result'); time.advance(100);
  assert.match(page.w.document.querySelector('.search-empty').textContent, /No matching shortcuts/);
  page.w.document.querySelector('.search-empty button').click();
  assert.equal(page.find('searchInput').value, ''); assert.equal(page.find('searchStatus').hidden, true);
  assert.equal(page.w.document.querySelectorAll('.shortcut-item').length, 2);
  page.input('searchInput', 'no-such-result'); page.key(page.find('searchInput'), 'Escape'); time.advance(100);
  assert.equal(page.find('searchInput').value, ''); assert.equal(page.find('searchStatus').textContent, '');
  page.dispose();
});

test('typing from a focused tile retains the first character, and Ctrl/Cmd+F focuses search', async () => {
  const page = await ui('popup', backend(state()));
  const tile = page.w.document.querySelector('.shortcut-item'); tile.focus(); page.key(tile, 'z');
  assert.equal(page.find('searchInput').value, 'z');
  assert.equal(page.w.document.activeElement, page.find('searchInput'));
  tile.focus(); page.key(tile, 'f', { metaKey: true });
  assert.equal(page.w.document.activeElement, page.find('searchInput'));
  assert.equal(page.find('searchInput').selectionEnd, 1);
  tile.focus(); page.key(tile, 'x', { altKey: true }); assert.equal(page.find('searchInput').value, 'z');
  page.dispose();
});

test('optional repeated-copy workflow keeps popup open and resets copied feedback', async () => {
  const data = state(); data.settings.keepOpenAfterCopy = true;
  const page = await ui('popup', backend(data)), time = clock(page);
  page.find('modeSnippetsBtn').click(); const button = page.w.document.querySelector('.snippet-copy-btn');
  button.click(); await tick();
  assert.equal(button.textContent.includes('Copied'), true); time.advance(500);
  assert.equal(page.closed, 0);
  assert.equal(page.find('copyStatus').textContent, 'Copied Template.');
  assert.equal(page.find('popupToast'), null);
  button.click(); await tick(); assert.equal(page.clipboardWrites.length, 2);
  time.advance(1500); assert.equal(button.textContent.includes('Copied'), false);
  assert.equal(page.w.document.querySelector('.snippet-item').classList.contains('copied'), false);
  assert.equal(button.disabled, false); assert.equal(page.closed, 0);
  page.dispose();
});

test('default copy still closes the popup, but does not dismiss a newly opened editor', async () => {
  const page = await ui('popup', backend(state())), time = clock(page);
  page.find('modeSnippetsBtn').click(); page.w.document.querySelector('.snippet-copy-btn').click(); await tick();
  time.advance(500); assert.equal(page.closed, 1);
  page.w.document.querySelector('.snippet-copy-btn').click(); await tick();
  page.find('quickAddBtn').click(); await tick(); time.advance(500);
  assert.equal(page.closed, 1); assert.equal(page.find('snippetEditSheet').style.display, 'block');
  page.dispose();
});

test('pending copy prevents racing writes and write failure restores copy controls', async () => {
  const page = await ui('popup', backend(state())), time = clock(page);
  let rejectCopy, writes = 0;
  page.w.navigator.clipboard.writeText = () => { writes++; return new Promise((_resolve, reject) => { rejectCopy = reject; }); };
  page.find('modeSnippetsBtn').click(); const card = page.w.document.querySelector('.snippet-item');
  card.click(); await tick(); card.click(); await tick(); assert.equal(writes, 1);
  rejectCopy(new Error('Clipboard unavailable')); await tick(); time.advance(500);
  assert.equal(page.closed, 0); assert.equal(card.classList.contains('copied'), false);
  assert.equal(page.w.document.querySelector('.snippet-copy-btn').disabled, false);
  assert.match(page.find('popupToast').textContent, /Clipboard unavailable/);
  page.dispose();
});

test('disabled badges and type-in-search mode do not advertise launch keys', async () => {
  for (const settings of [{ showBadges: false }, { hotkeyAction: 'type' }]) {
    const data = state(); Object.assign(data.settings, settings);
    const page = await ui('popup', backend(data));
    assert.equal(page.w.document.querySelector('.hotkey-badge'), null);
    page.find('modeSnippetsBtn').click(); assert.equal(page.w.document.querySelector('.snippet-copy-key'), null);
    page.dispose();
  }
});

test('turning on reduced motion immediately cancels an active view animation', async () => {
  const page = await ui('popup', backend(state())); let cancelled = 0;
  page.find('snippetsContainer').animate = () => ({ cancel: () => { cancelled++; } });
  page.find('modeSnippetsBtn').click(); page.setMedia('(prefers-reduced-motion: reduce)', true);
  assert.equal(cancelled, 1); page.dispose();
});
