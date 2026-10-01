// options.js — QuickLaunch v2.7

document.addEventListener('DOMContentLoaded', () => {
  // ── Element refs ──────────────────────────────────────────────────────────
  const navLinks        = document.querySelectorAll('.nav-link');
  const sections        = document.querySelectorAll('.content section');
  const rowsInput       = document.getElementById('rows');
  const colsInput       = document.getElementById('cols');
  const showTitlesCb    = document.getElementById('showTitles');
  const showBadgesCb    = document.getElementById('showBadges');
  const fontSizeInput   = document.getElementById('fontSize');
  const fontSizeDisplay = document.getElementById('fontSizeDisplay');
  const gridGapInput    = document.getElementById('gridGap');
  const gridGapDisplay  = document.getElementById('gridGapDisplay');
  const popupWidthInput = document.getElementById('popupWidth');
  const popupWidthDisp  = document.getElementById('popupWidthDisplay');
  const themeControl    = document.getElementById('themeControl');
  const iconSizeControl = document.getElementById('iconSizeControl');
  const openTabSelect   = document.getElementById('open-tab');
  const hotkeyActionSelect = document.getElementById('hotkeyAction');
  const keepOpenAfterCopyCb = document.getElementById('keepOpenAfterCopy');
  const searchPositionControl = document.getElementById('searchPositionControl');

  const workspacesList  = document.getElementById('workspacesList');
  const newWsInput      = document.getElementById('newWsInput');
  const addWsBtn        = document.getElementById('addWsBtn');

  const shortcutsList   = document.getElementById('shortcutsList');
  const addShortcutBtn  = document.getElementById('addShortcutBtn');

  const snippetsList    = document.getElementById('snippetsList');
  const addSnippetBtn   = document.getElementById('addSnippetBtn');

  const editModal       = document.getElementById('editModal');
  const modalTitle      = document.getElementById('modalTitle');
  const shortcutTitleIn = document.getElementById('shortcutTitle');
  const shortcutUrlIn   = document.getElementById('shortcutUrl');
  const shortcutWorkspace = document.getElementById('shortcutWorkspace');
  const editIndexInput  = document.getElementById('editIndex');
  const editIconData    = document.getElementById('editIconData');
  const cancelModalBtn  = document.getElementById('cancelModalBtn');
  const saveModalBtn    = document.getElementById('saveModalBtn');
  const fetchFaviconBtn = document.getElementById('fetchFaviconBtn');
  const faviconPreview  = document.getElementById('faviconPreview');
  const faviconImg      = document.getElementById('faviconImg');
  const faviconStatus   = document.getElementById('faviconStatus');

  const snippetModal    = document.getElementById('snippetModal');
  const modalSnippetTitle = document.getElementById('modalSnippetTitle');
  const modalSnippetText  = document.getElementById('modalSnippetText');
  const editSnippetId   = document.getElementById('editSnippetId');
  const cancelSnippetModalBtn = document.getElementById('cancelSnippetModalBtn');
  const saveSnippetModalBtn   = document.getElementById('saveSnippetModalBtn');

  const exportBtn       = document.getElementById('exportBtn');
  const importFile      = document.getElementById('importFile');
  document.getElementById('importDataBtn').addEventListener('click', () => importFile.click());
  const resetUsageBtn   = document.getElementById('resetUsageBtn');
  const resetAllBtn     = document.getElementById('resetAllBtn');

  const toast           = document.getElementById('toast');

  // Preview elements
  const previewGrid     = document.getElementById('previewGrid');

  // Shape radio buttons
  const shapeRadios     = document.querySelectorAll('input[name="iconShape"]');

  // ── State ─────────────────────────────────────────────────────────────────
  const defaultSettings = {
    rows: 4, cols: 4,
    showTitles: true,
    fontSize: 12, gridGap: 16,
    theme: 'dark',
    popupWidth: 380,
    iconShape: 'circle',
    iconSize: 48,
    openInNewTab: true,
    showBadges: true,
    hotkeyAction: 'launch',
    keepOpenAfterCopy: false,
    workspaces: []
  };
  let settings = { ...defaultSettings };
  let shortcuts = [];
  let snippets = [];
  let usageCounts = {};
  let sortMode = 'manual';
  let shortcutModalOpener = null;
  let snippetModalOpener = null;
  let editingShortcut = null;
  const dragRecords = new WeakMap();

  // ── Load storage ──────────────────────────────────────────────────────────
  QuickLaunchStorage.get(['settings', 'shortcuts', 'snippets', 'searchPosition', 'usageCounts', 'sortMode'], (result) => {
    settings = QuickLaunchBackup.settings(result.settings, settings);
    const workspaceIds = new Set(settings.workspaces.map(w => w.id));
    shortcuts = QuickLaunchBackup.shortcuts(result.shortcuts, workspaceIds);
    snippets = QuickLaunchBackup.snippets(result.snippets);
    if (['top', 'bottom'].includes(result.searchPosition)) settings.searchPosition = result.searchPosition;
    usageCounts = QuickLaunchBackup.usageCounts(result.usageCounts);
    if (['manual', 'most-used', 'az'].includes(result.sortMode)) sortMode = result.sortMode;

    applySettingsToUI();
    renderWorkspacesList();
    renderShortcutsList();
    renderSnippetsList();
  });

  function applySettingsToUI() {
    rowsInput.value = settings.rows;
    colsInput.value = settings.cols;
    showTitlesCb.checked = settings.showTitles;
    showBadgesCb.checked = settings.showBadges !== false;
    fontSizeInput.value  = settings.fontSize;
    gridGapInput.value   = settings.gridGap;
    popupWidthInput.value= settings.popupWidth;
    openTabSelect.value    = settings.openInNewTab ? 'new' : 'current';
    hotkeyActionSelect.value = settings.hotkeyAction || 'launch';
    keepOpenAfterCopyCb.checked = settings.keepOpenAfterCopy === true;

    // Theme segmented control
    setSegmented(themeControl, settings.theme || 'dark');
    applyThemeToPage(settings.theme || 'dark');

    // Icon size
    setSegmented(iconSizeControl, String(settings.iconSize || 48));

    // Icon shape
    const shapeVal = settings.iconShape || 'circle';
    shapeRadios.forEach(r => { r.checked = r.value === shapeVal; });
    document.querySelectorAll('.shape-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.value === shapeVal);
    });
    // Search position
    setSegmented(searchPositionControl, settings.searchPosition || 'top');

    updateDisplayValues();
    updatePreview();
  }

  function updateDisplayValues() {
    fontSizeDisplay.textContent = `${fontSizeInput.value}px`;
    gridGapDisplay.textContent  = `${gridGapInput.value}px`;
    popupWidthDisp.textContent  = `${popupWidthInput.value}px`;
  }

  // ── Input Sanitization ────────────────────────────────────────────────────
  function clampInput(input, min, max) {
    let val = parseInt(input.value);
    if (isNaN(val)) val = min;
    val = Math.max(min, Math.min(max, val));
    input.value = val;
    return val;
  }

  rowsInput.addEventListener('change', function() { clampInput(this, 1, 20); saveSettings(); updatePreview(); });
  colsInput.addEventListener('change', function() { clampInput(this, 1, 10); saveSettings(); updatePreview(); });

  // ── Theme application ─────────────────────────────────────────────────────
  function applyThemeToPage(theme) {
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'system') applyThemeToPage('system');
  });

  // ── Segmented controls ────────────────────────────────────────────────────
  function setSegmented(container, value) {
    container.querySelectorAll('.seg-btn').forEach(btn => {
      const selected = btn.dataset.value === value;
      btn.classList.toggle('active', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
  }

  themeControl.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    settings.theme = btn.dataset.value;
    setSegmented(themeControl, settings.theme);
    applyThemeToPage(settings.theme);
    saveSettings();
  });

  iconSizeControl.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    settings.iconSize = parseInt(btn.dataset.value);
    setSegmented(iconSizeControl, btn.dataset.value);
    updatePreview();
    saveSettings();
  });

  searchPositionControl.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    settings.searchPosition = btn.dataset.value;
    setSegmented(searchPositionControl, settings.searchPosition);
    QuickLaunchStorage.set({ searchPosition: settings.searchPosition }, () => showToast());
  });

  // ── Icon shape ────────────────────────────────────────────────────────────
  shapeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      settings.iconShape = radio.value;
      document.querySelectorAll('.shape-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === radio.value);
      });
      updatePreview();
      saveSettings();
    });
  });

  // ── Slider + inputs live update ───────────────────────────────────────────
  fontSizeInput.addEventListener('input', () => { updateDisplayValues(); updatePreview(); });
  fontSizeInput.addEventListener('change', saveSettings);

  gridGapInput.addEventListener('input', () => { updateDisplayValues(); updatePreview(); });
  gridGapInput.addEventListener('change', saveSettings);

  popupWidthInput.addEventListener('input', () => { updateDisplayValues(); updatePreview(); });
  popupWidthInput.addEventListener('change', saveSettings);

  showTitlesCb.addEventListener('change', () => { updatePreview(); saveSettings(); });
  showBadgesCb.addEventListener('change', saveSettings);
  openTabSelect.addEventListener('change', saveSettings);
  hotkeyActionSelect.addEventListener('change', saveSettings);
  keepOpenAfterCopyCb.addEventListener('change', saveSettings);

  // ── Optional clipboard permission ─────────────────────────────────────────
  // clipboardRead is optional so it costs no install-time warning. It must be
  // requested from here rather than the popup, because the permission prompt
  // dismisses the popup before the user can answer it.
  const clipboardReadToggle = document.getElementById('clipboardReadToggle');

  function refreshClipboardToggle(done = () => {}) {
    clipboardReadToggle.disabled = true;
    try {
      chrome.permissions.contains({ permissions: ['clipboardRead'] }, granted => {
        if (chrome.runtime.lastError) {
          showToast('Could not check clipboard access. Reload Settings to try again.');
          done(false);
          return;
        }
        clipboardReadToggle.checked = !!granted;
        clipboardReadToggle.disabled = false;
        done(true);
      });
    } catch {
      showToast('Could not check clipboard access. Reload Settings to try again.');
      done(false);
    }
  }
  refreshClipboardToggle();

  clipboardReadToggle.addEventListener('change', () => {
    const enable = clipboardReadToggle.checked;
    clipboardReadToggle.disabled = true;
    try {
      chrome.permissions[enable ? 'request' : 'remove']({ permissions: ['clipboardRead'] }, granted => {
        const error = chrome.runtime.lastError;
        refreshClipboardToggle(checked => {
          if (!checked) return;
          showToast(error ? 'Could not change clipboard access. Try again.'
            : enable ? (granted ? 'Clipboard access enabled' : 'Clipboard access denied')
            : granted ? 'Clipboard access removed' : 'Could not remove clipboard access. Try again.');
        });
      });
    } catch {
      refreshClipboardToggle(checked => { if (checked) showToast('Could not change clipboard access. Try again.'); });
    }
  });

  // ── Save settings ─────────────────────────────────────────────────────────
  function saveSettings() {
    settings = {
      ...settings,
      rows: Math.min(20, Math.max(1, parseInt(rowsInput.value) || 4)),
      cols: Math.min(10, Math.max(1, parseInt(colsInput.value) || 4)),
      showTitles: showTitlesCb.checked,
      fontSize: parseInt(fontSizeInput.value) || 12,
      gridGap: parseInt(gridGapInput.value) || 16,
      popupWidth: Math.min(560, Math.max(300, parseInt(popupWidthInput.value) || 380)),
      iconSize: settings.iconSize,
      iconShape: settings.iconShape,
      theme: settings.theme,
      openInNewTab: openTabSelect.value === 'new',
      hotkeyAction: hotkeyActionSelect.value,
      keepOpenAfterCopy: keepOpenAfterCopyCb.checked,
      showBadges: showBadgesCb.checked,
    };
    QuickLaunchStorage.set({ settings }, () => {
      showToast(chrome.runtime.lastError ? 'Could not save settings.' : 'Saved!');
    });
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  function updatePreview() {
    const size = settings.iconSize || 48;
    const shapeMap = { circle: '50%', rounded: '14px', square: '4px' };
    const radius = shapeMap[settings.iconShape || 'circle'];

    previewGrid.querySelectorAll('.preview-icon').forEach(el => {
      el.style.width  = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = radius;
    });

    const showTitle = showTitlesCb.checked;
    previewGrid.querySelectorAll('.preview-title').forEach(el => {
      el.style.display   = showTitle ? 'block' : 'none';
      el.style.fontSize  = `${fontSizeInput.value}px`;
    });

    const width = Number(popupWidthInput.value) || 380;
    const gap = Number(gridGapInput.value) || 16;
    const columns = Math.max(1, Math.min(Number(colsInput.value) || 4,
      Math.floor((width - 30 + gap) / (size + 14 + gap))));
    // The preview remains readable in a narrow Settings panel; the summary
    // reports the actual popup's adapted column count rather than overstating it.
    previewGrid.style.gridTemplateColumns = `repeat(${Math.min(columns, 3)}, minmax(0, 1fr))`;
    previewGrid.style.gap = `${Math.min(gap, 20)}px`;
    document.getElementById('previewSummary').textContent = `${width}px popup · ${columns} ${columns === 1 ? 'column' : 'columns'}`;

    fontSizeDisplay.textContent = `${fontSizeInput.value}px`;
    gridGapDisplay.textContent  = `${gridGapInput.value}px`;
    popupWidthDisp.textContent  = `${popupWidthInput.value}px`;
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  navLinks.forEach(link => {
    link.title = link.textContent.trim();
    link.setAttribute('aria-current', link.classList.contains('active') ? 'page' : 'false');
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      navLinks.forEach(l => { l.classList.remove('active'); l.setAttribute('aria-current', 'false'); });
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
      sections.forEach(s => { s.style.display = s.id === targetId ? 'block' : 'none'; });
      document.querySelector('.content').scrollTop = 0;
    });
  });

  // ── Workspaces List (Reorder & Rename) ────────────────────────────────────
  function renderWorkspacesList() {
    workspacesList.innerHTML = '';
    settings.workspaces.forEach((ws, index) => {
      const item = document.createElement('div');
      item.className = 'list-item';
      dragRecords.set(item, ws);
      item.draggable = false;
      item.dataset.index = index;

      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle';
      dragHandle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;

      const titleDiv = document.createElement('div');
      titleDiv.className = 'item-title';
      titleDiv.textContent = ws.name;

      const actionsCol = document.createElement('div');
      actionsCol.className = 'item-actions';

      // Rename Button
      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.title = 'Rename Workspace';
      editBtn.setAttribute('aria-label', `Rename workspace ${ws.name}`);
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      editBtn.onclick = () => {
        titleDiv.contentEditable = 'true';
        titleDiv.style.outline = '1px solid var(--accent-color)';
        titleDiv.style.padding = '2px 6px';
        titleDiv.style.borderRadius = '4px';
        titleDiv.focus();
        
        const range = document.createRange();
        range.selectNodeContents(titleDiv);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        const finishRename = () => {
          titleDiv.contentEditable = 'false';
          titleDiv.style.outline = 'none';
          titleDiv.style.padding = '0';
          const newName = titleDiv.textContent.trim();
          if (newName && newName !== ws.name) {
            ws.name = newName;
            saveSettings();
            renderWorkspacesList();
            renderShortcutsList(); // Update inline badges
          } else {
            titleDiv.textContent = ws.name;
          }
        };

        titleDiv.onblur = finishRename;
        titleDiv.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); titleDiv.blur(); } };
      };
      actionsCol.appendChild(editBtn);

      // Delete Button (Disabled for default workspace)
      if (ws.id !== 'w_default') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete';
        deleteBtn.title = 'Delete';
        deleteBtn.setAttribute('aria-label', `Delete workspace ${ws.name}`);
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
        deleteBtn.onclick = () => {
          if (confirm(`Delete workspace "${ws.name}"? Shortcuts assigned to it will be moved to the Main workspace.`)) {
            settings.workspaces = settings.workspaces.filter(w => w.id !== ws.id);
            shortcuts.forEach(s => { if (s.workspaceId === ws.id) s.workspaceId = 'w_default'; });
            QuickLaunchStorage.set({ settings, shortcuts }, () => {
              renderWorkspacesList();
              renderShortcutsList();
              showToast('Workspace deleted');
            });
          }
        };
        actionsCol.appendChild(deleteBtn);
      }

      // Reordering via pointer events on the drag handle
      dragHandle.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        if (titleDiv.isContentEditable) return;
        e.preventDefault();

        const startY  = e.clientY;
        let dragging  = false;
        let dropTarget = null;

        let scrollInterval = null;
        let lastClientX = e.clientX;
        let lastClientY = e.clientY;
        const scrollContainer = document.querySelector('.content');

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
          item.style.opacity = '0.01';
          item.style.pointerEvents = 'none';
          const below = document.elementFromPoint(clientX, clientY);
          item.style.opacity = '';
          item.style.pointerEvents = '';
          const over = below ? below.closest('#workspacesList .list-item') : null;
          if (over !== dropTarget) {
            if (dropTarget) dropTarget.classList.remove('drag-target');
            dropTarget = (over && over !== item) ? over : null;
            if (dropTarget) dropTarget.classList.add('drag-target');
          }
        };

        const onMove = ev => {
          lastClientX = ev.clientX;
          lastClientY = ev.clientY;

          if (!dragging) {
            if (Math.abs(ev.clientY - startY) < 6) return;
            dragging = true;
            item.classList.add('sortable-ghost');
          }

          hitTest(ev.clientX, ev.clientY);

          if (scrollContainer) {
            const rect = scrollContainer.getBoundingClientRect();
            const threshold = 40;
            const maxSpeed = 12;
            if (ev.clientY < rect.top + threshold) {
              const ratio = (rect.top + threshold - ev.clientY) / threshold;
              startAutoScroll(scrollContainer, -maxSpeed * Math.min(ratio, 1.5));
            } else if (ev.clientY > rect.bottom - threshold) {
              const ratio = (ev.clientY - (rect.bottom - threshold)) / threshold;
              startAutoScroll(scrollContainer, maxSpeed * Math.min(ratio, 1.5));
            } else {
              stopAutoScroll();
            }
          }
        };

        const onUp = () => {
          stopAutoScroll();
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onCancel);
          window.removeEventListener('blur', onCancel);
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#workspacesList .list-item').forEach(el => el.classList.remove('drag-target'));

          if (dragging && dropTarget && item.isConnected && dropTarget.isConnected &&
              !QuickLaunchStorage.blocked && !QuickLaunchStorage.busy) {
            const fromIdx = settings.workspaces.indexOf(ws);
            const toIdx = settings.workspaces.indexOf(dragRecords.get(dropTarget));
            if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
              const [moved] = settings.workspaces.splice(fromIdx, 1);
              settings.workspaces.splice(toIdx, 0, moved);
              saveSettings();
              renderWorkspacesList();
            }
          }
        };

        const onCancel = () => {
          stopAutoScroll();
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onCancel);
          window.removeEventListener('blur', onCancel);
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#workspacesList .list-item').forEach(el => el.classList.remove('drag-target'));
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onCancel);
        window.addEventListener('blur', onCancel, { once: true });
      });

      item.append(dragHandle, titleDiv, actionsCol);
      workspacesList.appendChild(item);
    });
  }

  addWsBtn.addEventListener('click', () => {
    if (settings.workspaces.length >= 10) return showToast('Maximum 10 workspaces allowed');
    const name = newWsInput.value.trim();
    if (!name) return;
    settings.workspaces.push({ id: 'w_' + crypto.randomUUID(), name });
    newWsInput.value = '';
    saveSettings();
    renderWorkspacesList();
  });

  // ── Shortcuts list ────────────────────────────────────────────────────────
  function renderShortcutsList() {
    shortcutsList.innerHTML = '';
    if (shortcuts.length === 0) {
      shortcutsList.innerHTML = '<div class="empty-list">No shortcuts yet. Click "+ Add Shortcut" to get started.</div>';
      return;
    }
    shortcuts.forEach((shortcut, index) => {
      const item = document.createElement('div');
      item.className = 'list-item';
      dragRecords.set(item, shortcut);
      item.dataset.index = index;

      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle';
      dragHandle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;

      const titleCol = document.createElement('div');
      titleCol.className = 'item-title';
      const iconDiv = document.createElement('div');
      iconDiv.className = 'item-icon';
      
      // Prevent DOM XSS vector
      const iconSrc = QuickLaunchBackup.safeIcon(shortcut.icon)
        ? shortcut.icon
        : (shortcut.url ? localFaviconUrl(shortcut.url) : '');
      if (iconSrc) {
        const img = document.createElement('img');
        img.src = iconSrc;
        img.onerror = function() { this.style.display = 'none'; };
        iconDiv.appendChild(img);
      } else {
        iconDiv.textContent = (shortcut.title || '?').charAt(0).toUpperCase();
        iconDiv.style.fontWeight = 'bold';
        iconDiv.style.fontSize = '10px';
      }
      
      const ws = settings.workspaces.find(w => w.id === (shortcut.workspaceId || 'w_default'));
      const wsName = ws ? ws.name : 'Main';

      const wsBadge = document.createElement('span');
      wsBadge.className = 'ws-badge';
      wsBadge.textContent = wsName;

      const titleText = document.createElement('span');
      titleText.textContent = shortcut.title;

      titleCol.appendChild(iconDiv);
      titleCol.appendChild(wsBadge);
      titleCol.appendChild(titleText);

      const urlCol = document.createElement('div');
      urlCol.className = 'item-url';
      urlCol.textContent = shortcut.url;
      urlCol.title = shortcut.url;

      const actionsCol = document.createElement('div');
      actionsCol.className = 'item-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.title = 'Edit';
      editBtn.setAttribute('aria-label', `Edit ${shortcut.title}`);
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      editBtn.onclick = () => openModal(shortcut);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn delete';
      deleteBtn.title = 'Delete';
      deleteBtn.setAttribute('aria-label', `Delete ${shortcut.title}`);
      deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      deleteBtn.onclick = () => {
        const currentIndex = shortcuts.indexOf(shortcut);
        if (currentIndex < 0) return;
        if (confirm(`Delete "${shortcut.title}"?`)) {
          shortcuts.splice(currentIndex, 1);
          QuickLaunchStorage.set({ shortcuts }, () => {
            renderShortcutsList();
            showToast('Shortcut deleted');
          });
        }
      };

      actionsCol.appendChild(editBtn);
      actionsCol.appendChild(deleteBtn);

      item.append(dragHandle, titleCol, urlCol, actionsCol);

      // Reordering via pointer events on the drag handle
      dragHandle.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault();

        const startY  = e.clientY;
        let dragging  = false;
        let dropTarget = null;

        let scrollInterval = null;
        let lastClientX = e.clientX;
        let lastClientY = e.clientY;
        const scrollContainer = document.querySelector('.content');

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
          item.style.opacity = '0.01';
          item.style.pointerEvents = 'none';
          const below = document.elementFromPoint(clientX, clientY);
          item.style.opacity = '';
          item.style.pointerEvents = '';
          const over = below ? below.closest('#shortcutsList .list-item') : null;
          if (over !== dropTarget) {
            if (dropTarget) dropTarget.classList.remove('drag-target');
            dropTarget = (over && over !== item) ? over : null;
            if (dropTarget) dropTarget.classList.add('drag-target');
          }
        };

        const onMove = ev => {
          lastClientX = ev.clientX;
          lastClientY = ev.clientY;

          if (!dragging) {
            if (Math.abs(ev.clientY - startY) < 6) return;
            dragging = true;
            item.classList.add('sortable-ghost');
          }

          hitTest(ev.clientX, ev.clientY);

          if (scrollContainer) {
            const rect = scrollContainer.getBoundingClientRect();
            const threshold = 40;
            const maxSpeed = 12;
            if (ev.clientY < rect.top + threshold) {
              const ratio = (rect.top + threshold - ev.clientY) / threshold;
              startAutoScroll(scrollContainer, -maxSpeed * Math.min(ratio, 1.5));
            } else if (ev.clientY > rect.bottom - threshold) {
              const ratio = (ev.clientY - (rect.bottom - threshold)) / threshold;
              startAutoScroll(scrollContainer, maxSpeed * Math.min(ratio, 1.5));
            } else {
              stopAutoScroll();
            }
          }
        };

        const onUp = () => {
          stopAutoScroll();
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onCancel);
          window.removeEventListener('blur', onCancel);
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#shortcutsList .list-item').forEach(el => el.classList.remove('drag-target'));

          if (dragging && dropTarget && item.isConnected && dropTarget.isConnected &&
              !QuickLaunchStorage.blocked && !QuickLaunchStorage.busy) {
            const fromIdx = shortcuts.indexOf(shortcut);
            const toIdx = shortcuts.indexOf(dragRecords.get(dropTarget));
            if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
              const [moved] = shortcuts.splice(fromIdx, 1);
              shortcuts.splice(toIdx, 0, moved);
              QuickLaunchStorage.set({ shortcuts }, renderShortcutsList);
            }
          }
        };

        const onCancel = () => {
          stopAutoScroll();
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onCancel);
          window.removeEventListener('blur', onCancel);
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#shortcutsList .list-item').forEach(el => el.classList.remove('drag-target'));
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onCancel);
        window.addEventListener('blur', onCancel, { once: true });
      });

      shortcutsList.appendChild(item);
    });
  }

  // ── Snippets ───────────────────────────────────────────────────────────────
  function renderSnippetsList() {
    snippetsList.innerHTML = '';
    
    if (snippets.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.padding = '16px';
      emptyMsg.style.color = 'var(--text-secondary)';
      emptyMsg.style.fontSize = '13px';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.textContent = 'No snippets yet.';
      snippetsList.appendChild(emptyMsg);
      return;
    }

    snippets.forEach((snippet, index) => {
      const item = document.createElement('div');
      item.className = 'list-item snippet-list-item';
      dragRecords.set(item, snippet);

      const titleCol = document.createElement('div');
      titleCol.className = 'snippet-list-title';
      titleCol.textContent = snippet.title;

      const textCol = document.createElement('div');
      textCol.className = 'snippet-list-preview';
      
      const textPreview = document.createElement('div');
      textPreview.style.color = 'var(--text-secondary)';
      textPreview.style.whiteSpace = 'nowrap';
      textPreview.style.overflow = 'hidden';
      textPreview.style.textOverflow = 'ellipsis';
      textPreview.textContent = snippet.text.length > 240 ? snippet.text.slice(0, 240) + '…' : snippet.text;
      textCol.appendChild(textPreview);

      if (snippet.tags && snippet.tags.length > 0) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'snippet-list-tags';
        snippet.tags.forEach(tag => {
          const pill = document.createElement('span');
          pill.textContent = tag;
          pill.className = 'snippet-list-tag';
          tagsContainer.appendChild(pill);
        });
        textCol.appendChild(tagsContainer);
      }

      const actions = document.createElement('div');
      actions.className = 'actions snippet-list-actions';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'action-btn';
      editBtn.title = 'Edit Snippet';
      editBtn.setAttribute('aria-label', `Edit snippet ${snippet.title}`);
      editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      editBtn.addEventListener('click', () => openSnippetModal(snippet));

      const delBtn = document.createElement('button');
      delBtn.className = 'action-btn delete-btn';
      delBtn.title = 'Delete Snippet';
      delBtn.setAttribute('aria-label', `Delete snippet ${snippet.title}`);
      delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      delBtn.addEventListener('click', () => {
        const currentIndex = snippets.findIndex(s => s.id === snippet.id);
        if (currentIndex < 0) return;
        if (confirm('Delete this snippet?')) {
          snippets.splice(currentIndex, 1);
          QuickLaunchStorage.set({ snippets }, renderSnippetsList);
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      item.appendChild(titleCol);
      item.appendChild(textCol);
      item.appendChild(actions);

      // Simple pointer-based drag-and-drop for snippets
      item.dataset.index = index;
      const dragHandle = document.createElement('div');
      dragHandle.style.position = 'absolute';
      dragHandle.style.left = '0';
      dragHandle.style.top = '0';
      dragHandle.style.width = '100%';
      dragHandle.style.height = '100%';
      dragHandle.style.cursor = 'grab';
      dragHandle.style.zIndex = '1';
      
      titleCol.style.position = 'relative';
      titleCol.style.zIndex = '2';
      titleCol.style.pointerEvents = 'none';
      textCol.style.position = 'relative';
      textCol.style.zIndex = '2';
      textCol.style.pointerEvents = 'none';
      actions.style.position = 'relative';
      actions.style.zIndex = '3';

      item.appendChild(dragHandle);

      dragHandle.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        if (e.target.closest('.action-btn')) return;
        e.preventDefault();
        let dragging = false;
        let dropTarget = null;

        const scrollContainer = snippetsList;
        let scrollInterval = null;
        let lastClientY = e.clientY;

        const startAutoScroll = (container, speed) => {
          if (scrollInterval) clearInterval(scrollInterval);
          scrollInterval = setInterval(() => { container.scrollTop += speed; }, 16);
        };

        const stopAutoScroll = () => {
          if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; }
        };

        const onMove = ev => {
          lastClientY = ev.clientY;
          if (!dragging && Math.abs(ev.clientY - e.clientY) > 5) {
            dragging = true;
            item.classList.add('sortable-ghost');
          }
          if (!dragging) return;
          
          document.querySelectorAll('#snippetsList .list-item').forEach(el => el.classList.remove('drag-target'));
          
          dragHandle.style.display = 'none';
          const elemBelow = document.elementFromPoint(ev.clientX, ev.clientY);
          dragHandle.style.display = 'block';
          
          dropTarget = elemBelow ? elemBelow.closest('#snippetsList .list-item') : null;
          if (dropTarget && dropTarget !== item) {
            dropTarget.classList.add('drag-target');
          }

          if (scrollContainer) {
            const rect = scrollContainer.getBoundingClientRect();
            const threshold = 40;
            const maxSpeed = 12;
            if (ev.clientY < rect.top + threshold) {
              const ratio = (rect.top + threshold - ev.clientY) / threshold;
              startAutoScroll(scrollContainer, -maxSpeed * Math.min(ratio, 1.5));
            } else if (ev.clientY > rect.bottom - threshold) {
              const ratio = (ev.clientY - (rect.bottom - threshold)) / threshold;
              startAutoScroll(scrollContainer, maxSpeed * Math.min(ratio, 1.5));
            } else {
              stopAutoScroll();
            }
          }
        };

        const onUp = () => {
          stopAutoScroll();
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onCancel);
          window.removeEventListener('blur', onCancel);
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#snippetsList .list-item').forEach(el => el.classList.remove('drag-target'));

          if (dragging && dropTarget && item.isConnected && dropTarget.isConnected &&
              !QuickLaunchStorage.blocked && !QuickLaunchStorage.busy) {
            const fromIdx = snippets.indexOf(snippet);
            const toIdx = snippets.indexOf(dragRecords.get(dropTarget));
            if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
              const [moved] = snippets.splice(fromIdx, 1);
              snippets.splice(toIdx, 0, moved);
              QuickLaunchStorage.set({ snippets }, renderSnippetsList);
            }
          }
        };

        const onCancel = () => {
          stopAutoScroll();
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onCancel);
          window.removeEventListener('blur', onCancel);
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#snippetsList .list-item').forEach(el => el.classList.remove('drag-target'));
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onCancel);
        window.addEventListener('blur', onCancel, { once: true });
      });

      snippetsList.appendChild(item);
    });
  }

  // ── Snippet Modal Handlers ─────────────────────────────────────────────────
  addSnippetBtn.addEventListener('click', () => openSnippetModal());
  cancelSnippetModalBtn.addEventListener('click', closeSnippetModal);
  snippetModal.addEventListener('click', e => { if (e.target === snippetModal) closeSnippetModal(); });

  function openSnippetModal(snippet = null) {
    snippetModalOpener = document.activeElement;
    if (snippet) {
      editSnippetId.value = snippet.id;
      modalSnippetTitle.value = snippet.title;
      modalSnippetText.value = snippet.text;
      document.getElementById('modalSnippetTags').value = snippet.tags ? snippet.tags.join(', ') : '';
      document.getElementById('snippetModalTitle').textContent = 'Edit Snippet';
    } else {
      editSnippetId.value = '';
      modalSnippetTitle.value = '';
      modalSnippetText.value = '';
      document.getElementById('modalSnippetTags').value = '';
      document.getElementById('snippetModalTitle').textContent = 'Add Snippet';
    }
    snippetModal.style.display = 'flex';
    modalSnippetTitle.focus();
  }

  function closeSnippetModal() {
    snippetModal.style.display = 'none';
    (snippetModalOpener?.isConnected ? snippetModalOpener : addSnippetBtn).focus();
  }

  saveSnippetModalBtn.addEventListener('click', () => {
    const newTitle = modalSnippetTitle.value.trim();
    const newText = modalSnippetText.value;
    const tagsRaw = document.getElementById('modalSnippetTags').value;
    const newTags = tagsRaw.split(',').map(t => t.trim()).filter(t => t !== '');
    
    if (!newTitle || !newText.trim()) {
      showToast('Title and Text are required.', true);
      return;
    }

    const id = editSnippetId.value;
    if (id) {
      const target = snippets.find(s => s.id === id);
      if (!target) { showToast('This snippet was removed. Reopen the editor.'); return; }
      if (target) {
        target.title = newTitle;
        target.text = newText;
        target.tags = newTags;
      }
    } else {
      const newId = 'snip_' + crypto.randomUUID();
      snippets.push({
        id: newId,
        title: newTitle,
        text: newText,
        tags: newTags
      });
      editSnippetId.value = newId;
    }

    QuickLaunchStorage.set({ snippets }, () => {
      if (chrome.runtime.lastError) {
        showToast('Could not save snippet. Storage may be full.');
        return;
      }
      renderSnippetsList();
      closeSnippetModal();
      showToast('Snippet saved!');
    });
  });

  // ── Modal ─────────────────────────────────────────────────────────────────
  addShortcutBtn.addEventListener('click', () => openModal());
  cancelModalBtn.addEventListener('click', closeModal);
  editModal.addEventListener('click', e => { if (e.target === editModal) closeModal(); });

  function openModal(shortcut = null) {
    if (shortcut && !shortcuts.includes(shortcut)) { showToast('This shortcut was removed. Reopen the editor.'); return; }
    editingShortcut = shortcut;
    shortcutModalOpener = document.activeElement;
    faviconPreview.style.display = 'none';
    editIconData.value = '';

    shortcutWorkspace.innerHTML = '';
    settings.workspaces.forEach(ws => {
      const opt = document.createElement('option');
      opt.value = ws.id;
      opt.textContent = ws.name;
      shortcutWorkspace.appendChild(opt);
    });

    if (shortcut) {
      modalTitle.textContent    = 'Edit Shortcut';
      shortcutTitleIn.value     = shortcut.title;
      shortcutUrlIn.value       = shortcut.url;
      shortcutWorkspace.value   = shortcut.workspaceId || 'w_default';
      editIndexInput.value      = shortcuts.indexOf(shortcut);
      editIconData.value        = shortcut.icon || '';
      if (shortcut.url) {
        faviconImg.src            = QuickLaunchBackup.safeIcon(shortcut.icon)
          ? shortcut.icon
          : localFaviconUrl(shortcut.url);
        faviconStatus.textContent = 'Current icon';
        faviconPreview.style.display = 'flex';
      }
    } else {
      modalTitle.textContent = 'Add Shortcut';
      shortcutTitleIn.value  = '';
      shortcutUrlIn.value    = '';
      shortcutWorkspace.value = 'w_default';
      editIndexInput.value   = '';
    }
    editModal.classList.add('active');
    shortcutTitleIn.focus();
  }

  function closeModal() {
    editModal.classList.remove('active');
    (shortcutModalOpener?.isConnected ? shortcutModalOpener : addShortcutBtn).focus();
  }

  // ── Favicon preview ───────────────────────────────────────────────────────
  // Resolved locally from Chrome's favicon cache (the `favicon` permission).
  // This previously hit https://www.google.com/s2/favicons and stored that
  // remote URL as the icon, which re-contacted Google on every popup render.
  function localFaviconUrl(pageUrl) {
    return chrome.runtime.getURL(
      `/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=64`
    );
  }

  fetchFaviconBtn.addEventListener('click', async () => {
    let url = shortcutUrlIn.value.trim();
    if (!url) return;
    url = QuickLaunchBackup.inputUrl(url);
    try {
      if (!url) throw new Error('Invalid URL');
      faviconImg.src = localFaviconUrl(url);
      faviconStatus.textContent = 'Icon from browser cache';
      faviconPreview.style.display = 'flex';

      if (!shortcutTitleIn.value) {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        shortcutTitleIn.value = hostname.split('.')[0].replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
      }
    } catch (e) {
      faviconStatus.textContent = 'Invalid URL';
    }
  });

  saveModalBtn.addEventListener('click', () => {
    const title = shortcutTitleIn.value.trim();
    let url = shortcutUrlIn.value.trim();
    if (editingShortcut && !shortcuts.includes(editingShortcut)) {
      showToast('This shortcut was removed. Reopen the editor.'); return;
    }

    if (!title || !url) { alert('Please fill in both title and URL.'); return; }
    url = QuickLaunchBackup.inputUrl(url);

    if (!url) { alert('Please enter a valid web URL.'); return; }

    if (shortcuts.some(s => s !== editingShortcut && s.url === url && (s.workspaceId || 'w_default') === shortcutWorkspace.value)) {
      showToast('This shortcut is already in this workspace.'); return;
    }
    const shortcutData = {
      title,
      url,
      icon: QuickLaunchBackup.safeIcon(editIconData.value) || '',
      workspaceId: shortcutWorkspace.value || 'w_default'
    };

    if (editingShortcut) {
      Object.assign(editingShortcut, shortcutData);
    } else {
      shortcuts.push(shortcutData);
      editingShortcut = shortcutData;
      editIndexInput.value = shortcuts.length - 1;
    }

    QuickLaunchStorage.set({ shortcuts }, () => {
      if (chrome.runtime.lastError) {
        showToast('Could not save shortcut. Storage may be full.');
        return;
      }
      renderShortcutsList();
      closeModal();
      showToast();
    });
  });

  // ── Import / Export ───────────────────────────────────────────────────────
  exportBtn.addEventListener('click', async () => {
    let saved;
    try { saved = await chrome.storage.local.get(['shortcuts', 'snippets', 'settings', 'usageCounts', 'sortMode', 'searchPosition']); }
    catch { showToast('Could not load data for export.'); return; }
    const data = QuickLaunchBackup.exportData(saved, defaultSettings, chrome.runtime.getManifest().version);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `quicklaunch-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export ready!');
  });

  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if ((shortcuts.length > 0 || snippets.length > 0) &&
        !confirm('Importing here REPLACES your existing shortcuts and snippets. Continue?\n\nTip: the Import button inside the popup merges instead.')) {
      importFile.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data || typeof data !== 'object' ||
            (!Array.isArray(data.shortcuts) && !Array.isArray(data.snippets))) {
          throw new Error('Not a QuickLaunch backup');
        }
        const next = QuickLaunchBackup.importData(data, { settings, shortcuts, snippets, usageCounts, sortMode }, 'replace', prefix => prefix + crypto.randomUUID());
        const { settings: nextSettings, shortcuts: nextShortcuts, snippets: nextSnippets,
          usageCounts: nextUsageCounts, sortMode: nextSortMode } = next;

        QuickLaunchStorage.set({
          shortcuts: nextShortcuts, snippets: nextSnippets, settings: nextSettings,
          usageCounts: nextUsageCounts, sortMode: nextSortMode,
          searchPosition: nextSettings.searchPosition || 'top', activeWorkspaceId: 'w_default'
        }, () => {
          if (chrome.runtime.lastError) {
            alert('Failed to save imported data. Storage may be full.');
            return;
          }
          shortcuts = nextShortcuts;
          snippets = nextSnippets;
          settings = nextSettings;
          usageCounts = nextUsageCounts;
          sortMode = nextSortMode;
          applySettingsToUI();
          renderShortcutsList();
          renderSnippetsList();
          renderWorkspacesList();
          showToast(next.skipped > 0 ? `Import successful (${next.skipped} invalid or duplicate items skipped).` : 'Import successful!');
        });
      } catch(err) {
        alert(err.message || 'Invalid QuickLaunch backup.');
      } finally {
        importFile.value = '';
      }
    };
    reader.onerror = () => {
      alert('Could not read the file. Please try again.');
      importFile.value = '';
    };
    if (file.size > QuickLaunchBackup.MAX_IMPORT_BYTES) { showToast('Backup is too large (maximum 5 MB).'); importFile.value = ''; return; }
    reader.readAsText(file);
  });

  // ── Reset Actions ─────────────────────────────────────────────────────────
  resetUsageBtn.addEventListener('click', () => {
    if (!confirm('Reset all usage counts? Your "Most-Used" sorting will start from scratch.')) return;
    QuickLaunchStorage.set({ usageCounts: {} }, () => {
      usageCounts = {};
      showToast('Usage counts reset');
    });
  });

  resetAllBtn.addEventListener('click', () => {
    if (!confirm('This will delete ALL shortcuts, snippets, and reset all settings. Are you sure?')) return;
    if (!confirm('Are you absolutely sure? This cannot be undone.')) return;
    QuickLaunchStorage.clear(() => {
      window.location.reload();
    });
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg = 'Saved!') {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (QuickLaunchStorage.blocked || e.isComposing || e.repeat) return;
    const isEditModalOpen = editModal.classList.contains('active');
    const isSnippetModalOpen = snippetModal.style.display === 'flex';

    if (e.key === 'Tab' && (isEditModalOpen || isSnippetModalOpen)) {
      const modal = isEditModalOpen ? editModal : snippetModal;
      const focusable = [...modal.querySelectorAll('button, input, select, textarea, [tabindex]')]
        .filter(el => !el.disabled && el.type !== 'hidden' && el.tabIndex >= 0 && getComputedStyle(el).display !== 'none');
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        e.preventDefault(); first?.focus();
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (isEditModalOpen) saveModalBtn.click();
      else if (isSnippetModalOpen) saveSnippetModalBtn.click();
    }
    
    if (e.key === 'Escape') {
      if (isEditModalOpen) cancelModalBtn.click();
      else if (isSnippetModalOpen) cancelSnippetModalBtn.click();
    }
  });
});
