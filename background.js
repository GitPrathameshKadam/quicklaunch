// background.js — QuickLaunch v2.1

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-to-quicklaunch',
    title: 'Add to QuickLaunch',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'add-to-quicklaunch') return;

  // Guard: skip extension and chrome:// pages
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  chrome.storage.local.get(['shortcuts'], (data) => {
    if (chrome.runtime.lastError) {
      console.error('QuickLaunch storage error:', chrome.runtime.lastError);
      return;
    }
    const shortcuts = data.shortcuts || [];

    // Prevent duplicate by exact URL
    const exists = shortcuts.some(s => s.url === tab.url);
    if (exists) return;

    shortcuts.push({
      title: tab.title || new URL(tab.url).hostname,
      url: tab.url,
      icon: tab.favIconUrl || '',
    });

    chrome.storage.local.set({ shortcuts }, () => {
      if (chrome.runtime.lastError) {
        console.error('QuickLaunch save error:', chrome.runtime.lastError);
      }
    });
  });
});
