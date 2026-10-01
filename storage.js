// Callback-compatible UI storage. Writes survive popup closure in the worker;
// callbacks run only after a successful commit. Failed editors stop accepting
// changes until reloaded, so optimistic UI state cannot leak into a later save.
globalThis.QuickLaunchStorage = (() => {
  const baseline = new Map();
  let tail = Promise.resolve();
  let blocked = false;
  let ready = false;
  let pending = 0;
  let locking = 0;
  let restoreFocus = null;
  let closed = false;
  window.addEventListener('pagehide', () => { closed = true; });
  const encode = QuickLaunchStorageValue.encode;
  const clone = value => JSON.parse(JSON.stringify(value));
  const roots = [...document.body.children].filter(el => !['SCRIPT', 'STYLE'].includes(el.tagName));
  const status = document.createElement('div');
  status.className = 'storage-loading';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading saved data…';
  document.body.appendChild(status);

  function updateAvailability() {
    if (closed) return;
    const locked = !ready || blocked || locking > 0;
    roots.forEach(el => { el.inert = locked; });
    document.body.setAttribute('aria-busy', String(!ready || pending > 0));
    status.hidden = blocked || (ready && pending === 0);
    status.className = ready ? 'storage-saving' : 'storage-loading';
    status.textContent = ready ? 'Saving…' : 'Loading saved data…';
  }
  updateAvailability();
  // Inert protects native pointer/focus interaction. Capture also prevents
  // queued or synthetic events from reaching stale controls while unavailable.
  for (const type of ['click', 'input', 'change', 'keydown', 'pointerdown', 'submit']) {
    document.addEventListener(type, event => {
      if ((!ready || blocked || locking > 0) && !event.target.closest?.('.storage-recovery')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  function beginWrite(lock) {
    if (lock && locking === 0) restoreFocus = document.activeElement;
    pending++;
    if (lock) locking++;
    updateAvailability();
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      pending--;
      if (lock) locking--;
      updateAvailability();
      if (closed) return;
      if (!blocked && locking === 0 && document.activeElement === document.body && restoreFocus?.isConnected) {
        restoreFocus.focus();
      }
      if (locking === 0) restoreFocus = null;
    };
  }

  function fail(error) {
    if (blocked) return;
    blocked = true;
    updateAvailability();
    console.error('QuickLaunch storage:', error.message);
    if (closed) return;
    const panel = document.createElement('div');
    panel.className = 'storage-recovery';
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'QuickLaunch needs to reload');
    const text = document.createElement('p');
    text.textContent = error.code === 'CONFLICT' ? error.message
      : 'QuickLaunch could not finish loading or saving. Reload to check your saved data and try again.';
    const hint = document.createElement('p');
    hint.textContent = 'Reloading discards edits that have not been saved.';
    const button = document.createElement('button');
    button.textContent = 'Reload QuickLaunch';
    button.addEventListener('click', () => window.location.reload());
    panel.addEventListener('keydown', event => {
      if (event.key === 'Tab') { event.preventDefault(); button.focus(); }
    });
    panel.append(text, hint, button);
    document.body.appendChild(panel);
    button.focus();
  }
  function enqueue(task, callback, finish = () => {}) {
    tail = tail.then(async () => {
      if (blocked) { finish(); return; }
      try {
        const result = await task();
        finish();
        if (!closed && callback) callback(result);
      } catch (error) { fail(error); }
      finally { finish(); }
    });
    return tail;
  }
  function get(keys, callback) {
    return enqueue(async () => {
      const result = await chrome.storage.local.get(keys);
      for (const key of keys) baseline.set(key, encode(result[key]));
      return result;
    }, result => {
      if (callback) callback(result);
      // Unlock only after the application has normalized and rendered the
      // initial snapshot. A callback failure must keep the page fail-closed.
      ready = true;
      updateAvailability();
    });
  }
  function write(operation, values, callback, options = {}) {
    if (!ready || blocked) return Promise.resolve();
    // Snapshot now: subsequent edits must not change an already queued write.
    const snapshot = operation === 'set' ? clone(values) : values;
    let finish = () => {};
    const queued = enqueue(async () => {
      const touched = operation === 'set' ? Object.keys(snapshot) : operation === 'remove'
        ? (Array.isArray(snapshot) ? snapshot : [snapshot])
        : ['settings', 'shortcuts', 'snippets', 'usageCounts', 'sortMode', 'searchPosition', 'activeWorkspaceId', 'snippetDraft'];
      const unknown = touched.filter(key => !baseline.has(key));
      if (unknown.length) {
        const current = await chrome.storage.local.get(unknown);
        unknown.forEach(key => baseline.set(key, encode(current[key])));
      }
      const expected = Object.fromEntries(touched.map(key => [key, baseline.get(key)]));
      const result = await chrome.runtime.sendMessage({ type: 'storage', operation,
        values: operation === 'set' ? snapshot : undefined, keys: touched, expected,
        clearDraft: options.clearDraft });
      if (!result?.ok) {
        const error = new Error(result?.error || 'Could not save your changes.');
        error.code = result?.code;
        throw error;
      }
      touched.forEach(key => baseline.set(key, encode(operation === 'set' ? snapshot[key] : undefined)));
    }, callback, () => finish());
    // Establish order before inert can blur an inline editor. Its blur handler
    // may enqueue another write synchronously, which must follow this snapshot.
    finish = beginWrite(operation !== 'set' || ['shortcuts', 'snippets'].some(key => Object.hasOwn(snapshot, key)));
    return queued;
  }
  async function saveDraft(value) {
    if (!ready || blocked || locking > 0) return;
    // Dispatch now rather than behind the UI queue: closing a popup must not
    // discard the last keystrokes waiting for earlier save callbacks.
    try {
      const result = await chrome.runtime.sendMessage({ type: 'draft', value: clone(value) });
      if (!result?.ok) throw new Error(result?.error || 'Could not save the draft.');
    } catch (error) { fail(error); }
  }
  return { get blocked() { return blocked; }, get ready() { return ready; }, get busy() { return locking > 0; }, get, saveDraft, set: (values, cb, options) => write('set', values, cb, options),
    remove: (keys, cb) => write('remove', keys, cb), clear: cb => write('clear', null, cb) };
})();
