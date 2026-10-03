// Local visual QA only. Synthetic data; no user's extension storage or clipboard.
const query = new URLSearchParams(location.search);
const makeShortcuts = count => Array.from({ length: count }, (_, i) => ({
  title: (query.has('store')
    ? ['Dashboard', 'Project notes', 'Reference', 'Calendar', 'Documents', 'Design board', 'Reading list', 'Team wiki', 'Research', 'Tasks', 'Learning', 'Inbox'][i]
    : ['GitHub', 'YouTube', 'Google', 'ChatGPT'][i % 4] + (i >= 4 ? ` ${i}` : '')),
  url: `https://example.test/${i}`, workspaceId: i % 2 ? 'work' : 'w_default', icon: ''
}));
let state = {
  searchPosition: query.get('position') === 'bottom' ? 'bottom' : 'top',
  settings: { theme: query.get('theme') || 'dark', keepOpenAfterCopy: query.has('keepOpen'), popupWidth: Number(query.get('width')) || 380,
    cols: Number(query.get('cols')) || 4, rows: 4,
    workspaces: [{ id: 'w_default', name: 'Main' }, { id: 'work', name: 'Work' }] },
  shortcuts: query.has('empty') ? [] : makeShortcuts(12),
  snippets: [{ id: 'code', title: 'Review code', text: '# Review\n\n```javascript\nconst result = 42;\n```', tags: ['code', 'review'] },
    { id: 'prompt', title: query.has('store') ? 'Summarize a draft' : 'A reusable prompt with a long name to check alignment', text: 'Summarize {{clipboard}}', tags: ['writing'] },
    { id: 'meeting', title: 'Meeting summary', text: 'Summarize decisions, action items, and open questions.\n\nDate: {{date}}', tags: ['work'] },
    { id: 'writing', title: 'Polish a draft', text: 'Make this draft clear and concise while preserving its meaning.', tags: ['writing'] },
    { id: 'plan', title: 'Plan the next step', text: 'List the next three useful actions, in order.', tags: ['planning'] },
    { id: 'context', title: 'Context switch', text: 'What changed, what remains, and where should I start?', tags: ['work'] }]
};
const copy = value => JSON.parse(JSON.stringify(value));
const storageCopy = value => Array.isArray(value) ? value.map(storageCopy)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, storageCopy(value[key])])) : value;
const delay = key => new Promise(resolve => setTimeout(resolve, Math.max(0, Math.min(10000, Number(query.get(key)) || 0))));
let initialRead = true;
// Keep visual copy checks inside this disposable adapter.
Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
  readText: async () => 'Synthetic clipboard text', writeText: async () => {}
} });
function api(fn) { return (...args) => {
  const cb = typeof args.at(-1) === 'function' ? args.pop() : null;
  const promise = Promise.resolve().then(() => fn(...args));
  if (cb) { promise.then(cb, error => {
    chrome.runtime.lastError = { message: error.message };
    try { cb(); } finally { delete chrome.runtime.lastError; }
  }); return; } return promise;
}; }
globalThis.chrome = {
  storage: { local: {
    get: api(async keys => {
      if (initialRead) { initialRead = false; await delay('loadDelay'); }
      if (query.has('readFailure')) throw new Error('Synthetic read failure');
      return storageCopy(copy(Object.fromEntries(keys.filter(key => Object.hasOwn(state, key)).map(key => [key, state[key]]))));
    }),
    set: api(async data => {
      await delay('saveDelay');
      if (query.has('saveFailure')) throw new Error('Synthetic QUOTA_BYTES');
      Object.assign(state, copy(data));
    }),
    remove: api(keys => { [].concat(keys).forEach(key => delete state[key]); }), clear: api(() => { state = {}; })
  } },
  runtime: { getManifest: () => ({ version: '2.7' }), getURL: path => query.has('store') && path.startsWith('/_favicon/') ? '' : '/assets/icon48.png',
    sendMessage: message => message.type === 'storage'
      ? QuickLaunchStoreWorker.run(() => QuickLaunchStoreWorker.commit(message)).catch(error => ({ ok: false, error: error.message, code: error.code }))
      : message.type === 'draft' ? QuickLaunchStoreWorker.run(async () => {
        await chrome.storage.local.set({ snippetDraft: message.value });
        return { ok: true };
      }) : Promise.resolve({ ok: true }), openOptionsPage: (_cb) => { location.href = '/options.html'; } },
  tabs: { query: api(() => [{ title: 'Example', url: 'https://example.test/current' }]) },
  permissions: { contains: api(() => false), request: api(() => false), remove: api(() => true) }
};
