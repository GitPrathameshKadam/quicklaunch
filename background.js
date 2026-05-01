chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menu
  chrome.contextMenus.create({
    id: "add-to-quicklaunch",
    title: "Add to QuickLaunch",
    contexts: ["page"]
  });

  // Initialize Default Data
  chrome.storage.sync.get(['workspaces', 'shortcuts'], (data) => {
    // Migrate old flat shortcuts or set defaults
    if (!data.workspaces) {
      const initialShortcuts = data.shortcuts || [
        { title: "Youtube", url: "https://www.youtube.com" },
        { title: "Gmail", url: "https://mail.google.com" }
      ];
      chrome.storage.sync.set({
        workspaces: [{ id: 'default', name: 'Main', shortcuts: initialShortcuts }],
        activeWorkspace: 'default',
        searchPosition: 'top',
        openInNewTab: true,
        enableWorkspaces: false,
        hotkeyAction: 'launch'
      });
    }
  });
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "add-to-quicklaunch") {
    chrome.storage.sync.get(['workspaces', 'activeWorkspace'], (data) => {
      let workspaces = data.workspaces || [];
      let activeId = data.activeWorkspace || 'default';
      
      let wsIndex = workspaces.findIndex(w => w.id === activeId);
      if (wsIndex === -1) wsIndex = 0; // fallback
      
      if (workspaces[wsIndex]) {
        workspaces[wsIndex].shortcuts.push({ title: tab.title, url: tab.url });
        chrome.storage.sync.set({ workspaces: workspaces });
      }
    });
  }
});
