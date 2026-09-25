// popup.js — QuickLaunch v2.6

document.addEventListener('DOMContentLoaded', () => {
  // ── DOM refs ───────────────────────────────────────────────────────────────
  const gridContainer   = document.getElementById('gridContainer');
  const searchInput     = document.getElementById('searchInput');
  const workspaceTabs   = document.getElementById('workspaceTabs');
  const settingsBtn     = document.getElementById('settingsBtn');
  const openGroupBtn    = document.getElementById('openGroupBtn');
  const quickAddBtn     = document.getElementById('quickAddBtn');
  const editBtn         = document.getElementById('editBtn');
  const editBanner      = document.getElementById('editBanner');
  const sortBtn         = document.getElementById('sortBtn');
  const exportBtn       = document.getElementById('exportBtn');
  const importBtn       = document.getElementById('importBtn');
  const importFileInput = document.getElementById('importFileInput');
  const emptyState      = document.getElementById('emptyState');
  const addFirstBtn     = document.getElementById('addFirstShortcutBtn');
  const quickAddToast   = document.getElementById('quickAddToast');
  const qaIcon          = document.getElementById('qaIcon');
  const qaTitle         = document.getElementById('qaTitle');
  const qaUrl           = document.getElementById('qaUrl');
  const qaCancelBtn     = document.getElementById('qaCancelBtn');
  const qaConfirmBtn    = document.getElementById('qaConfirmBtn');

  // Edit sheet refs
  const editShortcutSheet = document.getElementById('editShortcutSheet');
  const editSheetTitle  = document.getElementById('editSheetTitle');
  const editSheetUrl    = document.getElementById('editSheetUrl');
  const editSheetCancel = document.getElementById('editSheetCancel');
  const editSheetSave   = document.getElementById('editSheetSave');

  const searchClearBtn  = document.getElementById('searchClearBtn');

  // Snippets refs
  const modeShortcutsBtn  = document.getElementById('modeShortcutsBtn');
  const modeSnippetsBtn   = document.getElementById('modeSnippetsBtn');
  const snippetsContainer = document.getElementById('snippetsContainer');
  const snippetEditSheet  = document.getElementById('snippetEditSheet');
  const snippetEditTitle  = document.getElementById('snippetEditTitle');
  const snippetEditText   = document.getElementById('snippetEditText');
  const snippetEditCancel = document.getElementById('snippetEditCancel');
  const snippetEditSave   = document.getElementById('snippetEditSave');

  let currentlyEditingGlobalIndex = -1;
  let currentlyEditingSnippetId = null;

  function openEditSheet(shortcut, globalIndex) {
    currentlyEditingGlobalIndex = parseInt(globalIndex);
    editSheetTitle.value = shortcut.title;
    editSheetUrl.value = shortcut.url;
    editShortcutSheet.style.display = 'block';
  }

  editSheetCancel.addEventListener('click', () => {
    editShortcutSheet.style.display = 'none';
  });

  editSheetSave.addEventListener('click', () => {
    if (currentlyEditingGlobalIndex === -1) return;
    const newTitle = editSheetTitle.value.trim();
    let newUrl = editSheetUrl.value.trim();

    if (!newTitle || !newUrl) {
      showPopupToast('Title and URL are required', 'error');
      return;
    }
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      newUrl = 'https://' + newUrl;
    }
    if (!isWebUrl(newUrl)) {
      showPopupToast('Enter a valid web URL', 'error');
      return;
    }

    const target = shortcuts[currentlyEditingGlobalIndex];
    if (target) {
      target.title = newTitle;
      target.url = newUrl;
      saveShortcuts(() => {
        editShortcutSheet.style.display = 'none';
        renderGrid();
        showPopupToast('Shortcut updated');
      });
    }
  });

  // ── State ──────────────────────────────────────────────────────────────────
  let settings = {
    rows: 4, cols: 4, showTitles: true, fontSize: 12, gridGap: 16,
    theme: 'dark', popupWidth: 380, iconShape: 'circle', iconSize: 48,
    accentColor: '', openInNewTab: true, showBadges: true, hotkeyAction: 'launch',
    workspaces: []
  };

  let shortcuts      = [];
  let snippets       = [];
  let usageCounts    = {}; 
  let sortMode       = 'manual'; 
  let currentTabInfo = null;
  let focusedIndex   = -1;
  let isEditMode     = false;
  let activeWorkspaceId = 'w_default';
  let appMode        = 'shortcuts'; // 'shortcuts' or 'snippets'

  function isWebUrl(value) {
    try {
      const url = new URL(value);
      return (url.protocol === 'https:' || url.protocol === 'http:') && !!url.hostname;
    } catch { return false; }
  }

  function selectWorkspace(id, focusTab = false) {
    activeWorkspaceId = id;
    chrome.storage.local.set({ activeWorkspaceId: id });
    renderTabs();
    renderGrid();
    if (focusTab) workspaceTabs.querySelector('.ws-tab.active')?.focus();
  }

  // ── Icons ──────────────────────────────────────────────────────────────────
  // Resolved from Chrome's own favicon cache via the `favicon` permission — a
  // chrome-extension:// URL that costs no network request. Legacy remote icon
  // values (Google s2 URLs, tab favIconUrls) are deliberately ignored: rendering
  // them pinged a third party every time the popup opened, leaking the user's
  // saved domains. Old values stay in storage but are inert.
  function getIconUrl(shortcut) {
    if (typeof shortcut.icon === 'string' && /^data:image\/(?:png|jpeg|gif|webp|bmp);base64,/i.test(shortcut.icon)) return shortcut.icon;
    if (!shortcut.url) return '';
    return chrome.runtime.getURL(
      `/_favicon/?pageUrl=${encodeURIComponent(shortcut.url)}&size=64`
    );
  }

  // ── Theme ──────────────────────────────────────────────────────────────────
  function applyTheme(theme) {
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'system') applyTheme('system');
  });

  // ── Apply settings ─────────────────────────────────────────────────────────
  function applySettings() {
    applyTheme(settings.theme);
    document.documentElement.style.setProperty('--grid-gap',      `${settings.gridGap}px`);
    document.documentElement.style.setProperty('--icon-size',     `${settings.iconSize}px`);
    document.documentElement.style.setProperty('--icon-img-size', `${Math.round(settings.iconSize * 0.58)}px`);
    const shapeMap = { circle: '50%', rounded: '14px', square: '4px' };
    document.documentElement.style.setProperty('--icon-radius', shapeMap[settings.iconShape] || '50%');
    document.body.style.width = `${settings.popupWidth}px`;
    if (settings.accentColor) {
      document.documentElement.style.setProperty('--accent-color', settings.accentColor);
    }
  }

  // ── Load from storage ──────────────────────────────────────────────────────
  chrome.storage.local.get(['settings', 'shortcuts', 'snippets', 'searchPosition', 'usageCounts', 'sortMode', 'activeWorkspaceId'], (result) => {
    if (chrome.runtime.lastError) console.error('Storage read error:', chrome.runtime.lastError);

    settings = QuickLaunchBackup.settings(result.settings, settings);
    const workspaceIds = new Set(settings.workspaces.map(w => w.id));
    shortcuts = QuickLaunchBackup.shortcuts(result.shortcuts, workspaceIds);
    snippets = QuickLaunchBackup.snippets(result.snippets);
    usageCounts = QuickLaunchBackup.usageCounts(result.usageCounts);
    if (SORT_MODES.includes(result.sortMode)) sortMode = result.sortMode;

    if (result.searchPosition === 'bottom') {
      document.getElementById('app-container').classList.add('search-bottom');
    }

    activeWorkspaceId = workspaceIds.has(result.activeWorkspaceId)
      ? result.activeWorkspaceId : 'w_default';

    applySettings();
    updateSortBtn();
    updateModeButtons();
    renderTabs();
    renderGrid();
  });

  // ── Save helpers ───────────────────────────────────────────────────────────
  function saveShortcuts(cb) {
    chrome.storage.local.set({ shortcuts }, () => {
      if (chrome.runtime.lastError) {
        console.error('Save shortcuts error:', chrome.runtime.lastError);
        showPopupToast('Could not save shortcuts. Storage may be full.', 'error');
        return;
      }
      updateModeButtons();
      renderTabs();
      if (typeof cb === 'function') cb();
    });
  }

  function saveSnippets(cb) {
    chrome.storage.local.set({ snippets }, () => {
      if (chrome.runtime.lastError) {
        console.error('Save snippets error:', chrome.runtime.lastError);
        showPopupToast('Could not save snippet. Storage may be full.', 'error');
        return;
      }
      updateModeButtons();
      if (typeof cb === 'function') cb();
    });
  }

  // Saved immediately — a debounce timer dies when the popup closes right
  // after a launch, which silently dropped the count update.
  function saveUsageCounts() {
    chrome.storage.local.set({ usageCounts }, () => {
      if (chrome.runtime.lastError) console.error('Save usage error:', chrome.runtime.lastError);
    });
  }

  function saveSortMode() {
    chrome.storage.local.set({ sortMode }, () => {
      if (chrome.runtime.lastError) console.error('Save sortMode error:', chrome.runtime.lastError);
    });
  }

  // ── Mode button counts ─────────────────────────────────────────────────────
  function updateModeButtons() {
    const sc = shortcuts.length;
    const sn = snippets.length;
    modeShortcutsBtn.textContent = sc > 0 ? `Shortcuts (${sc})` : 'Shortcuts';
    modeSnippetsBtn.textContent  = sn > 0 ? `Snippets (${sn})`  : 'Snippets';
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────
  function renderTabs() {
    if (!settings.workspaces.some(w => w.id === activeWorkspaceId)) {
      activeWorkspaceId = settings.workspaces[0].id;
    }
    if (settings.workspaces.length <= 1) {
      workspaceTabs.style.display = 'none';
      return;
    }
    workspaceTabs.style.display = 'flex';
    workspaceTabs.innerHTML = '';

    settings.workspaces.forEach(ws => {
      const count = shortcuts.filter(s => (s.workspaceId || 'w_default') === ws.id).length;
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `ws-tab ${ws.id === activeWorkspaceId ? 'active' : ''}`;
      tab.textContent = count > 0 ? `${ws.name} (${count})` : ws.name;
      tab.setAttribute('aria-pressed', String(ws.id === activeWorkspaceId));
      tab.addEventListener('click', () => selectWorkspace(ws.id, true));
      workspaceTabs.appendChild(tab);
    });
  }

  // ── Search & Sort ──────────────────────────────────────────────────────────
  function fuzzyMatch(query, text) {
    let qIdx = 0;
    let tIdx = 0;
    while (qIdx < query.length && tIdx < text.length) {
      if (query[qIdx] === text[tIdx]) qIdx++;
      tIdx++;
    }
    return qIdx === query.length;
  }

  const SORT_MODES   = ['manual', 'most-used', 'az'];
  const SORT_LABELS  = { manual: 'Sort: Manual', 'most-used': 'Sort: Most Used', az: 'Sort: A – Z' };

  function getDisplayList() {
    const query = searchInput.value.trim().toLowerCase();
    const isSearching = query !== '' && !isEditMode;
    const maxItems = settings.rows * settings.cols;

    const workspaceShortcuts = shortcuts.filter(s => (s.workspaceId || 'w_default') === activeWorkspaceId);

    if (isSearching) {
      // Global string search across all workspaces
      const globalMatches = shortcuts.filter(s =>
        fuzzyMatch(query, s.title.toLowerCase()) || fuzzyMatch(query, s.url.toLowerCase())
      );

      // Inject exact hotkey match from the currently viewed workspace
      const numQuery = parseInt(query);
      let targetIndex = -1;
      if (!isNaN(numQuery)) {
        if (numQuery >= 1 && numQuery <= 9) targetIndex = numQuery - 1;
        else if (numQuery === 0) targetIndex = 9;
      }
      
      if (targetIndex !== -1 && targetIndex < workspaceShortcuts.length) {
        const hotkeyTarget = workspaceShortcuts[targetIndex];
        if (!globalMatches.includes(hotkeyTarget)) {
          globalMatches.unshift(hotkeyTarget);
        }
      }
      return globalMatches;
    } else {
      // Sort the whole workspace BEFORE truncating to the grid — slicing first
      // meant "Most Used" only ranked the first rows×cols items in manual order,
      // so a heavily-used shortcut further down could never reach the grid.
      let base = [...workspaceShortcuts];
      if (sortMode !== 'manual') {
        base.sort((a, b) => {
          if (sortMode === 'most-used') return (usageCounts[b.url] || 0) - (usageCounts[a.url] || 0);
          if (sortMode === 'az') return a.title.localeCompare(b.title);
          return 0;
        });
      }
      // In edit mode show ALL shortcuts so the user can reorder/manage every item
      return isEditMode ? base : base.slice(0, maxItems);
    }
  }

  function updateSortBtn() {
    sortBtn.setAttribute('data-mode', sortMode);
    sortBtn.title = SORT_LABELS[sortMode];
    sortBtn.setAttribute('aria-label', SORT_LABELS[sortMode]);
  }

  sortBtn.addEventListener('click', () => {
    const idx = SORT_MODES.indexOf(sortMode);
    sortMode = SORT_MODES[(idx + 1) % SORT_MODES.length];
    updateSortBtn();
    saveSortMode();
    renderGrid();
    showPopupToast(SORT_LABELS[sortMode]);
  });

  // ── Mode Switcher ──────────────────────────────────────────────────────────
  function setAppMode(newMode) {
    appMode = newMode;
    modeShortcutsBtn.classList.toggle('active', appMode === 'shortcuts');
    modeSnippetsBtn.classList.toggle('active', appMode === 'snippets');
    
    if (appMode === 'shortcuts') {
      gridContainer.style.display = 'grid'; // will be overridden by renderGrid if needed
      snippetsContainer.style.display = 'none';
      if (settings.workspaces.length > 1) workspaceTabs.style.display = 'flex';
      quickAddBtn.title = 'Add current tab';
      quickAddBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
      sortBtn.style.display = 'flex';
      openGroupBtn.style.display = 'flex';
      renderGrid();
    } else {
      gridContainer.style.display = 'none';
      snippetsContainer.style.display = 'flex';
      workspaceTabs.style.display = 'none';
      quickAddBtn.title = 'Add new snippet';
      quickAddBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
      sortBtn.style.display = 'none';
      openGroupBtn.style.display = 'none';
      renderSnippets();
    }
  }

  modeShortcutsBtn.addEventListener('click', () => setAppMode('shortcuts'));
  modeSnippetsBtn.addEventListener('click', () => setAppMode('snippets'));

  // ── Edit mode ──────────────────────────────────────────────────────────────
  function setEditMode(active) {
    isEditMode = active;
    editBtn.classList.toggle('active', active);
    editBtn.setAttribute('aria-pressed', String(active));
    editBanner.style.display = active ? 'flex' : 'none';
    if (!active && editShortcutSheet) editShortcutSheet.style.display = 'none';
    if (!active && snippetEditSheet) snippetEditSheet.style.display = 'none';
    if (active && searchInput.value.trim() !== '') { searchInput.value = ''; updateSearchClear(); }
    
    document.getElementById('editBannerText').textContent = appMode === 'shortcuts' 
      ? 'Drag to reorder • ✕ remove • tap title to rename'
      : 'Manage snippets';
      
    if (appMode === 'shortcuts') {
      renderGrid();
    } else {
      renderSnippets();
    }
  }

  editBtn.addEventListener('click', () => setEditMode(!isEditMode));

  // ── Delete ─────────────────────────────────────────────────────────────────
  // Takes the exact object, not a URL — the same URL can exist in two
  // workspaces (the options page allows it), and matching by URL deleted
  // whichever copy came first rather than the one the user clicked.
  function deleteShortcut(shortcut) {
    const idx = shortcuts.indexOf(shortcut);
    if (idx === -1) return;
    const url = shortcut.url;
    shortcuts.splice(idx, 1);
    // Only forget the usage count once no copy of this URL remains
    if (usageCounts[url] && !shortcuts.some(s => s.url === url)) {
      delete usageCounts[url];
      saveUsageCounts();
    }
    saveShortcuts(() => renderGrid());
  }

  function deleteSnippet(id) {
    const idx = snippets.findIndex(s => s.id === id);
    if (idx === -1) return;
    snippets.splice(idx, 1);
    saveSnippets(() => renderSnippets());
  }

  // ── Inline rename ──────────────────────────────────────────────────────────
  function makeRenameTarget(titleEl, shortcut) {
    titleEl.addEventListener('click', (e) => {
      if (!isEditMode) return;
      const parentA = titleEl.closest('.shortcut-item');
      if (parentA && parentA.dataset.dragged === 'true') {
        parentA.removeAttribute('data-dragged');
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      activateRename(titleEl, shortcut);
    });
  }

  function activateRename(titleEl, shortcut) {
    if (titleEl.dataset.renaming) return; 
    titleEl.dataset.renaming = '1';

    const original = shortcut.title;

    const parentA = titleEl.closest('.shortcut-item');
    if (parentA) parentA.draggable = false;

    titleEl.contentEditable = 'true';
    titleEl.classList.add('renaming');
    titleEl.focus();

    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function commit() {
      const newTitle = titleEl.textContent.trim();
      titleEl.contentEditable = 'false';
      titleEl.classList.remove('renaming');
      delete titleEl.dataset.renaming;
      if (parentA && sortMode === 'manual') parentA.draggable = false;

      if (newTitle && newTitle !== original) {
        shortcut.title = newTitle;
        saveShortcuts();
        const fallback = parentA && parentA.querySelector('.fallback-icon');
        if (fallback) fallback.textContent = newTitle.charAt(0);
      } else {
        titleEl.textContent = original; 
      }
    }

    function revert() {
      titleEl.textContent = original;
      titleEl.contentEditable = 'false';
      titleEl.classList.remove('renaming');
      delete titleEl.dataset.renaming;
      if (parentA && sortMode === 'manual') parentA.draggable = false;
    }

    function onKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEl.removeEventListener('keydown', onKey);
        titleEl.removeEventListener('blur', onBlur);
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        titleEl.removeEventListener('keydown', onKey);
        titleEl.removeEventListener('blur', onBlur);
        revert();
      }
    }

    function onBlur() {
      titleEl.removeEventListener('blur', onBlur);
      titleEl.removeEventListener('keydown', onKey);
      commit();
    }

    titleEl.addEventListener('keydown', onKey);
    titleEl.addEventListener('blur', onBlur, { once: true });
  }

  // ── Render grid ────────────────────────────────────────────────────────────
  function renderGrid() {
    gridContainer.innerHTML = '';
    focusedIndex = -1;

    const query      = searchInput.value.trim().toLowerCase();
    const isSearching = query !== '' && !isEditMode;
    const list       = getDisplayList();

    if (list.length === 0 && !isSearching) {
      gridContainer.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    gridContainer.style.display = 'grid';
    emptyState.style.display = 'none';
    gridContainer.style.gridTemplateColumns = `repeat(${settings.cols}, minmax(0, 1fr))`;
    gridContainer.classList.toggle('hide-titles', !settings.showTitles);

    const gridFrag = document.createDocumentFragment();
    list.forEach((shortcut, displayIndex) => {
      const a = document.createElement('a');
      a.className = 'shortcut-item';
      a.href = shortcut.url;
      a.tabIndex = 0;
      a.dataset.index = displayIndex;
      a.dataset.globalIndex = shortcuts.indexOf(shortcut);
      a.style.animationDelay = `${displayIndex * 0.025}s`;

      if (isEditMode) {
        a.classList.add('edit-mode');
        a.draggable = false;
        a.addEventListener('click', e => e.preventDefault());
      } else {
        a.addEventListener('click', e => { e.preventDefault(); openShortcut(shortcut.url); });
        a.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openShortcut(shortcut.url); }
        });
        
        a.addEventListener('contextmenu', e => {
          e.preventDefault();
          navigator.clipboard.writeText(shortcut.url).then(() => {
            showPopupToast('URL copied to clipboard!');
          }).catch(() => {
            showPopupToast('Failed to copy URL', 'error');
          });
        });
      }

      // ── Icon ──────────────────────────────────────────────────────────────
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'icon-wrapper';

      const iconSrc = getIconUrl(shortcut);
      if (iconSrc) {
        const img = document.createElement('img');
        img.className = 'shortcut-icon';
        img.src = iconSrc;
        img.draggable = false;
        img.onerror = () => {
          img.style.display = 'none';
          const fallbackSpan = document.createElement('span');
          fallbackSpan.className = 'fallback-icon';
          fallbackSpan.textContent = (shortcut.title || '?').charAt(0);
          iconWrapper.appendChild(fallbackSpan);
        };
        iconWrapper.appendChild(img);
      } else {
        const letter = document.createElement('span');
        letter.className = 'fallback-icon';
        letter.textContent = shortcut.title ? shortcut.title.charAt(0) : '?';
        iconWrapper.appendChild(letter);
      }

      // ── Title ───────────────────────────────────────────────────────────────
      const title = document.createElement('div');
      title.className = 'shortcut-title';
      title.textContent = shortcut.title;
      title.style.fontSize = `${settings.fontSize}px`;

      if (isEditMode) {
        title.classList.add('renameable');
        title.title = 'Click to rename';
        makeRenameTarget(title, shortcut);
      }

      // ── Badges ──────────────────────────────────────────────────────────────
      if (isEditMode) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.title = `Remove ${shortcut.title}`;
        removeBtn.setAttribute('aria-label', `Remove ${shortcut.title}`);
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          deleteShortcut(shortcut);
        });
        a.appendChild(removeBtn);

        const editUrlBtn = document.createElement('button');
        editUrlBtn.className = 'edit-action-btn edit-url-btn';
        editUrlBtn.title = 'Edit Title & URL';
        editUrlBtn.setAttribute('aria-label', `Edit ${shortcut.title}`);
        editUrlBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
        editUrlBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          openEditSheet(shortcut, a.dataset.globalIndex);
        });
        a.appendChild(editUrlBtn);
      } else {
        if (displayIndex < 10 && settings.showBadges !== false) {
          const badge = document.createElement('div');
          badge.className = 'hotkey-badge';
          badge.textContent = displayIndex === 9 ? '0' : (displayIndex + 1).toString();
          a.appendChild(badge);
        }
      }

      // ── Usage count pip ───────────────────────────────────────────────────
      if (!isEditMode && sortMode === 'most-used' && (usageCounts[shortcut.url] || 0) > 0) {
        const pip = document.createElement('div');
        pip.className = 'usage-pip';
        pip.title = `Opened ${usageCounts[shortcut.url]} time${usageCounts[shortcut.url] === 1 ? '' : 's'}`;
        pip.textContent = usageCounts[shortcut.url] > 99 ? '99+' : usageCounts[shortcut.url];
        a.appendChild(pip);
      }

      // ── Drag & Drop (pointer-based — native DnD closes the extension popup) ──
      if (isEditMode) {
        if (sortMode === 'manual') {
          a.classList.add('draggable');

          a.addEventListener('pointerdown', e => {
            // Ignore right-click, active renaming, and clicks on the remove button
            if (e.button !== 0) return;
            if (a.querySelector('[data-renaming]')) return;
            if (e.target.closest('.remove-btn')) return;

            const fromIdx = parseInt(a.dataset.globalIndex);
            const startX  = e.clientX;
            const startY  = e.clientY;
            let dragging  = false;
            let dropTarget = null;

            let scrollInterval = null;
            let lastClientX = e.clientX;
            let lastClientY = e.clientY;

            const startAutoScroll = (container, speed) => {
              if (scrollInterval) clearInterval(scrollInterval);
              scrollInterval = setInterval(() => {
                container.scrollTop += speed;
                // Re-evaluate drop target under the stationary mouse since items scrolled
                hitTest(lastClientX, lastClientY);
              }, 16);
            };

            const stopAutoScroll = () => {
              if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
              }
            };

            const hitTest = (clientX, clientY) => {
              // Temporarily hide source and make it non-hit-testable
              a.style.opacity = '0.01';
              a.style.pointerEvents = 'none';
              const below = document.elementFromPoint(clientX, clientY);
              a.style.opacity = '';
              a.style.pointerEvents = '';
              const over = below ? below.closest('.shortcut-item') : null;
              if (over !== dropTarget) {
                if (dropTarget) dropTarget.classList.remove('drag-over');
                dropTarget = (over && over !== a) ? over : null;
                if (dropTarget) dropTarget.classList.add('drag-over');
              }
            };

            const onMove = ev => {
              lastClientX = ev.clientX;
              lastClientY = ev.clientY;

              if (!dragging) {
                // Only start drag after moving 8px (avoids accidental drags on click)
                if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) return;
                dragging = true;
                a.classList.add('dragging');
              }

              hitTest(ev.clientX, ev.clientY);

              // Auto-scroll grid container when dragging near boundaries
              const rect = gridContainer.getBoundingClientRect();
              const threshold = 40;
              const maxSpeed = 12;
              if (ev.clientY < rect.top + threshold) {
                const ratio = (rect.top + threshold - ev.clientY) / threshold;
                startAutoScroll(gridContainer, -maxSpeed * Math.min(ratio, 1.5));
              } else if (ev.clientY > rect.bottom - threshold) {
                const ratio = (ev.clientY - (rect.bottom - threshold)) / threshold;
                startAutoScroll(gridContainer, maxSpeed * Math.min(ratio, 1.5));
              } else {
                stopAutoScroll();
              }
            };

            const onUp = () => {
              stopAutoScroll();
              document.removeEventListener('pointermove', onMove);
              document.removeEventListener('pointerup', onUp);
              document.removeEventListener('pointercancel', onCancel);
              a.classList.remove('dragging');
              document.querySelectorAll('.shortcut-item').forEach(el => el.classList.remove('drag-over'));

              if (dragging) {
                a.dataset.dragged = 'true';
                setTimeout(() => {
                  a.removeAttribute('data-dragged');
                }, 100);

                if (dropTarget) {
                  const toIdx = parseInt(dropTarget.dataset.globalIndex);
                  if (!isNaN(toIdx) && fromIdx !== toIdx) {
                    const [moved] = shortcuts.splice(fromIdx, 1);
                    shortcuts.splice(toIdx, 0, moved);
                    saveShortcuts(() => renderGrid());
                  }
                }
              }
            };

            const onCancel = () => {
              stopAutoScroll();
              document.removeEventListener('pointermove', onMove);
              document.removeEventListener('pointerup', onUp);
              document.removeEventListener('pointercancel', onCancel);
              a.classList.remove('dragging');
              document.querySelectorAll('.shortcut-item').forEach(el => el.classList.remove('drag-over'));
            };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onCancel);
          });
        } else {
          a.title = "Switch to 'Manual' sort to reorder items.";
          a.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            if (e.target.closest('.remove-btn') || e.target.closest('.edit-action-btn')) return;
            showPopupToast("Switch to 'Manual' sort to reorder items.", "error");
          });
        }
      }

      a.appendChild(iconWrapper);
      a.appendChild(title);
      gridFrag.appendChild(a);
    });
    gridContainer.appendChild(gridFrag);
  }

  // ── Open shortcut + track usage ────────────────────────────────────────────
  function openShortcut(url) {
    if (!isWebUrl(url)) return;
    usageCounts[url] = (usageCounts[url] || 0) + 1;
    saveUsageCounts();

    if (settings.openInNewTab) {
      chrome.tabs.create({ url });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) chrome.tabs.update(tabs[0].id, { url });
        else         chrome.tabs.create({ url });
      });
    }
  }

  // ── Open workspace as tab group ────────────────────────────────────────────
  const GROUP_COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

  function openWorkspaceGroup() {
    const list = shortcuts.filter(s =>
      (s.workspaceId || 'w_default') === activeWorkspaceId &&
      isWebUrl(s.url)
    );
    if (list.length === 0) {
      showPopupToast('No shortcuts in this workspace.', 'error');
      return;
    }
    if (list.length > 10 && !confirm(`Open all ${list.length} shortcuts in this workspace?`)) return;

    list.forEach(s => { usageCounts[s.url] = (usageCounts[s.url] || 0) + 1; });
    saveUsageCounts();

    const ws = settings.workspaces.find(w => w.id === activeWorkspaceId);
    const wsIndex = Math.max(0, settings.workspaces.findIndex(w => w.id === activeWorkspaceId));

    Promise.all(list.map(s => new Promise(resolve =>
      chrome.tabs.create({ url: s.url, active: false }, tab => resolve(tab && tab.id))
    ))).then(ids => {
      const tabIds = ids.filter(id => typeof id === 'number');
      if (tabIds.length === 0) { window.close(); return; }
      chrome.tabs.group({ tabIds }, groupId => {
        if (chrome.runtime.lastError || typeof groupId !== 'number') { window.close(); return; }
        chrome.tabGroups.update(groupId, {
          title: ws ? ws.name : 'QuickLaunch',
          color: GROUP_COLORS[wsIndex % GROUP_COLORS.length]
        }, () => window.close());
      });
    });
  }

  openGroupBtn.addEventListener('click', openWorkspaceGroup);

  // ── Search ─────────────────────────────────────────────────────────────────
  function updateSearchClear() {
    const hasValue = searchInput.value.trim() !== '';
    searchClearBtn.style.display = hasValue ? 'flex' : 'none';
    searchInput.classList.toggle('has-value', hasValue);
  }

  let searchDebounce = null;
  searchInput.addEventListener('input', () => {
    if (isEditMode) setEditMode(false);
    updateSearchClear();
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      if (appMode === 'shortcuts') renderGrid();
      else renderSnippets();
    }, 80);
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    updateSearchClear();
    searchInput.focus();
    if (appMode === 'shortcuts') renderGrid();
    else renderSnippets();
  });

  // ── Keyboard navigation ────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isEditMode) { setEditMode(false); return; }

    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
      const wsIndex = parseInt(e.key) - 1;
      if (settings && settings.workspaces && wsIndex >= 0 && wsIndex < settings.workspaces.length) {
        e.preventDefault();
        setAppMode('shortcuts');
        selectWorkspace(settings.workspaces[wsIndex].id);
      }
      return;
    }

    const items = [...gridContainer.querySelectorAll('.shortcut-item')];

    if (['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)) {
      if (document.activeElement === searchInput) {
        if (e.key === 'ArrowDown' && items.length) {
          e.preventDefault(); focusedIndex = 0; items[0].focus(); return;
        }
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && searchInput.value === '') {
          e.preventDefault();
          setAppMode(appMode === 'shortcuts' ? 'snippets' : 'shortcuts');
          return;
        }
      }
      if (!items.includes(document.activeElement)) return;
      e.preventDefault();
      const cols = settings.cols;
      if      (e.key === 'ArrowRight') focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
      else if (e.key === 'ArrowLeft')  focusedIndex = Math.max(focusedIndex - 1, 0);
      else if (e.key === 'ArrowDown')  focusedIndex = Math.min(focusedIndex + cols, items.length - 1);
      else if (e.key === 'ArrowUp') {
        if (focusedIndex - cols < 0) { searchInput.focus(); focusedIndex = -1; return; }
        focusedIndex = Math.max(focusedIndex - cols, 0);
      }
      items[focusedIndex].focus();
    }

    // Hotkey launch 1–9, 0
    const activeTagName = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    const isTypingInInput = activeTagName === 'input' || activeTagName === 'textarea';

    if (!isEditMode && (!isTypingInInput || (document.activeElement === searchInput && settings.hotkeyAction !== 'type'))) {
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 0 && num <= 9 && e.key.trim() !== '') {
        e.preventDefault();
        
        if (settings.hotkeyAction === 'type') {
          searchInput.value += num.toString();
          searchInput.focus();
          searchInput.dispatchEvent(new Event('input'));
        } else {
          if (appMode === 'shortcuts') {
            const list = getDisplayList();
            const targetIndex = num === 0 ? 9 : num - 1;
            if (targetIndex < list.length) {
              openShortcut(list[targetIndex].url);
              window.close();
            }
          } else {
            // Snippets hotkeys
            const query = searchInput.value.trim().toLowerCase();
            let list = snippets;
            if (query !== '') {
              list = snippets.filter(s =>
                fuzzyMatch(query, s.title.toLowerCase()) ||
                fuzzyMatch(query, s.text.toLowerCase()) ||
                (s.tags ? s.tags.some(tag => fuzzyMatch(query, tag.toLowerCase())) : false)
              );
            }
            const targetIndex = num === 0 ? 9 : num - 1;
            if (targetIndex < list.length) {
              copySnippet(list[targetIndex]);
            }
          }
        }
      }
    }

    if (!isEditMode && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !isTypingInInput) {
      searchInput.focus();
    }
  });

  // ── Quick Add ──────────────────────────────────────────────────────────────
  quickAddBtn.addEventListener('click', () => {
    if (isEditMode) setEditMode(false);
    if (appMode === 'shortcuts') {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (chrome.runtime.lastError || !tabs[0]) return;
        const tab = tabs[0];
        if (!isWebUrl(tab.url)) {
          showPopupToast('Cannot add this page type.', 'error'); return;
        }
        currentTabInfo = {
          title: tab.title || new URL(tab.url).hostname,
          url:   tab.url,
          icon:  '', // resolved locally at render time, see getIconUrl()
          workspaceId: activeWorkspaceId
        };
        const previewIcon = getIconUrl(currentTabInfo);
        qaIcon.src = previewIcon;
        qaIcon.style.display = previewIcon ? 'block' : 'none';
        qaTitle.textContent = currentTabInfo.title;
        qaUrl.textContent   = currentTabInfo.url;
        quickAddToast.style.display = 'block';
      });
    } else {
      openSnippetSheet();
    }
  });

  qaConfirmBtn.addEventListener('click', () => {
    if (!currentTabInfo) return;
    const exists = shortcuts.some(s => s.url === currentTabInfo.url);
    if (exists) {
      quickAddToast.style.display = 'none';
      showPopupToast('Already in your shortcuts!', 'info'); return;
    }
    shortcuts.push(currentTabInfo);
    saveShortcuts(() => {
      quickAddToast.style.display = 'none';
      renderGrid();
      showPopupToast('Shortcut added!');
    });
  });

  qaCancelBtn.addEventListener('click', () => {
    quickAddToast.style.display = 'none';
    currentTabInfo = null;
  });

  // ── Markdown sanitizer ─────────────────────────────────────────────────────
  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  // Stop resource tags before they reach innerHTML. Creating a temporary DOM
  // and then removing an <img> is too late: Chrome may start the request first.
  const markdownRenderer = typeof marked !== 'undefined' ? new marked.Renderer() : null;
  if (markdownRenderer) {
    markdownRenderer.html = ({ text }) => escapeHtml(text);
    markdownRenderer.image = ({ text }) => escapeHtml(text || '');
  }

  // Only retain inert Markdown markup. Imported snippets can contain arbitrary
  // HTML; in particular, remote images and CSS URLs would make network requests
  // when a snippet is previewed, even though the extension is local-only.
  function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    const allowed = new Set([
      'P', 'BR', 'STRONG', 'EM', 'B', 'I', 'DEL', 'S', 'CODE', 'PRE',
      'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR', 'H1', 'H2', 'H3', 'H4',
      'H5', 'H6', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'A'
    ]);
    div.querySelectorAll('*').forEach(node => {
      if (!allowed.has(node.tagName)) {
        node.replaceWith(document.createTextNode(node.getAttribute('alt') || node.textContent || ''));
        return;
      }
      const href = node.tagName === 'A' ? node.getAttribute('href') : null;
      for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
      if (href) {
        try {
          const url = new URL(href);
          if (url.protocol === 'https:' || url.protocol === 'http:') {
            node.setAttribute('href', url.href);
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
          }
        } catch { /* Keep the link text without an unsafe destination. */ }
      }
    });
    return div.innerHTML;
  }

  // ── Snippet placeholders ───────────────────────────────────────────────────
  // Expands {{clipboard}}, {{date}}, {{time}}, {{datetime}} at copy time.
  async function expandSnippet(text) {
    const now = new Date();
    let out = text
      .replace(/\{\{date\}\}/gi,     now.toLocaleDateString())
      .replace(/\{\{time\}\}/gi,     now.toLocaleTimeString())
      .replace(/\{\{datetime\}\}/gi, now.toLocaleString());
    if (/\{\{clipboard\}\}/i.test(out)) {
      // clipboardRead is optional so it costs no install-time warning. It cannot
      // be requested from here — chrome.permissions.request() dismisses the
      // popup — so the grant lives on the options page and this only checks.
      const granted = await new Promise(resolve =>
        chrome.permissions.contains({ permissions: ['clipboardRead'] }, resolve)
      );
      let clip = '';
      if (!granted) {
        showPopupToast('Enable clipboard access in Settings to use {{clipboard}}', 'error');
      } else {
        try {
          clip = await navigator.clipboard.readText();
        } catch {
          showPopupToast('Could not read clipboard for {{clipboard}}', 'error');
        }
      }
      out = out.replace(/\{\{clipboard\}\}/gi, clip);
    }
    return out;
  }

  function copySnippet(snippet, onCopied) {
    expandSnippet(snippet.text)
      .then(t => navigator.clipboard.writeText(t))
      .then(() => {
        if (typeof onCopied === 'function') onCopied();
        showPopupToast('Snippet copied to clipboard');
        setTimeout(() => window.close(), 400); // Close shortly after copying
      })
      .catch(() => {
        showPopupToast('Failed to copy snippet', 'error');
      });
  }

  // ── Snippets ───────────────────────────────────────────────────────────────
  function renderSnippets() {
    snippetsContainer.innerHTML = '';
    const query = searchInput.value.trim().toLowerCase();
    
    let displayList = snippets;
    if (query !== '' && !isEditMode) {
      displayList = snippets.filter(s => {
        const titleMatch = fuzzyMatch(query, s.title.toLowerCase());
        const textMatch = fuzzyMatch(query, s.text.toLowerCase());
        const tagsMatch = s.tags ? s.tags.some(tag => fuzzyMatch(query, tag.toLowerCase())) : false;
        return titleMatch || textMatch || tagsMatch;
      });
    }

    if (displayList.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'snippet-empty';
      emptyMsg.textContent = query !== '' ? 'No matching snippets.' : 'No snippets yet. Add one above!';
      snippetsContainer.appendChild(emptyMsg);
      return;
    }

    const snippetFrag = document.createDocumentFragment();
    displayList.forEach((snippet, index) => {
      const el = document.createElement('div');
      el.className = 'snippet-item';
      el.dataset.globalIndex = snippets.indexOf(snippet);
      
      const header = document.createElement('div');
      header.className = 'snippet-header';

      const expandBtn = document.createElement('button');
      expandBtn.className = 'snippet-expand-btn';
      expandBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
      expandBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.toggle('expanded');
      });
      header.appendChild(expandBtn);
      
      const title = document.createElement('div');
      title.className = 'snippet-title';
      title.textContent = snippet.title;
      header.appendChild(title);
      
      const actions = document.createElement('div');
      actions.className = 'snippet-actions';

      const badgeNum = index < 9 ? index + 1 : (index === 9 ? 0 : null);
      if (badgeNum !== null && !isEditMode) {
        const badge = document.createElement('div');
        badge.className = 'snippet-badge';
        badge.textContent = badgeNum;
        actions.appendChild(badge);
      }

      if (isEditMode) {
        const editBtn = document.createElement('button');
        editBtn.className = 'snippet-action-btn edit';
        editBtn.title = 'Edit Snippet';
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
        editBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          openSnippetSheet(snippet);
        });
        actions.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'snippet-action-btn remove';
        removeBtn.innerHTML = '&#10005;';
        removeBtn.title = 'Delete Snippet';
        removeBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          deleteSnippet(snippet.id);
        });
        actions.appendChild(removeBtn);

        el.classList.add('draggable');
        el.addEventListener('pointerdown', e => {
          if (e.button !== 0) return;
          if (e.target.closest('.snippet-action-btn')) return;

          const fromIdx = parseInt(el.dataset.globalIndex);
          const startX = e.clientX;
          const startY = e.clientY;
          let dragging = false;
          let dropTarget = null;

          let scrollInterval = null;
          let lastClientX = e.clientX;
          let lastClientY = e.clientY;

          const startAutoScroll = (container, speed) => {
            if (scrollInterval) clearInterval(scrollInterval);
            scrollInterval = setInterval(() => {
              container.scrollTop += speed;
              hitTest(lastClientX, lastClientY);
            }, 16);
          };

          const stopAutoScroll = () => {
            if (scrollInterval) {
              clearInterval(scrollInterval);
              scrollInterval = null;
            }
          };

          const hitTest = (clientX, clientY) => {
            el.style.opacity = '0.01';
            el.style.pointerEvents = 'none';
            const below = document.elementFromPoint(clientX, clientY);
            el.style.opacity = '';
            el.style.pointerEvents = '';
            const over = below ? below.closest('.snippet-item') : null;
            if (over !== dropTarget) {
              if (dropTarget) dropTarget.classList.remove('drag-over');
              dropTarget = (over && over !== el) ? over : null;
              if (dropTarget) dropTarget.classList.add('drag-over');
            }
          };

          const onMove = ev => {
            lastClientX = ev.clientX;
            lastClientY = ev.clientY;

            if (!dragging) {
              if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) return;
              dragging = true;
              el.classList.add('dragging');
            }
            hitTest(ev.clientX, ev.clientY);

            const rect = snippetsContainer.getBoundingClientRect();
            const threshold = 40;
            const maxSpeed = 12;
            if (ev.clientY < rect.top + threshold) {
              const ratio = (rect.top + threshold - ev.clientY) / threshold;
              startAutoScroll(snippetsContainer, -maxSpeed * Math.min(ratio, 1.5));
            } else if (ev.clientY > rect.bottom - threshold) {
              const ratio = (ev.clientY - (rect.bottom - threshold)) / threshold;
              startAutoScroll(snippetsContainer, maxSpeed * Math.min(ratio, 1.5));
            } else {
              stopAutoScroll();
            }
          };

          const onUp = () => {
            stopAutoScroll();
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onCancel);
            el.classList.remove('dragging');
            document.querySelectorAll('.snippet-item').forEach(e => e.classList.remove('drag-over'));

            if (dragging) {
              el.dataset.dragged = 'true';
              setTimeout(() => {
                el.removeAttribute('data-dragged');
              }, 100);

              if (dropTarget) {
                const toIdx = parseInt(dropTarget.dataset.globalIndex);
                if (!isNaN(toIdx) && fromIdx !== toIdx) {
                  const [moved] = snippets.splice(fromIdx, 1);
                  snippets.splice(toIdx, 0, moved);
                  saveSnippets(() => renderSnippets());
                }
              }
            }
          };

          const onCancel = () => {
            stopAutoScroll();
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onCancel);
            el.classList.remove('dragging');
            document.querySelectorAll('.snippet-item').forEach(e => e.classList.remove('drag-over'));
          };

          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp);
          document.addEventListener('pointercancel', onCancel);
        });
      } else {
        el.addEventListener('click', (e) => {
          if (el.dataset.dragged === 'true') {
            e.preventDefault();
            return;
          }
          copySnippet(snippet, () => el.classList.add('copied'));
        });
      }

      if (actions.children.length > 0) {
        header.appendChild(actions);
      }
      el.appendChild(header);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'snippet-content';

      if (snippet.tags && snippet.tags.length > 0) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'snippet-tags';
        snippet.tags.forEach(tag => {
          const pill = document.createElement('span');
          pill.className = 'tag-pill';
          pill.textContent = tag;
          tagsDiv.appendChild(pill);
        });
        contentDiv.appendChild(tagsDiv);
      }

      const mdDiv = document.createElement('div');
      mdDiv.className = 'snippet-markdown';
      if (typeof marked !== 'undefined') {
        mdDiv.innerHTML = sanitizeHtml(marked.parse(snippet.text, { renderer: markdownRenderer }));
      } else {
        mdDiv.textContent = snippet.text;
      }
      
      if (typeof hljs !== 'undefined') {
        mdDiv.querySelectorAll('pre code').forEach(block => {
          hljs.highlightElement(block);
        });
      }
      contentDiv.appendChild(mdDiv);

      el.appendChild(contentDiv);
      snippetFrag.appendChild(el);
    });
    snippetsContainer.appendChild(snippetFrag);
  }

  function openSnippetSheet(snippet = null) {
    if (snippet) {
      currentlyEditingSnippetId = snippet.id;
      snippetEditTitle.value = snippet.title;
      snippetEditText.value = snippet.text;
      document.getElementById('snippetEditTags').value = snippet.tags ? snippet.tags.join(', ') : '';
      snippetEditSheet.style.display = 'block';
      snippetEditTitle.focus();
    } else {
      currentlyEditingSnippetId = null;
      chrome.storage.local.get(['snippetDraft'], (result) => {
        const draft = result.snippetDraft || { title: '', text: '', tags: '' };
        snippetEditTitle.value = draft.title || '';
        snippetEditText.value = draft.text || '';
        document.getElementById('snippetEditTags').value = draft.tags || '';
        snippetEditSheet.style.display = 'block';
        snippetEditTitle.focus();
      });
    }
  }

  // ── Auto-save snippet drafts ───────────────────────────────────────────────
  let draftSaveTimer = null;
  function scheduleDraftSave() {
    if (currentlyEditingSnippetId) return; // Only save drafts for new snippets
    clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(() => {
      chrome.storage.local.set({
        snippetDraft: {
          title: snippetEditTitle.value,
          text: snippetEditText.value,
          tags: document.getElementById('snippetEditTags').value
        }
      });
    }, 400);
  }
  snippetEditTitle.addEventListener('input', scheduleDraftSave);
  snippetEditText.addEventListener('input', scheduleDraftSave);
  document.getElementById('snippetEditTags').addEventListener('input', scheduleDraftSave);

  snippetEditCancel.addEventListener('click', () => {
    snippetEditSheet.style.display = 'none';
  });

  snippetEditSave.addEventListener('click', () => {
    const newTitle = snippetEditTitle.value.trim();
    const newText = snippetEditText.value.trim();
    const tagsRaw = document.getElementById('snippetEditTags').value;
    const newTags = tagsRaw.split(',').map(t => t.trim()).filter(t => t !== '');

    if (!newTitle || !newText) {
      showPopupToast('Title and Text are required', 'error');
      return;
    }

    const isNewSnippet = !currentlyEditingSnippetId;
    if (currentlyEditingSnippetId) {
      const target = snippets.find(s => s.id === currentlyEditingSnippetId);
      if (target) {
        target.title = newTitle;
        target.text = newText;
        target.tags = newTags;
      }
    } else {
      const id = 'snip_' + Date.now();
      snippets.push({
        id,
        title: newTitle,
        text: newText,
        tags: newTags
      });
      currentlyEditingSnippetId = id;
    }

    saveSnippets(() => {
      if (isNewSnippet) chrome.storage.local.remove('snippetDraft');
      snippetEditSheet.style.display = 'none';
      renderSnippets();
      showPopupToast('Snippet saved');
    });
  });

  // ── Export ─────────────────────────────────────────────────────────────────
  exportBtn.addEventListener('click', () => {
    const payload = {
      version:    '2.6',
      exportedAt: new Date().toISOString(),
      shortcuts,
      snippets,
      settings,
      usageCounts,
      sortMode
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `quicklaunch-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showPopupToast(`Exported ${shortcuts.length} shortcuts, ${snippets.length} snippets`);
  });

  // ── Import ─────────────────────────────────────────────────────────────────
  importBtn.addEventListener('click', () => importFileInput.click());

  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files[0];
    if (!file) return;
    importFileInput.value = ''; 

    const reader = new FileReader();
    reader.onload = e => {
      let parsed;
      try {
        parsed = JSON.parse(e.target.result);
      } catch {
        showPopupToast('Invalid JSON file.', 'error'); return;
      }

      if (!parsed || typeof parsed !== 'object') {
        showPopupToast('Invalid backup file.', 'error'); return;
      }
      const nextWorkspaces = QuickLaunchBackup.workspaces([
        ...settings.workspaces,
        ...(Array.isArray(parsed.settings?.workspaces) ? parsed.settings.workspaces : [])
      ]);
      const validWsIds = new Set(nextWorkspaces.map(w => w.id));
      const incoming = QuickLaunchBackup.shortcuts(parsed.shortcuts, validWsIds);
      const incomingSnippets = QuickLaunchBackup.snippets(parsed.snippets);
      if (!incoming.length && !incomingSnippets.length) {
        showPopupToast('No valid shortcuts or snippets found.', 'error'); return;
      }

      const nextShortcuts = [...shortcuts];
      const nextSnippets = [...snippets];
      let added = 0;
      let addedSnippets = 0;
      for (const item of incoming) {
        if (!nextShortcuts.some(existing => existing.url === item.url)) {
          nextShortcuts.push(item);
          added++;
        }
      }
      for (const item of incomingSnippets) {
        if (!nextSnippets.some(existing => existing.id === item.id)) {
          nextSnippets.push(item);
          addedSnippets++;
        }
      }
      const nextUsageCounts = { ...usageCounts };
      for (const [url, count] of Object.entries(QuickLaunchBackup.usageCounts(parsed.usageCounts))) {
        nextUsageCounts[url] = (nextUsageCounts[url] || 0) + count;
      }
      const nextSortMode = SORT_MODES.includes(parsed.sortMode) ? parsed.sortMode : sortMode;
      const nextSettings = { ...settings, workspaces: nextWorkspaces };
      const workspacesRestored = nextWorkspaces.length > settings.workspaces.length;

      chrome.storage.local.set({
        shortcuts: nextShortcuts, snippets: nextSnippets, settings: nextSettings,
        usageCounts: nextUsageCounts, sortMode: nextSortMode
      }, () => {
        if (chrome.runtime.lastError) {
          showPopupToast('Save failed. Storage may be full.', 'error'); return;
        }
        shortcuts = nextShortcuts;
        snippets = nextSnippets;
        settings = nextSettings;
        usageCounts = nextUsageCounts;
        sortMode = nextSortMode;
        updateSortBtn();
        updateModeButtons();
        renderTabs();
        renderGrid();
        renderSnippets();
        const skipped = incoming.length - added;
        let msg = `Imported ${added} shortcut${added !== 1 ? 's' : ''}, ${addedSnippets} snippet${addedSnippets !== 1 ? 's' : ''}`;
        if (skipped > 0) msg += ` (${skipped} dup skipped)`;
        if (workspacesRestored) msg += ' + workspaces';
        showPopupToast(msg);
      });
    };
    reader.onerror = () => showPopupToast('Could not read file.', 'error');
    reader.readAsText(file);
  });

  // ── Settings / navigation ──────────────────────────────────────────────────
  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  addFirstBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

  document.querySelectorAll('.quick-start-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const title = e.target.dataset.title;
      const url = e.target.dataset.url;
      const exists = shortcuts.some(s => s.url === url);
      if (!exists) {
        shortcuts.push({
          title,
          url,
          icon: '',
          workspaceId: activeWorkspaceId
        });
        saveShortcuts(() => {
          renderGrid();
          showPopupToast(`Added ${title}!`);
        });
      } else {
        showPopupToast(`${title} is already added.`, 'info');
      }
    });
  });

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showPopupToast(msg, type = 'success') {
    let t = document.getElementById('popupToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'popupToast';
      t.className = 'popup-toast';
      document.body.appendChild(t);
    }
    t.textContent  = msg;
    t.dataset.type = type;
    t.classList.add('show');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('show'), 2800);
  }

  requestAnimationFrame(() => searchInput.focus());

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (editShortcutSheet && editShortcutSheet.style.display === 'block') {
        editSheetSave.click();
      } else if (snippetEditSheet && snippetEditSheet.style.display === 'block') {
        snippetEditSave.click();
      } else if (quickAddToast && quickAddToast.style.display === 'block') {
        qaConfirmBtn.click();
      }
    }
    
    if (e.key === 'Escape') {
      if (editShortcutSheet && editShortcutSheet.style.display === 'block') {
        editSheetCancel.click();
      } else if (snippetEditSheet && snippetEditSheet.style.display === 'block') {
        snippetEditCancel.click();
      } else if (quickAddToast && quickAddToast.style.display === 'block') {
        qaCancelBtn.click();
      }
    }
  });
});
