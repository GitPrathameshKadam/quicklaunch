// background.js

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.favIconUrl) {
    chrome.storage.local.get(['shortcuts'], (result) => {
      let shortcuts = result.shortcuts || [];
      let updated = false;

      shortcuts = shortcuts.map(shortcut => {
        try {
          const urlObj = new URL(shortcut.url);
          const tabUrlObj = new URL(tab.url);
          
          const host1 = urlObj.hostname.replace(/^www\./, '');
          const host2 = tabUrlObj.hostname.replace(/^www\./, '');
          
          if (host1 === host2) {
             if (shortcut.icon !== tab.favIconUrl) {
                shortcut.icon = tab.favIconUrl;
                updated = true;
             }
          }
        } catch(e) {
            // invalid URL
        }
        return shortcut;
      });

      if (updated) {
        chrome.storage.local.set({ shortcuts: shortcuts });
      }
    });
  }
});
