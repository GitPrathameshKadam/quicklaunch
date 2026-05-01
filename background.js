chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menu
  chrome.contextMenus.create({
    id: "add-to-quicklaunch",
    title: "Add to QuickLaunch",
    contexts: ["page"]
  });
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "add-to-quicklaunch") {
    // Note: We use chrome.storage.local instead of chrome.storage.sync 
    // to match the rest of the application's storage architecture (popup.js & options.js)
    chrome.storage.local.get(['shortcuts'], (data) => {
      let shortcuts = data.shortcuts || [];
      
      // Prevent duplicates
      const exists = shortcuts.some(s => s.url === tab.url);
      
      if (!exists) {
        shortcuts.push({ 
          title: tab.title || "New Shortcut", 
          url: tab.url,
          icon: tab.favIconUrl || "" 
        });
        chrome.storage.local.set({ shortcuts: shortcuts });
      }
    });
  }
});