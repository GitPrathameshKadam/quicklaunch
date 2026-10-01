// One writer for all extension contexts. Compare the state the editor loaded
// before committing: a stale settings tab must never erase a newer shortcut.
globalThis.QuickLaunchStoreWorker = (() => {
  let tail = Promise.resolve();
  const keys = new Set(['settings', 'shortcuts', 'snippets', 'usageCounts',
    'sortMode', 'searchPosition', 'activeWorkspaceId', 'snippetDraft']);
  const encode = QuickLaunchStorageValue.encode;
  function run(task) {
    const result = tail.then(task);
    tail = result.catch(() => {});
    return result;
  }
  async function commit(message) {
    const operation = message.operation;
    if (!['set', 'remove', 'clear'].includes(operation)) throw new Error('Invalid storage operation');
    const touched = operation === 'clear' ? [...keys]
      : operation === 'remove' ? message.keys : Object.keys(message.values || {});
    if (!Array.isArray(touched) || touched.some(key => !keys.has(key))) throw new Error('Invalid storage key');
    const current = await chrome.storage.local.get(message.clearDraft ? [...touched, 'snippetDraft'] : touched);
    for (const key of touched) {
      if (key === 'activeWorkspaceId') continue; // Last-selected view, not user content.
      if (!Object.hasOwn(message.expected || {}, key) || !QuickLaunchStorageValue.matches(message.expected[key], current[key])) {
        const error = new Error('Your data changed in another QuickLaunch window. Reload before saving.');
        error.code = 'CONFLICT';
        throw error;
      }
    }
    if (operation === 'set') {
      const values = { ...message.values };
      // Clear only this editor's draft, atomically with the new saved snippet.
      if (message.clearDraft && encode(current.snippetDraft) === encode(message.clearDraft)) values.snippetDraft = null;
      await chrome.storage.local.set(values);
    }
    else if (operation === 'remove') await chrome.storage.local.remove(touched);
    else await chrome.storage.local.clear();
    return { ok: true };
  }
  return { run, commit, encode, keys: [...keys] };
})();
