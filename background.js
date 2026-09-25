// background.js — QuickLaunch v2.6

chrome.runtime.onInstalled.addListener(() => {
  // Remove all existing menus first to avoid duplicate ID errors on update/reinstall
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'add-to-quicklaunch',
      title: 'Add to QuickLaunch',
      contexts: ['page', 'link'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'add-to-quicklaunch') return;

  const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) throw new Error('Unsupported URL');
  } catch {
    chrome.notifications.create({
      type: 'basic', iconUrl: 'assets/icon128.png', title: 'QuickLaunch',
      message: 'Only web pages and web links can be saved.'
    });
    return;
  }

  chrome.storage.local.get(['shortcuts', 'settings', 'activeWorkspaceId'], (data) => {
    if (chrome.runtime.lastError) {
      console.error('QuickLaunch storage error:', chrome.runtime.lastError);
      return;
    }
    const shortcuts = Array.isArray(data.shortcuts) ? data.shortcuts : [];
    const workspaces = Array.isArray(data.settings?.workspaces) ? data.settings.workspaces : [];
    const workspaceId = workspaces.some(w => w.id === data.activeWorkspaceId)
      ? data.activeWorkspaceId : (workspaces[0]?.id || 'w_default');

    // Prevent duplicate by exact URL
    const exists = shortcuts.some(s => s.url === targetUrl);
    if (exists) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon128.png',
        title: 'QuickLaunch',
        message: 'This shortcut is already in your grid.'
      });
      return;
    }

    // For a link use its hostname as the title — the page title belongs to the containing page
    const isLink = !!info.linkUrl;
    shortcuts.push({
      title: isLink ? parsedUrl.hostname : (tab?.title || parsedUrl.hostname),
      url: targetUrl,
      // Icons are resolved locally at render time from Chrome's favicon cache.
      // Storing tab.favIconUrl here meant a remote fetch on every popup open.
      icon: '',
      workspaceId
    });

    chrome.storage.local.set({ shortcuts }, () => {
      if (chrome.runtime.lastError) {
        console.error('QuickLaunch save error:', chrome.runtime.lastError);
      } else {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icon128.png',
          title: 'QuickLaunch',
          message: 'Shortcut added successfully!'
        });
      }
    });
  });
});
