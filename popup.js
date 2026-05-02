// popup.js — QuickLaunch v2.2

document.addEventListener('DOMContentLoaded', () => {
  // ── DOM refs ───────────────────────────────────────────────────────────────
  const gridContainer   = document.getElementById('gridContainer');
  const searchInput     = document.getElementById('searchInput');
  const settingsBtn     = document.getElementById('settingsBtn');
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

  // ── State ──────────────────────────────────────────────────────────────────
  let settings = {
    rows: 4, cols: 4, showTitles: true, fontSize: 12, gridGap: 16,
    theme: 'dark', popupWidth: 380, iconShape: 'circle', iconSize: 48,
    accentColor: '', openInNewTab: true, showBadges: true,
  };

  let shortcuts      = [];
  let usageCounts    = {};   // { url: number }  — stored separately, no migration needed
  let sortMode       = 'manual'; // 'manual' | 'most-used' | 'az'
  let currentTabInfo = null;
  let focusedIndex   = -1;
  let dragSrcIndex   = null;
  let isEditMode     = false;

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
  chrome.storage.local.get(['settings', 'shortcuts', 'searchPosition', 'usageCounts', 'sortMode'], (result) => {
    if (chrome.runtime.lastError) console.error('Storage read error:', chrome.runtime.lastError);

    if (result.settings)    settings    = { ...settings, ...result.settings };
    if (result.shortcuts)   shortcuts   = result.shortcuts;
    if (result.usageCounts) usageCounts = result.usageCounts;
    if (result.sortMode)    sortMode    = result.sortMode;

    if (result.searchPosition === 'bottom') {
      document.getElementById('app-container').classList.add('search-bottom');
    }

    applySettings();
    updateSortBtn();
    renderGrid();
  });

  // ── Save helpers ───────────────────────────────────────────────────────────
  function saveShortcuts(cb) {
    chrome.storage.local.set({ shortcuts }, () => {
      if (chrome.runtime.lastError) console.error('Save shortcuts error:', chrome.runtime.lastError);
      if (typeof cb === 'function') cb();
    });
  }

  // Usage counts are saved with a small debounce to avoid hammering storage
  let usageSaveTimer = null;
  function saveUsageCounts() {
    clearTimeout(usageSaveTimer);
    usageSaveTimer = setTimeout(() => {
      chrome.storage.local.set({ usageCounts }, () => {
        if (chrome.runtime.lastError) console.error('Save usage error:', chrome.runtime.lastError);
      });
    }, 300);
  }

  function saveSortMode() {
    chrome.storage.local.set({ sortMode }, () => {
      if (chrome.runtime.lastError) console.error('Save sortMode error:', chrome.runtime.lastError);
    });
  }

  // ── Sort ───────────────────────────────────────────────────────────────────
  const SORT_MODES   = ['manual', 'most-used', 'az'];
  const SORT_LABELS  = { manual: 'Sort: Manual', 'most-used': 'Sort: Most Used', az: 'Sort: A – Z' };

  function getDisplayList() {
    const query      = searchInput.value.trim().toLowerCase();
    const isSearching = query !== '' && !isEditMode;
    const maxItems   = settings.rows * settings.cols;

    let base = isSearching
      ? shortcuts.filter((s, i) => {
          const hotkeyMatch = i < 9 && (i + 1).toString() === query;
          return s.title.toLowerCase().includes(query) ||
                 s.url.toLowerCase().includes(query) || hotkeyMatch;
        })
      : shortcuts.slice(0, maxItems);

    // Apply sort (skip for search results — order by relevance instead)
    if (!isSearching && sortMode !== 'manual') {
      base = [...base].sort((a, b) => {
        if (sortMode === 'most-used') {
          return (usageCounts[b.url] || 0) - (usageCounts[a.url] || 0);
        }
        if (sortMode === 'az') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
    }

    return base;
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

  // ── Edit mode ──────────────────────────────────────────────────────────────
  function setEditMode(active) {
    isEditMode = active;
    editBtn.classList.toggle('active', active);
    editBtn.setAttribute('aria-pressed', String(active));
    editBanner.style.display = active ? 'flex' : 'none';
    if (active && searchInput.value.trim() !== '') searchInput.value = '';
    renderGrid();
  }

  editBtn.addEventListener('click', () => setEditMode(!isEditMode));

  // ── Delete ─────────────────────────────────────────────────────────────────
  function deleteShortcut(url) {
    const idx = shortcuts.findIndex(s => s.url === url);
    if (idx === -1) return;
    shortcuts.splice(idx, 1);
    saveShortcuts(() => renderGrid());
  }

  // ── Inline rename ──────────────────────────────────────────────────────────
  function makeRenameTarget(titleEl, shortcut) {
    titleEl.addEventListener('click', (e) => {
      if (!isEditMode) return;
      e.preventDefault();
      e.stopPropagation();
      activateRename(titleEl, shortcut);
    });
  }

  function activateRename(titleEl, shortcut) {
    if (titleEl.dataset.renaming) return; // guard double-activation
    titleEl.dataset.renaming = '1';

    const original = shortcut.title;

    // Temporarily disable dragging on the parent <a> so mousedown
    // on the title doesn't start a drag before the click fires
    const parentA = titleEl.closest('.shortcut-item');
    if (parentA) parentA.draggable = false;

    titleEl.contentEditable = 'true';
    titleEl.classList.add('renaming');
    titleEl.focus();

    // Select all text for easy overtyping
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
      if (parentA) parentA.draggable = true;

      if (newTitle && newTitle !== original) {
        shortcut.title = newTitle;
        saveShortcuts();
        // Update the fallback icon letter if present
        const fallback = parentA && parentA.querySelector('.fallback-icon');
        if (fallback) fallback.textContent = newTitle.charAt(0);
      } else {
        titleEl.textContent = original; // revert
      }
    }

    function revert() {
      titleEl.textContent = original;
      titleEl.contentEditable = 'false';
      titleEl.classList.remove('renaming');
      delete titleEl.dataset.renaming;
      if (parentA) parentA.draggable = true;
    }

    titleEl.addEventListener('keydown', function onKey(e) {
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
    });

    titleEl.addEventListener('blur', function onBlur() {
      titleEl.removeEventListener('blur', onBlur);
      commit();
    }, { once: true });
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

    list.forEach((shortcut, displayIndex) => {
      const a = document.createElement('a');
      a.className = 'shortcut-item';
      a.href = shortcut.url;
      a.tabIndex = 0;
      a.dataset.index = displayIndex;

      if (isEditMode) {
        a.classList.add('edit-mode');
        a.addEventListener('click', e => e.preventDefault());
      } else {
        a.addEventListener('click', e => { e.preventDefault(); openShortcut(shortcut.url); });
        a.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openShortcut(shortcut.url); }
        });
      }

      // ── Icon ──────────────────────────────────────────────────────────────
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

      // ── Title (edit mode: inline rename via makeRenameTarget) ─────────────
      const title = document.createElement('div');
      title.className = 'shortcut-title';
      title.textContent = shortcut.title;
      title.style.fontSize = `${settings.fontSize}px`;

      if (isEditMode) {
        title.classList.add('renameable');
        title.title = 'Click to rename';
        makeRenameTarget(title, shortcut);
      }

      // ── Top-left badge ─────────────────────────────────────────────────────
      if (isEditMode) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.title = `Remove ${shortcut.title}`;
        removeBtn.setAttribute('aria-label', `Remove ${shortcut.title}`);
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          deleteShortcut(shortcut.url);
        });
        a.appendChild(removeBtn);
      } else {
        if (displayIndex < 9 && settings.showBadges !== false) {
          const badge = document.createElement('div');
          badge.className = 'hotkey-badge';
          badge.textContent = displayIndex + 1;
          a.appendChild(badge);
        }
      }

      // ── Usage count pip (shown only in most-used sort mode) ───────────────
      if (!isEditMode && sortMode === 'most-used' && (usageCounts[shortcut.url] || 0) > 0) {
        const pip = document.createElement('div');
        pip.className = 'usage-pip';
        pip.title = `Opened ${usageCounts[shortcut.url]} time${usageCounts[shortcut.url] === 1 ? '' : 's'}`;
        pip.textContent = usageCounts[shortcut.url] > 99 ? '99+' : usageCounts[shortcut.url];
        a.appendChild(pip);
      }

      // ── Drag & Drop — edit mode only ──────────────────────────────────────
      if (isEditMode) {
        a.draggable = true;
        a.classList.add('draggable');

        a.addEventListener('dragstart', e => {
          // Don't drag if a title is being renamed
          if (a.querySelector('[data-renaming]')) { e.preventDefault(); return; }
          dragSrcIndex = shortcuts.indexOf(shortcut);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(dragSrcIndex));
          a.classList.add('dragging');
        });

        a.addEventListener('dragover',  e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
        a.addEventListener('dragenter', () => a.classList.add('drag-over'));
        a.addEventListener('dragleave', () => a.classList.remove('drag-over'));

        a.addEventListener('drop', e => {
          e.stopPropagation();
          const targetIdx = shortcuts.indexOf(shortcut);
          if (dragSrcIndex !== null && dragSrcIndex !== targetIdx) {
            const dragged = shortcuts.splice(dragSrcIndex, 1)[0];
            shortcuts.splice(targetIdx, 0, dragged);
            dragSrcIndex = null;
            saveShortcuts(() => renderGrid());
          }
        });

        a.addEventListener('dragend', () => {
          a.classList.remove('dragging');
          document.querySelectorAll('.shortcut-item').forEach(el => el.classList.remove('drag-over'));
        });
      }

      a.appendChild(iconWrapper);
      a.appendChild(title);
      gridContainer.appendChild(a);
    });
  }

  // ── Open shortcut + track usage ────────────────────────────────────────────
  function openShortcut(url) {
    // Track
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

  // ── Search ─────────────────────────────────────────────────────────────────
  let searchDebounce = null;
  searchInput.addEventListener('input', () => {
    if (isEditMode) setEditMode(false);
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => renderGrid(), 80);
  });

  // ── Keyboard navigation ────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isEditMode) { setEditMode(false); return; }

    const items = [...gridContainer.querySelectorAll('.shortcut-item')];
    if (!items.length) return;

    if (['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)) {
      if (document.activeElement === searchInput && e.key === 'ArrowDown') {
        e.preventDefault(); focusedIndex = 0; items[0].focus(); return;
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

    // Hotkey launch 1–9 (normal mode only)
    if (!isEditMode) {
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        const list = getDisplayList();
        if (num <= list.length) {
          e.preventDefault();
          openShortcut(list[num - 1].url);
          window.close();
        }
      }
    }

    // Typing anywhere refocuses search
    if (!isEditMode && e.key.length === 1 && !e.ctrlKey && !e.metaKey && document.activeElement !== searchInput) {
      searchInput.focus();
    }
  });

  // ── Quick Add ──────────────────────────────────────────────────────────────
  quickAddBtn.addEventListener('click', () => {
    if (isEditMode) setEditMode(false);
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (chrome.runtime.lastError || !tabs[0]) return;
      const tab = tabs[0];
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        showPopupToast('Cannot add this page type.', 'error'); return;
      }
      currentTabInfo = {
        title: tab.title || new URL(tab.url).hostname,
        url:   tab.url,
        icon:  tab.favIconUrl || '',
      };
      qaIcon.src = currentTabInfo.icon;
      qaIcon.style.display = currentTabInfo.icon ? 'block' : 'none';
      qaTitle.textContent = currentTabInfo.title;
      qaUrl.textContent   = currentTabInfo.url;
      quickAddToast.style.display = 'block';
    });
  });

  qaConfirmBtn.addEventListener('click', () => {
    if (!currentTabInfo) return;
    const exists = shortcuts.some(s => {
      try { return new URL(s.url).hostname === new URL(currentTabInfo.url).hostname; }
      catch { return false; }
    });
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

  // ── Export ─────────────────────────────────────────────────────────────────
  exportBtn.addEventListener('click', () => {
    const payload = {
      version:    '2.2',
      exportedAt: new Date().toISOString(),
      shortcuts,
      usageCounts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `quicklaunch-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showPopupToast(`Exported ${shortcuts.length} shortcut${shortcuts.length === 1 ? '' : 's'}`);
  });

  // ── Import ─────────────────────────────────────────────────────────────────
  importBtn.addEventListener('click', () => importFileInput.click());

  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files[0];
    if (!file) return;
    importFileInput.value = ''; // reset so same file can be re-picked

    const reader = new FileReader();
    reader.onload = e => {
      let parsed;
      try {
        parsed = JSON.parse(e.target.result);
      } catch {
        showPopupToast('Invalid JSON file.', 'error'); return;
      }

      // Validate: must have a shortcuts array
      if (!parsed || !Array.isArray(parsed.shortcuts)) {
        showPopupToast('File has no shortcuts array.', 'error'); return;
      }

      // Sanitise entries — require at minimum a url field
      const incoming = parsed.shortcuts.filter(s => s && typeof s.url === 'string' && s.url.trim());
      if (incoming.length === 0) {
        showPopupToast('No valid shortcuts found.', 'error'); return;
      }

      const newCount = incoming.filter(s => !shortcuts.some(e => e.url === s.url)).length;

      // Merge: add only shortcuts whose URL isn't already present
      let added = 0;
      incoming.forEach(s => {
        if (!shortcuts.some(e => e.url === s.url)) {
          shortcuts.push({ title: s.title || new URL(s.url).hostname, url: s.url, icon: s.icon || '' });
          added++;
        }
      });

      // Merge usage counts if present
      if (parsed.usageCounts && typeof parsed.usageCounts === 'object') {
        Object.entries(parsed.usageCounts).forEach(([url, count]) => {
          if (typeof count === 'number') {
            usageCounts[url] = (usageCounts[url] || 0) + count;
          }
        });
        saveUsageCounts();
      }

      saveShortcuts(() => {
        renderGrid();
        const skipped = incoming.length - added;
        let msg = `Imported ${added} shortcut${added !== 1 ? 's' : ''}`;
        if (skipped > 0) msg += ` (${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped)`;
        showPopupToast(msg);
      });
    };
    reader.onerror = () => showPopupToast('Could not read file.', 'error');
    reader.readAsText(file);
  });

  // ── Settings / navigation ──────────────────────────────────────────────────
  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  addFirstBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

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

  setTimeout(() => searchInput.focus(), 80);
});
