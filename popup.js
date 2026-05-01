// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('gridContainer');
  const searchInput = document.getElementById('searchInput');
  const settingsBtn = document.getElementById('settingsBtn');
  const quickAddBtn = document.getElementById('quickAddBtn');
  const emptyState = document.getElementById('emptyState');
  const addFirstBtn = document.getElementById('addFirstShortcutBtn');
  const quickAddToast = document.getElementById('quickAddToast');
  const qaIcon = document.getElementById('qaIcon');
  const qaTitle = document.getElementById('qaTitle');
  const qaUrl = document.getElementById('qaUrl');
  const qaCancelBtn = document.getElementById('qaCancelBtn');
  const qaConfirmBtn = document.getElementById('qaConfirmBtn');

  let settings = {
    rows: 4,
    cols: 4,
    showTitles: true,
    fontSize: 12,
    gridGap: 16,
    theme: 'dark',
    popupWidth: 380,
    iconShape: 'circle',
    iconSize: 48,
    accentColor: '',
    openInNewTab: true,
  };

  let shortcuts = [];
  let currentTabInfo = null;
  let focusedIndex = -1;

  // ── Apply theme (supports 'system') ──────────────────────────────────────
  function applyTheme(theme) {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  // Listen for OS theme changes when set to 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'system') applyTheme('system');
  });

  // ── Apply all settings to DOM ─────────────────────────────────────────────
  function applySettings() {
    applyTheme(settings.theme);

    document.documentElement.style.setProperty('--grid-gap', `${settings.gridGap}px`);
    document.documentElement.style.setProperty('--icon-size', `${settings.iconSize}px`);
    document.documentElement.style.setProperty('--icon-img-size', `${Math.round(settings.iconSize * 0.58)}px`);

    // Icon shape
    const shapeMap = { circle: '50%', rounded: '14px', square: '4px' };
    document.documentElement.style.setProperty('--icon-radius', shapeMap[settings.iconShape] || '50%');

    // Popup width
    document.body.style.width = `${settings.popupWidth}px`;

    // Custom accent color
    if (settings.accentColor) {
      document.documentElement.style.setProperty('--accent-color', settings.accentColor);
    }
  }

  // ── Load from storage ─────────────────────────────────────────────────────

  chrome.storage.local.get(['settings', 'shortcuts', 'searchPosition'], (result) => {
    if (result.settings) {
      settings = { ...settings, ...result.settings };
    }
    if (result.shortcuts) {
      shortcuts = result.shortcuts;
    }
    
    // Apply search position
    if (result.searchPosition === 'bottom') {
      document.getElementById('app-container').classList.add('search-bottom');
    }

    // Apply theme and grid gap
    applySettings();
    renderGrid(shortcuts);
  });

  // ── Render grid ───────────────────────────────────────────────────────────
  function renderGrid(dataToRender) {
    gridContainer.innerHTML = '';
    focusedIndex = -1;

    if (dataToRender.length === 0 && searchInput.value.trim() === '') {
      gridContainer.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    gridContainer.style.display = 'grid';
    emptyState.style.display = 'none';
    gridContainer.style.gridTemplateColumns = `repeat(${settings.cols}, minmax(0, 1fr))`;

    if (!settings.showTitles) {
      gridContainer.classList.add('hide-titles');
    } else {
      gridContainer.classList.remove('hide-titles');
    }

    const maxItems = settings.rows * settings.cols;
    const itemsToDisplay = searchInput.value.trim() === ''
      ? dataToRender.slice(0, maxItems)
      : dataToRender;

    itemsToDisplay.forEach((shortcut, i) => {
      const a = document.createElement('a');
      a.className = 'shortcut-item';
      a.href = shortcut.url;
      a.tabIndex = 0;
      a.dataset.index = i;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        openShortcut(shortcut.url);
      });

      a.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openShortcut(shortcut.url);
        }
      });

      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'icon-wrapper';

      if (shortcut.icon) {
        const img = document.createElement('img');
        img.className = 'shortcut-icon';
        img.src = shortcut.icon;
        img.onerror = () => {
          img.style.display = 'none';
          iconWrapper.innerHTML = `<span class="fallback-icon">${(shortcut.title || '?').charAt(0)}</span>`;
        };
        iconWrapper.appendChild(img);
      } else {
        const letter = document.createElement('span');
        letter.className = 'fallback-icon';
        letter.textContent = shortcut.title ? shortcut.title.charAt(0) : '?';
        iconWrapper.appendChild(letter);
      }

      const title = document.createElement('div');
      title.className = 'shortcut-title';
      title.textContent = shortcut.title;
      title.style.fontSize = `${settings.fontSize}px`;

      a.appendChild(iconWrapper);
      a.appendChild(title);
      gridContainer.appendChild(a);
    });
  }

  function openShortcut(url) {
    if (settings.openInNewTab) {
      chrome.tabs.create({ url });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url });
        } else {
          chrome.tabs.create({ url });
        }
      });
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query === '') {
      renderGrid(shortcuts);
    } else {
      const filtered = shortcuts.filter(s =>
        s.title.toLowerCase().includes(query) || s.url.toLowerCase().includes(query)
      );
      renderGrid(filtered);
    }
  });

  // ── Keyboard navigation (arrow keys on grid) ──────────────────────────────
  document.addEventListener('keydown', (e) => {
    const items = [...gridContainer.querySelectorAll('.shortcut-item')];
    if (!items.length) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Only intercept arrows when search is empty or after leaving search
      if (document.activeElement === searchInput && (e.key === 'ArrowDown')) {
        e.preventDefault();
        focusedIndex = 0;
        items[0].focus();
        return;
      }

      if (!items.includes(document.activeElement)) return;

      e.preventDefault();
      const cols = settings.cols;

      if (e.key === 'ArrowRight') focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
      else if (e.key === 'ArrowLeft') focusedIndex = Math.max(focusedIndex - 1, 0);
      else if (e.key === 'ArrowDown') focusedIndex = Math.min(focusedIndex + cols, items.length - 1);
      else if (e.key === 'ArrowUp') {
        if (focusedIndex - cols < 0) {
          searchInput.focus();
          focusedIndex = -1;
          return;
        }
        focusedIndex = Math.max(focusedIndex - cols, 0);
      }

      items[focusedIndex].focus();
    }

    // Typing anywhere refocuses search
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && document.activeElement !== searchInput) {
      searchInput.focus();
    }
  });

  // ── Quick Add current tab ─────────────────────────────────────────────────
  quickAddBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      const tab = tabs[0];
      currentTabInfo = {
        title: tab.title || new URL(tab.url).hostname,
        url: tab.url,
        icon: tab.favIconUrl || '',
      };

      qaIcon.src = currentTabInfo.icon;
      qaIcon.style.display = currentTabInfo.icon ? 'block' : 'none';
      qaTitle.textContent = currentTabInfo.title;
      qaUrl.textContent = currentTabInfo.url;
      quickAddToast.style.display = 'block';
    });
  });

  qaConfirmBtn.addEventListener('click', () => {
    if (!currentTabInfo) return;

    // Check if URL already exists
    const exists = shortcuts.some(s => {
      try {
        return new URL(s.url).hostname === new URL(currentTabInfo.url).hostname;
      } catch { return false; }
    });

    if (exists) {
      quickAddToast.style.display = 'none';
      showPopupToast('Already in your shortcuts!');
      return;
    }

    shortcuts.push(currentTabInfo);
    chrome.storage.local.set({ shortcuts }, () => {
      quickAddToast.style.display = 'none';
      renderGrid(shortcuts);
      showPopupToast('Shortcut added!');
    });
  });

  qaCancelBtn.addEventListener('click', () => {
    quickAddToast.style.display = 'none';
  });

  // ── Settings / navigation ─────────────────────────────────────────────────
  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  addFirstBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

  // ── Popup toast ───────────────────────────────────────────────────────────
  function showPopupToast(msg) {
    let t = document.getElementById('popupToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'popupToast';
      t.className = 'popup-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  setTimeout(() => searchInput.focus(), 80);
});
