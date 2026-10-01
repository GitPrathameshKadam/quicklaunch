// background.js — QuickLaunch v2.7
importScripts('backup.js', 'storage-value.js', 'storage-worker.js');

const store = QuickLaunchStoreWorker;
const GROUP_COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

function notify(message) {
  // Notifications gained native Promises in Chrome 116; the callback supports
  // our Chrome 114 minimum and makes OS-level notification denial non-fatal.
  return new Promise(resolve => {
    chrome.notifications.create({ type: 'basic', iconUrl: 'assets/icon128.png', title: 'QuickLaunch', message }, () => {
      if (chrome.runtime.lastError) console.error('QuickLaunch notification:', chrome.runtime.lastError.message);
      resolve();
    });
  }).catch(error => console.error('QuickLaunch notification:', error.message));
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) { console.error(chrome.runtime.lastError.message); return; }
    chrome.contextMenus.create({ id: 'add-to-quicklaunch', title: 'Add to QuickLaunch', contexts: ['page', 'link'] }, () => {
      if (chrome.runtime.lastError) console.error(chrome.runtime.lastError.message);
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'add-to-quicklaunch') return;
  const url = QuickLaunchBackup.webUrl(info.linkUrl || info.pageUrl || tab?.url);
  if (!url) { notify('Only web pages and web links can be saved.'); return; }
  store.run(async () => {
    const data = await chrome.storage.local.get(['shortcuts', 'settings', 'activeWorkspaceId']);
    const workspaces = QuickLaunchBackup.workspaces(data.settings?.workspaces);
    const workspaceId = workspaces.some(ws => ws.id === data.activeWorkspaceId)
      ? data.activeWorkspaceId : 'w_default';
    const shortcuts = Array.isArray(data.shortcuts) ? data.shortcuts : [];
    if (shortcuts.some(s => s?.url === url && (s.workspaceId || 'w_default') === workspaceId)) {
      return 'This shortcut is already in this workspace.';
    }
    shortcuts.push({ title: info.linkUrl ? new URL(url).hostname : (tab?.title || new URL(url).hostname),
      url, icon: '', workspaceId });
    await chrome.storage.local.set({ shortcuts });
    return 'Shortcut added successfully!';
  }).then(notify).catch(error => {
    console.error('QuickLaunch context menu save:', error.message);
    notify('Could not save the shortcut. Please try again.');
  });
});

async function recordUsage(urls) {
  await store.run(async () => {
    const data = await chrome.storage.local.get(['usageCounts']);
    const usageCounts = QuickLaunchBackup.usageCounts(data.usageCounts);
    urls.forEach(url => { usageCounts[url] = Math.min(Number.MAX_SAFE_INTEGER, (usageCounts[url] || 0) + 1); });
    await chrome.storage.local.set({ usageCounts });
  });
}

async function launch(message) {
  const data = await chrome.storage.local.get(['settings', 'shortcuts']);
  if (message.workspaceId) {
    const ws = QuickLaunchBackup.workspaces(data.settings?.workspaces).find(w => w.id === message.workspaceId);
    if (!ws) throw new Error('This workspace no longer exists. Reload QuickLaunch.');
    const list = (Array.isArray(data.shortcuts) ? data.shortcuts : []).filter(s =>
      s?.workspaceId === ws.id || (!s?.workspaceId && ws.id === 'w_default'))
      .filter(s => s && QuickLaunchBackup.webUrl(s.url));
    if (!list.length) throw new Error('No shortcuts in this workspace.');
    if (list.length > 10 && !message.confirmed) throw new Error('Confirm opening more than 10 shortcuts.');
    const window = await chrome.windows.getLastFocused();
    const ids = [];
    const opened = [];
    // Limit simultaneous tab creation and preserve the workspace's saved order.
    for (const shortcut of list) {
      try {
        const tab = await chrome.tabs.create({ url: shortcut.url, active: false, windowId: window.id });
        ids.push(tab.id);
        opened.push(shortcut.url);
      } catch (error) { console.error('QuickLaunch tab creation:', error.message); }
    }
    if (!ids.length) throw new Error('Could not open the workspace. Please try again.');
    const warnings = opened.length !== list.length ? [`Opened ${opened.length} of ${list.length} shortcuts.`] : [];
    try {
      const groupId = await chrome.tabs.group({ tabIds: ids });
      const index = Math.max(0, QuickLaunchBackup.workspaces(data.settings?.workspaces).findIndex(w => w.id === ws.id));
      await chrome.tabGroups.update(groupId, { title: ws.name, color: GROUP_COLORS[index % GROUP_COLORS.length] });
    } catch { warnings.push('Shortcuts opened, but Chrome could not group them.'); }
    try { await recordUsage(opened); }
    catch { warnings.push('Shortcuts opened, but usage counts could not be saved.'); }
    const warning = warnings.join(' ');
    if (warning) await notify(warning);
    return { ok: true, warning };
  }
  const url = QuickLaunchBackup.webUrl(message.url);
  if (!url) throw new Error('Enter a valid web URL.');
  if (data.settings?.openInNewTab === false) {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs[0]) await chrome.tabs.update(tabs[0].id, { url });
    else await chrome.tabs.create({ url });
  } else await chrome.tabs.create({ url });
  try { await recordUsage([url]); }
  catch { await notify('Shortcut opened, but its usage count could not be saved.'); }
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  // No externally reachable mutation/launch interface and no content scripts.
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
  if (!message || !['storage', 'launch', 'draft'].includes(message.type)) return false;
  const operation = message.type === 'storage' ? store.run(() => store.commit(message))
    : message.type === 'draft' ? store.run(async () => {
      if (!message.value || !['title', 'text', 'tags'].every(key => typeof message.value[key] === 'string')) throw new Error('Invalid draft');
      const { title, text, tags } = message.value;
      await chrome.storage.local.set({ snippetDraft: { title, text, tags } });
      return { ok: true };
    }) : launch(message);
  operation.then(respond, error => respond({ ok: false, error: error.message, code: error.code || 'FAILED' }));
  return true; // Keep the message and its worker alive after the popup closes.
});
