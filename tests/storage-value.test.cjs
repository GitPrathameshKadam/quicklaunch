const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { source, backend, ui, tick } = require('./helpers.cjs');
const context = vm.createContext({});
vm.runInContext(source('storage-value.js'), context);
const values = context.QuickLaunchStorageValue;

test('equivalent nested object fields survive storage reordering, while array order remains significant', () => {
  const first = { rows: 4, workspaces: [{ name: 'Main', id: 'main' }, { name: 'Work', id: 'work' }] };
  const reordered = { workspaces: [{ id: 'main', name: 'Main' }, { id: 'work', name: 'Work' }], rows: 4 };
  assert.equal(values.encode(first), values.encode(reordered));
  assert.equal(values.matches(JSON.stringify(first), reordered), true);
  assert.equal(values.matches(values.encode(first), { ...reordered, rows: 5 }), false);
  assert.equal(values.matches(values.encode(first), { ...reordered, workspaces: [...reordered.workspaces].reverse() }), false);
});

test('legacy expected JSON remains usable, and malformed or missing expectations cannot bypass the guard', () => {
  assert.equal(values.matches('{"title":"A","text":"one","tags":[]}', { tags: [], text: 'one', title: 'A' }), true);
  assert.equal(values.matches('{"title":"A","text":"one","tags":[]}', { tags: [], text: 'two', title: 'A' }), false);
  for (const expected of [undefined, null, {}, '', '{broken']) assert.equal(values.matches(expected, { title: 'A' }), false);
  const withSpecialKey = JSON.parse('{"__proto__":{"value":1},"title":"A"}');
  assert.equal(values.matches(values.encode(withSpecialKey), { title: 'A' }), false);
  assert.equal(Object.hasOwn(JSON.parse(values.encode(withSpecialKey)), '__proto__'), true);
});

test('first Settings save succeeds even if storage returns object fields in a different order between reads', async () => {
  const server = backend({ settings: { rows: 4, workspaces: [{ id: 'w_default', name: 'Main' }] } });
  const get = server.chrome.storage.local.get;
  let reads = 0;
  server.chrome.storage.local.get = async keys => {
    const result = await get(keys);
    if (++reads === 1) result.settings = { workspaces: result.settings.workspaces, rows: result.settings.rows };
    return result;
  };
  const page = await ui('options', server);
  page.find('rows').value = 5; page.find('rows').dispatchEvent(new page.w.Event('change')); await tick();
  assert.equal(server.state.settings.rows, 5);
  assert.equal(page.w.QuickLaunchStorage.blocked, false);
  assert.equal(page.w.document.querySelector('.storage-recovery'), null);
  page.dispose();
});

test('consecutive completed Settings saves succeed after object-key reordering on every storage read', async () => {
  const server = backend({ settings: { workspaces: [{ id: 'w_default', name: 'Main' }] } });
  const page = await ui('options', server);
  for (const rows of [5, 6, 7]) {
    page.find('rows').value = rows; page.find('rows').dispatchEvent(new page.w.Event('change')); await tick();
    assert.equal(server.state.settings.rows, rows);
    assert.equal(page.w.QuickLaunchStorage.blocked, false);
  }
  page.dispose();
  const reopened = await ui('options', server);
  assert.equal(reopened.find('rows').value, '7');
  reopened.dispose();
});

test('genuine Settings conflicts still block a stale editor and preserve the other window save', async () => {
  const server = backend({ settings: { rows: 4, workspaces: [{ id: 'w_default', name: 'Main' }] } });
  const first = await ui('options', server), second = await ui('options', server);
  second.find('rows').value = 6; second.find('rows').dispatchEvent(new second.w.Event('change')); await tick();
  first.find('rows').value = 5; first.find('rows').dispatchEvent(new first.w.Event('change')); await tick();
  assert.equal(server.state.settings.rows, 6);
  assert.equal(first.w.QuickLaunchStorage.blocked, true);
  assert.match(first.w.document.querySelector('.storage-recovery').textContent, /another QuickLaunch window/);
  first.dispose(); second.dispose();
});
