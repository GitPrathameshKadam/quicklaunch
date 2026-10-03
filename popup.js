// popup.js — QuickLaunch v2.7

document.addEventListener('DOMContentLoaded', () => {
  // ── DOM refs ───────────────────────────────────────────────────────────────
  const gridContainer   = document.getElementById('gridContainer');
  const searchInput     = document.getElementById('searchInput');
  const searchStatus    = document.getElementById('searchStatus');
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

  let currentlyEditingShortcut = null;
  let currentlyEditingSnippetId = null;
  let addRequest = 0;

  function openEditSheet(shortcut) {
    currentlyEditingShortcut = shortcut;
    editSheetTitle.value = shortcut.title;
    editSheetUrl.value = shortcut.url;
    editShortcutSheet.style.display = 'block';
    editSheetTitle.focus();
  }

  editSheetCancel.addEventListener('click', () => {
    editShortcutSheet.style.display = 'none';
    editBtn.focus();
  });

  editSheetSave.addEventListener('click', () => {
    if (!currentlyEditingShortcut || !shortcuts.includes(currentlyEditingShortcut)) {
      showPopupToast('This shortcut was removed. Reopen the editor.', 'error'); return;
    }
    const newTitle = editSheetTitle.value.trim();
    let newUrl = editSheetUrl.value.trim();

    if (!newTitle || !newUrl) {
      showPopupToast('Title and URL are required', 'error');
      return;
    }
    newUrl = QuickLaunchBackup.inputUrl(newUrl);
    if (!newUrl) { showPopupToast('Enter a valid web URL', 'error'); return; }

    const target = currentlyEditingShortcut;
    if (target) {
      if (shortcuts.some(s => s !== target && s.url === newUrl && s.workspaceId === target.workspaceId)) {
        showPopupToast('This shortcut is already in this workspace.', 'error'); return;
      }
      target.title = newTitle;
      target.url = newUrl;
      saveShortcuts(() => {
        editShortcutSheet.style.display = 'none';
        renderGrid();
        editBtn.focus();
        showPopupToast('Shortcut updated');
      });
    }
  });

  // ── State ──────────────────────────────────────────────────────────────────
  const defaultSettings = {
    rows: 4, cols: 4, showTitles: true, fontSize: 12, gridGap: 16,
    theme: 'dark', popupWidth: 380, iconShape: 'circle', iconSize: 48,
    openInNewTab: true, showBadges: true, hotkeyAction: 'launch', keepOpenAfterCopy: false,
    workspaces: []
  };
  let settings = { ...defaultSettings };

  let shortcuts      = [];
  let snippets       = [];
  let usageCounts    = {}; 
  let sortMode       = 'manual'; 
  let currentTabInfo = null;
  let focusedIndex   = -1;
  let isEditMode     = false;
  let activeWorkspaceId = 'w_default';
  let appMode        = 'shortcuts'; // 'shortcuts' or 'snippets'
  const gridColumns = () => Math.max(1, Math.min(settings.cols,
    Math.floor((settings.popupWidth - 30 + settings.gridGap) / (settings.iconSize + 14 + settings.gridGap))));
  const viewMotions = new WeakMap();
  const dragRecords = new WeakMap();
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
    if (event.matches) [gridContainer, snippetsContainer].forEach(view => viewMotions.get(view)?.cancel());
  });
  function revealView(view) {
    viewMotions.get(view)?.cancel();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof view.animate !== 'function') return;
    viewMotions.set(view, view.animate([
      { opacity: .5, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }));
  }

  function isWebUrl(value) {
    try {
      const url = new URL(value);
      return (url.protocol === 'https:' || url.protocol === 'http:') && !!url.hostname;
    } catch { return false; }
  }

  function selectWorkspace(id, focusTab = false) {
    addRequest++;
    quickAddToast.style.display = 'none';
    currentTabInfo = null;
    activeWorkspaceId = id;
    QuickLaunchStorage.set({ activeWorkspaceId: id });
    renderTabs();
    renderGrid();
    revealView(gridContainer);
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
  }

  // ── Load from storage ──────────────────────────────────────────────────────
  QuickLaunchStorage.get(['settings', 'shortcuts', 'snippets', 'searchPosition', 'usageCounts', 'sortMode', 'activeWorkspaceId'], (result) => {
    if (chrome.runtime.lastError) console.error('Storage read error:', chrome.runtime.lastError);

    settings = QuickLaunchBackup.settings(result.settings, settings);
    const workspaceIds = new Set(settings.workspaces.map(w => w.id));
    shortcuts = QuickLaunchBackup.shortcuts(result.shortcuts, workspaceIds);
    snippets = QuickLaunchBackup.snippets(result.snippets);
    usageCounts = QuickLaunchBackup.usageCounts(result.usageCounts);
    if (SORT_MODES.includes(result.sortMode)) sortMode = result.sortMode;

    settings.searchPosition = ['top', 'bottom'].includes(result.searchPosition)
      ? result.searchPosition : (settings.searchPosition || 'top');
    if (settings.searchPosition === 'bottom') {
      document.getElementById('app-container').classList.add('search-bottom');
    }

    activeWorkspaceId = workspaceIds.has(result.activeWorkspaceId)
      ? result.activeWorkspaceId : 'w_default';

    applySettings();
    updateSortBtn();
    updateModeButtons();
    renderTabs();
    renderGrid();
    requestAnimationFrame(() => {
      const sheetOpen = [editShortcutSheet, snippetEditSheet, quickAddToast]
        .some(sheet => sheet.style.display === 'block');
      if (!QuickLaunchStorage.blocked && !QuickLaunchStorage.busy && !sheetOpen &&
          document.activeElement === document.body) searchInput.focus();
    });
  });

  // ── Save helpers ───────────────────────────────────────────────────────────
  function saveShortcuts(cb, relatedValues = {}) {
    QuickLaunchStorage.set({ shortcuts, ...relatedValues }, () => {
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

  function saveSnippets(cb, clearDraft = null) {
    QuickLaunchStorage.set({ snippets }, () => {
      if (chrome.runtime.lastError) {
        console.error('Save snippets error:', chrome.runtime.lastError);
        showPopupToast('Could not save snippet. Storage may be full.', 'error');
        return;
      }
      updateModeButtons();
      if (typeof cb === 'function') cb();
    }, { clearDraft });
  }

  function saveSortMode() {
    QuickLaunchStorage.set({ sortMode }, () => {
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
    if (settings.workspaces.length <= 1 || appMode !== 'shortcuts') {
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
  const SORT_MODES   = ['manual', 'most-used', 'az'];
  const SORT_LABELS  = { manual: 'Sort: Manual', 'most-used': 'Sort: Most Used', az: 'Sort: A – Z' };

  function sortedShortcuts(items) {
    const result = [...items];
    if (sortMode === 'az') result.sort((a, b) => a.title.localeCompare(b.title));
    if (sortMode === 'most-used') result.sort((a, b) => (usageCounts[b.url] || 0) - (usageCounts[a.url] || 0));
    return result;
  }

  function getDisplaySnippets() {
    if (isEditMode || !searchInput.value.trim()) return snippets;
    return QuickLaunchSearch.rank(snippets, searchInput.value, snippet =>
      [snippet.title, snippet.tags.join(' '), snippet.text]);
  }

  function updateSearchStatus(count) {
    searchStatus.hidden = isEditMode || !searchInput.value.trim();
    searchStatus.replaceChildren();
    if (!searchStatus.hidden) {
      const scope = appMode === 'shortcuts' ? 'All workspaces' : 'Snippets';
      const summary = document.createElement('span');
      summary.textContent = `${count} ${count === 1 ? 'result' : 'results'} · ${scope}`;
      searchStatus.appendChild(summary);
      if (count) {
        const hint = document.createElement('kbd');
        hint.textContent = '↵ Enter';
        hint.title = appMode === 'shortcuts' ? 'Open first result' : 'Copy first result';
        hint.setAttribute('aria-hidden', 'true');
        searchStatus.appendChild(hint);
      }
    }
  }

  function emptySearch(kind) {
    const message = document.createElement('div');
    message.className = 'search-empty';
    const title = document.createElement('p');
    title.textContent = `No matching ${kind}.`;
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = kind === 'shortcuts' ? 'Try a title, URL, or workspace name.' : 'Try a title, tag, or phrase from the text.';
    const clear = document.createElement('button');
    clear.className = 'qa-btn secondary';
    clear.textContent = 'Clear search';
    clear.addEventListener('click', clearSearch);
    message.append(title, hint, clear);
    return message;
  }

  function getDisplayList() {
    const query = searchInput.value.trim().toLowerCase();
    const isSearching = query !== '' && !isEditMode;
    const maxItems = settings.rows * settings.cols;

    const workspaceShortcuts = shortcuts.filter(s => (s.workspaceId || 'w_default') === activeWorkspaceId);

    if (isSearching) {
      // Global string search across all workspaces
      const names = new Map(settings.workspaces.map(ws => [ws.id, ws.name]));
      const globalMatches = QuickLaunchSearch.rank(sortedShortcuts(shortcuts), query, shortcut =>
        [shortcut.title, shortcut.url, names.get(shortcut.workspaceId) || 'Main']);

      // Inject exact hotkey match from the currently viewed workspace
      const numQuery = /^[0-9]$/.test(query) ? Number(query) : NaN;
      let targetIndex = -1;
      if (!isNaN(numQuery)) {
        if (numQuery >= 1 && numQuery <= 9) targetIndex = numQuery - 1;
        else if (numQuery === 0) targetIndex = 9;
      }
      
      if (targetIndex !== -1 && targetIndex < workspaceShortcuts.length) {
        const visibleWorkspace = sortedShortcuts(workspaceShortcuts);
        const hotkeyTarget = visibleWorkspace[targetIndex];
        if (!globalMatches.includes(hotkeyTarget)) {
          globalMatches.unshift(hotkeyTarget);
        }
      }
      return globalMatches;
    } else {
      // Sort the whole workspace BEFORE truncating to the grid — slicing first
      // meant "Most Used" only ranked the first rows×cols items in manual order,
      // so a heavily-used shortcut further down could never reach the grid.
      const base = sortedShortcuts(workspaceShortcuts);
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
    addRequest++;
    appMode = newMode;
    document.getElementById('copyStatus').textContent = '';
    modeShortcutsBtn.classList.toggle('active', appMode === 'shortcuts');
    modeSnippetsBtn.classList.toggle('active', appMode === 'snippets');
    modeShortcutsBtn.setAttribute('aria-pressed', String(appMode === 'shortcuts'));
    modeSnippetsBtn.setAttribute('aria-pressed', String(appMode === 'snippets'));
    emptyState.style.display = 'none';
    quickAddToast.style.display = 'none';
    currentTabInfo = null;
    editShortcutSheet.style.display = 'none';
    snippetEditSheet.style.display = 'none';
    quickAddBtn.setAttribute('aria-label', appMode === 'shortcuts' ? 'Add current tab' : 'Add new snippet');
    editBtn.setAttribute('aria-label', appMode === 'shortcuts' ? 'Edit shortcuts' : 'Edit snippets');
    document.getElementById('editBannerText').textContent = appMode === 'shortcuts'
      ? 'Drag to reorder • ✕ remove • tap title to rename' : 'Manage snippets';
    
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
    revealView(appMode === 'shortcuts' ? gridContainer : snippetsContainer);
  }

  modeShortcutsBtn.addEventListener('click', () => setAppMode('shortcuts'));
  modeSnippetsBtn.addEventListener('click', () => setAppMode('snippets'));

  // ── Edit mode ──────────────────────────────────────────────────────────────
  function setEditMode(active) {
    addRequest++;
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
      saveShortcuts(() => renderGrid(), { usageCounts });
    } else {
      saveShortcuts(() => renderGrid());
    }
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
        if (parentA) {
          parentA.setAttribute('aria-label', newTitle);
          parentA.title = newTitle;
          const removeBtn = parentA.querySelector('.remove-btn');
          if (removeBtn) {
            removeBtn.setAttribute('aria-label', `Remove ${newTitle}`);
            removeBtn.title = `Remove ${newTitle}`;
          }
          const editBtn = parentA.querySelector('.edit-url-btn');
          if (editBtn) editBtn.setAttribute('aria-label', `Edit ${newTitle}`);
        }
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
    if (appMode !== 'shortcuts') return;
    gridContainer.innerHTML = '';
    focusedIndex = -1;

    const query      = searchInput.value.trim().toLowerCase();
    const isSearching = query !== '' && !isEditMode;
    const list       = getDisplayList();
    updateSearchStatus(list.length);

    if (list.length === 0 && !isSearching) {
      gridContainer.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    gridContainer.style.display = 'grid';
    emptyState.style.display = 'none';
    gridContainer.style.gridTemplateColumns = `repeat(${gridColumns()}, minmax(0, 1fr))`;
    gridContainer.classList.toggle('hide-titles', !settings.showTitles);

    if (!list.length) { gridContainer.appendChild(emptySearch('shortcuts')); return; }

    const gridFrag = document.createDocumentFragment();
    const indices = new Map(shortcuts.map((shortcut, index) => [shortcut, index]));
    list.forEach((shortcut, displayIndex) => {
      const a = document.createElement(isEditMode ? 'div' : 'a');
      a.className = 'shortcut-item';
      dragRecords.set(a, shortcut);
      if (isEditMode) a.setAttribute('role', 'group');
      else a.href = shortcut.url;
      const workspaceName = settings.workspaces.find(ws => ws.id === shortcut.workspaceId)?.name || 'Main';
      a.setAttribute('aria-label', isSearching ? `${shortcut.title} · ${workspaceName}` : shortcut.title);
      a.title = isSearching ? `${shortcut.title} · ${workspaceName}\n${shortcut.url}` : shortcut.title;
      a.tabIndex = 0;
      a.dataset.index = displayIndex;
      a.dataset.globalIndex = indices.get(shortcut);

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
          openEditSheet(shortcut);
        });
        a.appendChild(editUrlBtn);
      } else {
        if (displayIndex < 10 && settings.showBadges !== false && settings.hotkeyAction !== 'type') {
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
            if (e.target.closest('.remove-btn, .edit-action-btn, .shortcut-title')) return;

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
          window.removeEventListener('blur', onCancel);
              a.classList.remove('dragging');
              document.querySelectorAll('.shortcut-item').forEach(el => el.classList.remove('drag-over'));

              if (dragging) {
                a.dataset.dragged = 'true';
                setTimeout(() => {
                  a.removeAttribute('data-dragged');
                }, 100);

                if (dropTarget && a.isConnected && dropTarget.isConnected &&
                    !QuickLaunchStorage.blocked && !QuickLaunchStorage.busy) {
                  const fromIdx = shortcuts.indexOf(shortcut);
                  const toIdx = shortcuts.indexOf(dragRecords.get(dropTarget));
                  if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
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
          window.removeEventListener('blur', onCancel);
              a.classList.remove('dragging');
              document.querySelectorAll('.shortcut-item').forEach(el => el.classList.remove('drag-over'));
            };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onCancel);
        window.addEventListener('blur', onCancel, { once: true });
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
      if (isSearching && settings.workspaces.length > 1) {
        const workspace = document.createElement('span');
        workspace.className = 'shortcut-workspace';
        workspace.textContent = workspaceName;
        a.appendChild(workspace);
      }
      gridFrag.appendChild(a);
    });
    gridContainer.appendChild(gridFrag);
  }

  // ── Open shortcut + track usage ────────────────────────────────────────────
  let isLaunching = false;
  async function sendLaunch(request) {
    if (isLaunching || !QuickLaunchStorage.ready || QuickLaunchStorage.blocked || QuickLaunchStorage.busy) return;
    isLaunching = true;
    openGroupBtn.disabled = true;
    try {
      const result = await chrome.runtime.sendMessage({ type: 'launch', ...request });
      if (!result?.ok) throw new Error(result?.error || 'Could not open shortcuts.');
      window.close();
    } catch (error) {
      showPopupToast(error.message || 'Could not open shortcuts.', 'error');
    } finally {
      isLaunching = false;
      openGroupBtn.disabled = false;
    }
  }

  function openShortcut(url) {
    if (isWebUrl(url)) sendLaunch({ url });
  }

  // The worker owns this operation so opening tabs cannot interrupt it.
  function openWorkspaceGroup() {
    const list = shortcuts.filter(s => (s.workspaceId || 'w_default') === activeWorkspaceId);
    if (!list.length) { showPopupToast('No shortcuts in this workspace.', 'error'); return; }
    if (list.length > 10 && !confirm(`Open all ${list.length} shortcuts in this workspace?`)) return;
    sendLaunch({ workspaceId: activeWorkspaceId, confirmed: list.length > 10 });
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

  function clearSearch() {
    clearTimeout(searchDebounce);
    searchInput.value = '';
    updateSearchClear();
    searchInput.focus();
    if (appMode === 'shortcuts') renderGrid();
    else renderSnippets();
  }
  searchClearBtn.addEventListener('click', clearSearch);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (QuickLaunchStorage.blocked || e.isComposing || e.repeat) return;
    const sheetOpen = [editShortcutSheet, snippetEditSheet, quickAddToast]
      .some(sheet => sheet.style.display === 'block');
    if (sheetOpen || document.activeElement?.isContentEditable) return;
    if (e.key === 'Escape' && isEditMode) { setEditMode(false); return; }
    if (e.key === 'Escape' && searchInput.value) { e.preventDefault(); clearSearch(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && !e.altKey) {
      e.preventDefault(); searchInput.focus(); searchInput.select(); return;
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement === searchInput && searchInput.value.trim()) {
      e.preventDefault();
      clearTimeout(searchDebounce);
      if (appMode === 'shortcuts') {
        renderGrid();
        const first = getDisplayList()[0];
        if (first) openShortcut(first.url);
      } else {
        renderSnippets();
        const first = getDisplaySnippets()[0];
        if (first) copySnippet(first);
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
      const wsIndex = parseInt(e.key) - 1;
      if (settings && settings.workspaces && wsIndex >= 0 && wsIndex < settings.workspaces.length) {
        e.preventDefault();
        setAppMode('shortcuts');
        selectWorkspace(settings.workspaces[wsIndex].id);
      }
      return;
    }

    const items = [...(appMode === 'shortcuts' ? gridContainer.querySelectorAll('.shortcut-item')
      : snippetsContainer.querySelectorAll('.snippet-item'))];

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
      focusedIndex = items.indexOf(document.activeElement);
      e.preventDefault();
      const cols = appMode === 'shortcuts' ? gridColumns() : 1;
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

    if (!e.ctrlKey && !e.metaKey && !e.altKey && !isEditMode && (!isTypingInInput || (document.activeElement === searchInput && settings.hotkeyAction !== 'type'))) {
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
            }
          } else {
            // Snippets hotkeys
            const list = getDisplaySnippets();
            const targetIndex = num === 0 ? 9 : num - 1;
            if (targetIndex < list.length) {
              copySnippet(list[targetIndex]);
            }
          }
        }
      }
    }

    if (!e.defaultPrevented && !isEditMode && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingInInput) {
      e.preventDefault();
      searchInput.value += e.key;
      searchInput.focus();
      searchInput.dispatchEvent(new Event('input'));
    }
  });

  // ── Quick Add ──────────────────────────────────────────────────────────────
  quickAddBtn.addEventListener('click', () => {
    if (isEditMode) setEditMode(false);
    if (appMode === 'shortcuts') {
      const request = ++addRequest;
      const workspaceId = activeWorkspaceId;
      try { chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const error = chrome.runtime.lastError;
        if (request !== addRequest || appMode !== 'shortcuts' || QuickLaunchStorage.blocked) return;
        if (error || !tabs?.[0]) { showPopupToast('Could not read the current tab. Try again.', 'error'); return; }
        const tab = tabs[0];
        if (!isWebUrl(tab.url)) {
          showPopupToast('Cannot add this page type.', 'error'); return;
        }
        currentTabInfo = {
          title: tab.title || new URL(tab.url).hostname,
          url:   tab.url,
          icon:  '', // resolved locally at render time, see getIconUrl()
          workspaceId
        };
        const previewIcon = getIconUrl(currentTabInfo);
        qaIcon.src = previewIcon;
        qaIcon.style.display = previewIcon ? 'block' : 'none';
        qaTitle.textContent = currentTabInfo.title;
        qaUrl.textContent   = currentTabInfo.url;
        quickAddToast.style.display = 'block';
        qaConfirmBtn.focus();
      }); } catch { showPopupToast('Could not read the current tab. Try again.', 'error'); }
    } else {
      openSnippetSheet();
    }
  });

  qaConfirmBtn.addEventListener('click', () => {
    if (!currentTabInfo) return;
    const exists = shortcuts.some(s => s.url === currentTabInfo.url && (s.workspaceId || 'w_default') === currentTabInfo.workspaceId);
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
    addRequest++;
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
    const template = document.createElement('template');
    template.innerHTML = html;
    const div = template.content;
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
      const language = node.tagName === 'CODE' ? node.className.match(/^language-[a-z0-9_-]+$/i)?.[0] : null;
      for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
      if (language) node.className = language;
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
    return template.innerHTML;
  }

  // ── Snippet placeholders ───────────────────────────────────────────────────
  // Expands {{clipboard}}, {{date}}, {{time}}, {{datetime}} at copy time.
  function expandSnippet(text) {
    return QuickLaunchSnippet.expand(text, {
      hasPermission: () => chrome.permissions.contains({ permissions: ['clipboardRead'] }),
      readClipboard: () => navigator.clipboard.readText()
    });
  }

  let copyPending = false;
  let copyCloseTimer = null;
  const copiedTimers = new WeakMap();
  async function copySnippet(snippet) {
    if (copyPending || QuickLaunchStorage.blocked) return;
    copyPending = true;
    const opener = document.activeElement;
    clearTimeout(copyCloseTimer);
    snippetsContainer.setAttribute('aria-busy', 'true');
    snippetsContainer.querySelectorAll('.snippet-copy-btn').forEach(button => { button.disabled = true; });
    try {
      const text = await expandSnippet(snippet.text);
      await navigator.clipboard.writeText(text);
      const card = [...snippetsContainer.querySelectorAll('.snippet-item')].find(el => el.dataset.snippetId === snippet.id);
      if (card) {
        clearTimeout(copiedTimers.get(card));
        card.classList.add('copied');
        const label = card.querySelector('.snippet-copy-label');
        if (label) label.textContent = 'Copied';
        copiedTimers.set(card, setTimeout(() => {
          card.classList.remove('copied');
          if (label) label.textContent = 'Copy';
        }, 1400));
      }
      if (settings.keepOpenAfterCopy) document.getElementById('copyStatus').textContent = `Copied ${snippet.title}.`;
      else showPopupToast('Snippet copied to clipboard');
      if (!settings.keepOpenAfterCopy) copyCloseTimer = setTimeout(() => {
        if (![editShortcutSheet, snippetEditSheet, quickAddToast].some(sheet => sheet.style.display === 'block')) window.close();
      }, 400);
    } catch (error) {
      showPopupToast(error.message || 'Failed to copy snippet', 'error');
    } finally {
      copyPending = false;
      snippetsContainer.removeAttribute('aria-busy');
      snippetsContainer.querySelectorAll('.snippet-copy-btn').forEach(button => { button.disabled = false; });
      if (opener?.matches('.snippet-copy-btn') && opener.isConnected && document.activeElement === document.body) opener.focus();
    }
  }

  // ── Snippets ───────────────────────────────────────────────────────────────
  function renderSnippets() {
    if (appMode !== 'snippets') return;
    snippetsContainer.innerHTML = '';
    const query = searchInput.value.trim().toLowerCase();
    
    const displayList = getDisplaySnippets();
    updateSearchStatus(displayList.length);

    if (displayList.length === 0) {
      if (query && !isEditMode) { snippetsContainer.appendChild(emptySearch('snippets')); return; }
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'snippet-empty';
      emptyMsg.textContent = query !== '' ? 'No matching snippets.' : 'No snippets yet. Add one above!';
      snippetsContainer.appendChild(emptyMsg);
      return;
    }

    const snippetFrag = document.createDocumentFragment();
    const indices = new Map(snippets.map((snippet, index) => [snippet, index]));
    displayList.forEach((snippet, index) => {
      const el = document.createElement('div');
      el.className = 'snippet-item';
      dragRecords.set(el, snippet);
      el.dataset.globalIndex = indices.get(snippet);
      el.dataset.snippetId = snippet.id;
      el.tabIndex = 0;
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', `Snippet: ${snippet.title}`);
      
      const header = document.createElement('div');
      header.className = 'snippet-header';

      const expandBtn = document.createElement('button');
      expandBtn.className = 'snippet-expand-btn';
      expandBtn.setAttribute('aria-label', `Preview ${snippet.title}`);
      expandBtn.setAttribute('aria-expanded', 'false');
      expandBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
      expandBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.toggle('expanded');
        expandBtn.setAttribute('aria-expanded', String(el.classList.contains('expanded')));
        if (el.classList.contains('expanded')) renderPreview();
      });
      header.appendChild(expandBtn);
      
      const title = document.createElement('div');
      title.className = 'snippet-title';
      title.textContent = snippet.title;
      header.appendChild(title);
      
      const actions = document.createElement('div');
      actions.className = 'snippet-actions';

      const badgeNum = settings.hotkeyAction === 'type' || settings.showBadges === false ? null
        : index < 9 ? index + 1 : (index === 9 ? 0 : null);

      if (isEditMode) {
        const editBtn = document.createElement('button');
        editBtn.className = 'snippet-action-btn edit';
        editBtn.title = 'Edit Snippet';
        editBtn.setAttribute('aria-label', `Edit ${snippet.title}`);
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
        editBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          openSnippetSheet(snippet);
        });
        actions.appendChild(editBtn);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'snippet-action-btn remove';
        removeBtn.setAttribute('aria-label', `Remove ${snippet.title}`);
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
          if (e.target.closest('a, button')) return;

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
          window.removeEventListener('blur', onCancel);
            el.classList.remove('dragging');
            document.querySelectorAll('.snippet-item').forEach(e => e.classList.remove('drag-over'));

            if (dragging) {
              el.dataset.dragged = 'true';
              setTimeout(() => {
                el.removeAttribute('data-dragged');
              }, 100);

              if (dropTarget && el.isConnected && dropTarget.isConnected &&
                  !QuickLaunchStorage.blocked && !QuickLaunchStorage.busy) {
                const fromIdx = snippets.indexOf(snippet);
                const toIdx = snippets.indexOf(dragRecords.get(dropTarget));
                if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
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
          window.removeEventListener('blur', onCancel);
            el.classList.remove('dragging');
            document.querySelectorAll('.snippet-item').forEach(e => e.classList.remove('drag-over'));
          };

          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp);
          document.addEventListener('pointercancel', onCancel);
        window.addEventListener('blur', onCancel, { once: true });
        });
      } else {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'snippet-action-btn snippet-copy-btn';
        copyBtn.type = 'button';
        copyBtn.innerHTML = '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span class="snippet-copy-label">Copy</span>';
        copyBtn.setAttribute('aria-label', `Copy ${snippet.title}`);
        copyBtn.title = badgeNum === null ? 'Copy snippet' : `Copy snippet (${badgeNum})`;
        if (badgeNum !== null) {
          const key = document.createElement('kbd');
          key.className = 'snippet-copy-key';
          key.textContent = badgeNum;
          key.setAttribute('aria-hidden', 'true');
          copyBtn.setAttribute('aria-keyshortcuts', String(badgeNum));
          copyBtn.appendChild(key);
        }
        copyBtn.addEventListener('click', e => {
          e.stopPropagation();
          copySnippet(snippet);
        });
        actions.appendChild(copyBtn);
        el.addEventListener('keydown', e => {
          if (e.target === el && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            copySnippet(snippet);
          }
        });
        el.addEventListener('click', (e) => {
          if (e.target.closest('a, button')) return;
          if (el.dataset.dragged === 'true') {
            e.preventDefault();
            return;
          }
          copySnippet(snippet);
        });
      }

      if (actions.children.length > 0) {
        header.appendChild(actions);
      }
      el.appendChild(header);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'snippet-content';
      const contentInner = document.createElement('div');
      contentInner.className = 'snippet-content-inner';
      contentDiv.appendChild(contentInner);

      if (snippet.tags && snippet.tags.length > 0) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'snippet-tags';
        snippet.tags.forEach(tag => {
          const pill = document.createElement('span');
          pill.className = 'tag-pill';
          pill.textContent = tag;
          tagsDiv.appendChild(pill);
        });
        contentInner.appendChild(tagsDiv);
      }

      const mdDiv = document.createElement('div');
      mdDiv.className = 'snippet-markdown';
      function renderPreview() {
        if (mdDiv.dataset.rendered) return;
        mdDiv.dataset.rendered = 'true';
        try {
          if (typeof marked !== 'undefined' && snippet.text.length <= 100000) {
            mdDiv.innerHTML = sanitizeHtml(marked.parse(snippet.text, { renderer: markdownRenderer }));
          } else mdDiv.textContent = snippet.text;
          if (typeof hljs !== 'undefined') {
            mdDiv.querySelectorAll('pre code').forEach(block => {
              if (block.textContent.length <= 20000 && /language-/.test(block.className)) hljs.highlightElement(block);
            });
          }
        } catch { mdDiv.textContent = snippet.text; }
      }
      contentInner.appendChild(mdDiv);

      el.appendChild(contentDiv);
      snippetFrag.appendChild(el);
    });
    snippetsContainer.appendChild(snippetFrag);
  }

  function openSnippetSheet(snippet = null) {
    const request = ++addRequest;
    if (snippet) {
      currentlyEditingSnippetId = snippet.id;
      snippetEditTitle.value = snippet.title;
      snippetEditText.value = snippet.text;
      document.getElementById('snippetEditTags').value = snippet.tags ? snippet.tags.join(', ') : '';
      snippetEditSheet.style.display = 'block';
      snippetEditTitle.focus();
    } else {
      currentlyEditingSnippetId = null;
      QuickLaunchStorage.get(['snippetDraft'], (result) => {
        if (request !== addRequest || appMode !== 'snippets' || QuickLaunchStorage.blocked) return;
        const draft = result.snippetDraft || { title: '', text: '', tags: '' };
        snippetEditTitle.value = typeof draft.title === 'string' ? draft.title : '';
        snippetEditText.value = typeof draft.text === 'string' ? draft.text : '';
        document.getElementById('snippetEditTags').value = typeof draft.tags === 'string' ? draft.tags : '';
        snippetEditSheet.style.display = 'block';
        snippetEditTitle.focus();
      });
    }
  }

  // ── Auto-save snippet drafts ───────────────────────────────────────────────
  function scheduleDraftSave() {
    if (currentlyEditingSnippetId) return; // Only save drafts for new snippets
    // Submit immediately; a popup-close cancels debounce timers.
    QuickLaunchStorage.saveDraft({
      title: snippetEditTitle.value,
      text: snippetEditText.value,
      tags: document.getElementById('snippetEditTags').value
    });
  }
  snippetEditTitle.addEventListener('input', scheduleDraftSave);
  snippetEditText.addEventListener('input', scheduleDraftSave);
  document.getElementById('snippetEditTags').addEventListener('input', scheduleDraftSave);

  snippetEditCancel.addEventListener('click', () => {
    addRequest++;
    snippetEditSheet.style.display = 'none';
    quickAddBtn.focus();
  });

  snippetEditSave.addEventListener('click', () => {
    const newTitle = snippetEditTitle.value.trim();
    const newText = snippetEditText.value;
    const tagsRaw = document.getElementById('snippetEditTags').value;
    const newTags = tagsRaw.split(',').map(t => t.trim()).filter(t => t !== '');

    if (!newTitle || !newText.trim()) {
      showPopupToast('Title and Text are required', 'error');
      return;
    }

    const isNewSnippet = !currentlyEditingSnippetId;
    if (currentlyEditingSnippetId) {
      const target = snippets.find(s => s.id === currentlyEditingSnippetId);
      if (!target) { showPopupToast('This snippet was removed. Reopen the editor.', 'error'); return; }
      if (target) {
        target.title = newTitle;
        target.text = newText;
        target.tags = newTags;
      }
    } else {
      const id = 'snip_' + crypto.randomUUID();
      snippets.push({
        id,
        title: newTitle,
        text: newText,
        tags: newTags
      });
      currentlyEditingSnippetId = id;
    }

    saveSnippets(() => {
      snippetEditSheet.style.display = 'none';
      renderSnippets();
      quickAddBtn.focus();
      showPopupToast('Snippet saved');
    }, isNewSnippet ? { title: snippetEditTitle.value, text: snippetEditText.value,
      tags: document.getElementById('snippetEditTags').value } : null);
  });

  // ── Export ─────────────────────────────────────────────────────────────────
  exportBtn.addEventListener('click', async () => {
    let saved;
    try { saved = await chrome.storage.local.get(['shortcuts', 'snippets', 'settings', 'usageCounts', 'sortMode', 'searchPosition']); }
    catch { showPopupToast('Could not load data for export.', 'error'); return; }
    const payload = QuickLaunchBackup.exportData(saved, defaultSettings, chrome.runtime.getManifest().version);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `quicklaunch-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showPopupToast(`Exported ${saved.shortcuts?.length || 0} shortcuts, ${saved.snippets?.length || 0} snippets`);
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

      let next;
      try {
        next = QuickLaunchBackup.importData(parsed, { settings, shortcuts, snippets, usageCounts, sortMode }, 'merge', prefix => prefix + crypto.randomUUID());
      } catch (error) { showPopupToast(error.message, 'error'); return; }
      const { shortcuts: nextShortcuts, snippets: nextSnippets, settings: nextSettings,
        usageCounts: nextUsageCounts, sortMode: nextSortMode, added, addedSnippets, skipped } = next;

      QuickLaunchStorage.set({
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
        let msg = `Imported ${added} shortcut${added !== 1 ? 's' : ''}, ${addedSnippets} snippet${addedSnippets !== 1 ? 's' : ''}`;
        if (skipped > 0) msg += ` (${skipped} invalid or duplicate items skipped)`;

        showPopupToast(msg);
      });
    };
    reader.onerror = () => showPopupToast('Could not read file.', 'error');
    if (file.size > QuickLaunchBackup.MAX_IMPORT_BYTES) { showPopupToast('Backup is too large (maximum 5 MB).', 'error'); return; }
    reader.readAsText(file);
  });

  // ── Settings / navigation ──────────────────────────────────────────────────
  function openSettings() {
    try { chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError) showPopupToast('Could not open Settings. Try again.', 'error');
    }); } catch { showPopupToast('Could not open Settings. Reload QuickLaunch and try again.', 'error'); }
  }
  settingsBtn.addEventListener('click', openSettings);
  addFirstBtn.addEventListener('click', openSettings);

  document.querySelectorAll('.quick-start-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const title = e.target.dataset.title;
      const url = e.target.dataset.url;
      const exists = shortcuts.some(s => s.url === url && (s.workspaceId || 'w_default') === activeWorkspaceId);
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
      t.setAttribute('role', 'status');
      t.setAttribute('aria-atomic', 'true');
      document.body.appendChild(t);
    }
    t.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    t.textContent  = msg;
    t.dataset.type = type;
    t.classList.add('show');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('show'), 2800);
  }

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (QuickLaunchStorage.blocked) return;
    const sheet = [editShortcutSheet, snippetEditSheet, quickAddToast]
      .find(el => el.style.display === 'block');
    if (sheet && e.key === 'Tab') {
      const controls = [...sheet.querySelectorAll('input:not([type="hidden"]), textarea, button:not([disabled])')];
      const first = controls[0], last = controls.at(-1);
      if ((e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last) || !sheet.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first)?.focus();
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (sheet) e.preventDefault();
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
