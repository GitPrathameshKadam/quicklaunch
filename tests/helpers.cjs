const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
// Chromium dictionaries do not retain JS insertion order. Exercise that
// boundary for every UI/worker test instead of hiding it in a JSON-only mock.
const storageCopy = value => Array.isArray(value) ? value.map(storageCopy)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, storageCopy(value[key])])) : value;
const tick = async () => { for (let i = 0; i < 15; i++) await new Promise(resolve => setImmediate(resolve)); };

function backend(initial = {}, read = source) {
  let state = copy(initial);
  const events = {};
  const notices = [], opened = [], messages = [];
  let failWrite = false, failRead = false;
  const event = name => ({ addListener(fn) { events[name] = fn; } });
  function api(fn) {
    return (...args) => {
      const callback = typeof args.at(-1) === 'function' ? args.pop() : null;
      const promise = Promise.resolve().then(() => fn(...args));
      if (callback) {
        promise.then(value => callback(value), error => {
          // Native callback APIs report failure through lastError only while
          // the callback is running; they do not reject an invisible Promise.
          chrome.runtime.lastError = { message: error.message };
          try { callback(); } finally { delete chrome.runtime.lastError; }
        });
        return;
      }
      return promise;
    };
  }
  const chrome = {
    storage: { local: {
      get: api(keys => {
        if (failRead) throw new Error('Read failed');
        return storageCopy(copy(keys ? Object.fromEntries(keys.filter(key => Object.hasOwn(state, key)).map(key => [key, state[key]])) : state));
      }),
      set: api(values => { if (failWrite) throw new Error('QUOTA_BYTES'); Object.assign(state, copy(values)); }),
      remove: api(keys => { if (failWrite) throw new Error('Failed'); for (const key of [].concat(keys)) delete state[key]; }),
      clear: api(() => { if (failWrite) throw new Error('Failed'); state = {}; })
    } },
    runtime: { id: 'test', getURL: p => 'chrome-extension://test/' + p.replace(/^\//, ''),
      getManifest: () => ({ version: '2.7' }), onInstalled: event('installed'), onMessage: event('message'), openOptionsPage: api(() => {}) },
    contextMenus: { onClicked: event('menu'), removeAll: api(() => {}), create(_menu, cb) { cb?.(); } },
    notifications: { create: api(notice => { notices.push(notice); return 'notice'; }) },
    windows: { getLastFocused: api(() => ({ id: 7 })) },
    tabs: {
      create: api(options => { if (options.url.includes('fail.test')) throw new Error('Tab failed'); const tab = { id: opened.length + 1, ...options }; opened.push(tab); return tab; }),
      update: api((id, options) => { opened.push({ id, ...options }); return { id }; }),
      query: api(() => [{ id: 55, url: 'https://active.test', title: 'Active' }]),
      group: api(() => { if (chrome.failGroup) throw new Error('Group failed'); return 4; })
    },
    tabGroups: { update: api((_id, options) => options) },
    permissions: { contains: api(() => chrome.clipboardPermission !== false), request: api(() => true), remove: api(() => true) }
  };
  const context = vm.createContext({ chrome, URL, console, setTimeout, clearTimeout });
  context.importScripts = (...names) => names.forEach(name => vm.runInContext(read(name), context));
  vm.runInContext(read('background.js'), context);
  function client(page = 'popup.html') {
    const runtime = { ...chrome.runtime, sendMessage: message => {
      messages.push(copy(message));
      return new Promise(resolve => events.message(copy(message), { id: 'test', url: chrome.runtime.getURL(page) }, resolve));
    } };
    Object.defineProperty(runtime, 'lastError', { get: () => chrome.runtime.lastError });
    return { ...chrome, runtime };
  }
  return { chrome, client, events, context, notices, opened, messages,
    get state() { return state; }, set failWrite(value) { failWrite = value; }, set failRead(value) { failRead = value; } };
}

async function ui(name, server, read = source) {
  const dom = new JSDOM(read(name + '.html'), { url: 'https://test.invalid/' + name + '.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.chrome = server.client(name + '.html');
  const media = new Map();
  w.matchMedia = query => {
    if (!media.has(query)) media.set(query, { matches: false, listeners: [], addEventListener(_type, fn) { this.listeners.push(fn); } });
    return media.get(query);
  };
  const setMedia = (query, matches) => {
    const value = w.matchMedia(query); value.matches = matches;
    value.listeners.forEach(listener => listener({ matches }));
  };
  w.confirm = () => true;
  w.alert = message => { w.lastAlert = message; };
  const dispose = () => { w.dispatchEvent(new w.Event('pagehide')); dom.window.close(); };
  let closed = 0;
  w.close = () => { closed++; };
  const clipboardWrites = [];
  Object.defineProperty(w.navigator, 'clipboard', { value: {
    readText: async () => '$& {{date}}', writeText: async text => { clipboardWrites.push(text); }
  } });
  // Let jsdom finish its own DOMContentLoaded before attaching the application.
  await new Promise(resolve => w.document.readyState === 'loading'
    ? w.document.addEventListener('DOMContentLoaded', resolve, { once: true }) : resolve());
  for (const file of ['backup.js', 'storage-value.js', 'storage.js', 'snippet.js', ...(name === 'popup' ? ['search.js', 'assets/libs/marked.min.js', 'assets/libs/highlight.min.js'] : []), name + '.js']) w.eval(read(file));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await tick();
  const find = id => w.document.getElementById(id);
  const input = (id, value) => { find(id).value = value; find(id).dispatchEvent(new w.Event('input')); };
  const key = (target, value, options = {}) => target.dispatchEvent(new w.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options }));
  return { w, dom, find, input, key, setMedia, clipboardWrites, get closed() { return closed; }, dispose };
}
module.exports = { backend, ui, tick, source, copy };
