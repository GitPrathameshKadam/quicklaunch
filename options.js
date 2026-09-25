// options.js — QuickLaunch v2.6

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
  const accentColorInput= document.getElementById('accentColor');
  const resetAccentBtn  = document.getElementById('resetAccentBtn');
  const openTabSelect   = document.getElementById('open-tab');
  const hotkeyActionSelect = document.getElementById('hotkeyAction');
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
  const resetUsageBtn   = document.getElementById('resetUsageBtn');
  const resetAllBtn     = document.getElementById('resetAllBtn');

  const toast           = document.getElementById('toast');

  // Preview elements
  const previewIconEl   = document.getElementById('previewIconEl');
  const previewTitleEl  = document.getElementById('previewTitleEl');
  const previewGrid     = document.getElementById('previewGrid');

  // Shape radio buttons
  const shapeRadios     = document.querySelectorAll('input[name="iconShape"]');

  // ── State ─────────────────────────────────────────────────────────────────
  let settings = {
    rows: 4, cols: 4,
    showTitles: true,
    fontSize: 12, gridGap: 16,
    theme: 'dark',
    popupWidth: 380,
    iconShape: 'circle',
    iconSize: 48,
    accentColor: '',
    openInNewTab: true,
    showBadges: true,
    hotkeyAction: 'launch',
    workspaces: []
  };
  let shortcuts = [];
  let snippets = [];
  let usageCounts = {};
  let sortMode = 'manual';

  // ── Default accent per theme ──────────────────────────────────────────────
  const DEFAULT_ACCENT = { dark: '#8ab4f8', light: '#1a73e8', system: '#8ab4f8' };

  // ── Load storage ──────────────────────────────────────────────────────────
  chrome.storage.local.get(['settings', 'shortcuts', 'snippets', 'searchPosition', 'usageCounts', 'sortMode'], (result) => {
    settings = QuickLaunchBackup.settings(result.settings, settings);
    const workspaceIds = new Set(settings.workspaces.map(w => w.id));
    shortcuts = QuickLaunchBackup.shortcuts(result.shortcuts, workspaceIds);
    snippets = QuickLaunchBackup.snippets(result.snippets);
    if (result.searchPosition) settings.searchPosition = result.searchPosition;
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

    // Accent color
    const defaultAcc = DEFAULT_ACCENT[settings.theme] || DEFAULT_ACCENT.dark;
    accentColorInput.value = settings.accentColor || defaultAcc;

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

  rowsInput.addEventListener('change', function() { clampInput(this, 1, 20); saveSettings(); });
  colsInput.addEventListener('change', function() { clampInput(this, 1, 10); saveSettings(); });

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
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }

  themeControl.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    settings.theme = btn.dataset.value;
    setSegmented(themeControl, settings.theme);
    applyThemeToPage(settings.theme);
    if (!settings.accentColor) {
      accentColorInput.value = DEFAULT_ACCENT[settings.theme] || DEFAULT_ACCENT.dark;
    }
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
    chrome.storage.local.set({ searchPosition: settings.searchPosition }, () => showToast());
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

  // ── Accent color ──────────────────────────────────────────────────────────
  accentColorInput.addEventListener('input', () => {
    settings.accentColor = accentColorInput.value;
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
    saveSettings();
  });

  resetAccentBtn.addEventListener('click', () => {
    settings.accentColor = '';
    accentColorInput.value = DEFAULT_ACCENT[settings.theme] || DEFAULT_ACCENT.dark;
    document.documentElement.style.removeProperty('--accent-color');
    saveSettings();
    showToast('Accent color reset');
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

  // ── Optional clipboard permission ─────────────────────────────────────────
  // clipboardRead is optional so it costs no install-time warning. It must be
  // requested from here rather than the popup, because the permission prompt
  // dismisses the popup before the user can answer it.
  const clipboardReadToggle = document.getElementById('clipboardReadToggle');

  function refreshClipboardToggle() {
    chrome.permissions.contains({ permissions: ['clipboardRead'] }, granted => {
      clipboardReadToggle.checked = !!granted;
    });
  }
  refreshClipboardToggle();

  clipboardReadToggle.addEventListener('change', () => {
    if (clipboardReadToggle.checked) {
      chrome.permissions.request({ permissions: ['clipboardRead'] }, granted => {
        refreshClipboardToggle();
        showToast(granted ? 'Clipboard access enabled' : 'Clipboard access denied');
      });
    } else {
      chrome.permissions.remove({ permissions: ['clipboardRead'] }, () => {
        refreshClipboardToggle();
        showToast('Clipboard access removed');
      });
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
      accentColor: settings.accentColor,
      openInNewTab: openTabSelect.value === 'new',
      hotkeyAction: hotkeyActionSelect.value,
      showBadges: showBadgesCb.checked,
    };
    chrome.storage.local.set({ settings }, () => {
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

    fontSizeDisplay.textContent = `${fontSizeInput.value}px`;
    gridGapDisplay.textContent  = `${gridGapInput.value}px`;
    popupWidthDisp.textContent  = `${popupWidthInput.value}px`;
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      sections.forEach(s => { s.style.display = s.id === targetId ? 'block' : 'none'; });
    });
  });

  // ── Workspaces List (Reorder & Rename) ────────────────────────────────────
  function renderWorkspacesList() {
    workspacesList.innerHTML = '';
    settings.workspaces.forEach((ws, index) => {
      const item = document.createElement('div');
      item.className = 'list-item';
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
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
        deleteBtn.onclick = () => {
          if (confirm(`Delete workspace "${ws.name}"? Shortcuts assigned to it will be moved to the Main workspace.`)) {
            settings.workspaces = settings.workspaces.filter(w => w.id !== ws.id);
            shortcuts.forEach(s => { if (s.workspaceId === ws.id) s.workspaceId = 'w_default'; });
            chrome.storage.local.set({ settings, shortcuts }, () => {
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

        const fromIdx = parseInt(item.dataset.index);
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
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#workspacesList .list-item').forEach(el => el.classList.remove('drag-target'));

          if (dragging && dropTarget) {
            const toIdx = parseInt(dropTarget.dataset.index);
            if (!isNaN(toIdx) && fromIdx !== toIdx) {
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
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#workspacesList .list-item').forEach(el => el.classList.remove('drag-target'));
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onCancel);
      });

      item.append(dragHandle, titleDiv, document.createElement('div'), actionsCol);
      workspacesList.appendChild(item);
    });
  }

  addWsBtn.addEventListener('click', () => {
    if (settings.workspaces.length >= 10) return showToast('Maximum 10 workspaces allowed');
    const name = newWsInput.value.trim();
    if (!name) return;
    settings.workspaces.push({ id: 'w_' + Date.now(), name });
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
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      editBtn.onclick = () => openModal(index);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn delete';
      deleteBtn.title = 'Delete';
      deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      deleteBtn.onclick = () => {
        if (confirm(`Delete "${shortcut.title}"?`)) {
          shortcuts.splice(index, 1);
          chrome.storage.local.set({ shortcuts }, () => {
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

        const fromIdx = parseInt(item.dataset.index);
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
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#shortcutsList .list-item').forEach(el => el.classList.remove('drag-target'));

          if (dragging && dropTarget) {
            const toIdx = parseInt(dropTarget.dataset.index);
            if (!isNaN(toIdx) && fromIdx !== toIdx) {
              const [moved] = shortcuts.splice(fromIdx, 1);
              shortcuts.splice(toIdx, 0, moved);
              chrome.storage.local.set({ shortcuts }, renderShortcutsList);
            }
          }
        };

        const onCancel = () => {
          stopAutoScroll();
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onCancel);
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#shortcutsList .list-item').forEach(el => el.classList.remove('drag-target'));
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onCancel);
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
      item.className = 'list-item';
      item.style.gridTemplateColumns = '200px 1fr 60px';

      const titleCol = document.createElement('div');
      titleCol.style.fontWeight = '500';
      titleCol.textContent = snippet.title;

      const textCol = document.createElement('div');
      textCol.style.display = 'flex';
      textCol.style.flexDirection = 'column';
      textCol.style.gap = '4px';
      textCol.style.paddingRight = '12px';
      
      const textPreview = document.createElement('div');
      textPreview.style.color = 'var(--text-secondary)';
      textPreview.style.whiteSpace = 'nowrap';
      textPreview.style.overflow = 'hidden';
      textPreview.style.textOverflow = 'ellipsis';
      textPreview.textContent = snippet.text;
      textCol.appendChild(textPreview);

      if (snippet.tags && snippet.tags.length > 0) {
        const tagsContainer = document.createElement('div');
        tagsContainer.style.display = 'flex';
        tagsContainer.style.gap = '4px';
        snippet.tags.forEach(tag => {
          const pill = document.createElement('span');
          pill.textContent = tag;
          pill.style.backgroundColor = 'var(--accent-color)';
          pill.style.color = '#000';
          pill.style.fontSize = '9px';
          pill.style.fontWeight = '600';
          pill.style.padding = '2px 6px';
          pill.style.borderRadius = '10px';
          pill.style.textTransform = 'lowercase';
          tagsContainer.appendChild(pill);
        });
        textCol.appendChild(tagsContainer);
      }

      const actions = document.createElement('div');
      actions.className = 'actions';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'action-btn';
      editBtn.title = 'Edit Snippet';
      editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      editBtn.addEventListener('click', () => openSnippetModal(snippet));

      const delBtn = document.createElement('button');
      delBtn.className = 'action-btn delete-btn';
      delBtn.title = 'Delete Snippet';
      delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      delBtn.addEventListener('click', () => {
        if (confirm('Delete this snippet?')) {
          snippets.splice(index, 1);
          chrome.storage.local.set({ snippets }, renderSnippetsList);
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
        if (e.target.closest('.action-btn')) return;
        e.preventDefault();
        const fromIdx = index;
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
          
          dropTarget = elemBelow ? elemBelow.closest('.list-item') : null;
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
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#snippetsList .list-item').forEach(el => el.classList.remove('drag-target'));

          if (dragging && dropTarget) {
            const toIdx = parseInt(dropTarget.dataset.index);
            if (!isNaN(toIdx) && fromIdx !== toIdx) {
              const [moved] = snippets.splice(fromIdx, 1);
              snippets.splice(toIdx, 0, moved);
              chrome.storage.local.set({ snippets }, renderSnippetsList);
            }
          }
        };

        const onCancel = () => {
          stopAutoScroll();
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onCancel);
          item.classList.remove('sortable-ghost');
          document.querySelectorAll('#snippetsList .list-item').forEach(el => el.classList.remove('drag-target'));
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onCancel);
      });

      snippetsList.appendChild(item);
    });
  }

  // ── Snippet Modal Handlers ─────────────────────────────────────────────────
  addSnippetBtn.addEventListener('click', () => openSnippetModal());
  cancelSnippetModalBtn.addEventListener('click', closeSnippetModal);
  snippetModal.addEventListener('click', e => { if (e.target === snippetModal) closeSnippetModal(); });

  function openSnippetModal(snippet = null) {
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
  }

  saveSnippetModalBtn.addEventListener('click', () => {
    const newTitle = modalSnippetTitle.value.trim();
    const newText = modalSnippetText.value.trim();
    const tagsRaw = document.getElementById('modalSnippetTags').value;
    const newTags = tagsRaw.split(',').map(t => t.trim()).filter(t => t !== '');
    
    if (!newTitle || !newText) {
      showToast('Title and Text are required.', true);
      return;
    }

    const id = editSnippetId.value;
    if (id) {
      const target = snippets.find(s => s.id === id);
      if (target) {
        target.title = newTitle;
        target.text = newText;
        target.tags = newTags;
      }
    } else {
      const newId = 'snip_' + Date.now();
      snippets.push({
        id: newId,
        title: newTitle,
        text: newText,
        tags: newTags
      });
      editSnippetId.value = newId;
    }

    chrome.storage.local.set({ snippets }, () => {
      if (chrome.runtime.lastError) {
        showToast('Could not save snippet. Storage may be full.');
        return;
      }
      closeSnippetModal();
      renderSnippetsList();
      showToast('Snippet saved!');
    });
  });

  // ── Modal ─────────────────────────────────────────────────────────────────
  addShortcutBtn.addEventListener('click', () => openModal());
  cancelModalBtn.addEventListener('click', closeModal);
  editModal.addEventListener('click', e => { if (e.target === editModal) closeModal(); });

  function openModal(index = -1) {
    faviconPreview.style.display = 'none';
    editIconData.value = '';

    shortcutWorkspace.innerHTML = '';
    settings.workspaces.forEach(ws => {
      const opt = document.createElement('option');
      opt.value = ws.id;
      opt.textContent = ws.name;
      shortcutWorkspace.appendChild(opt);
    });

    if (index >= 0) {
      modalTitle.textContent    = 'Edit Shortcut';
      shortcutTitleIn.value     = shortcuts[index].title;
      shortcutUrlIn.value       = shortcuts[index].url;
      shortcutWorkspace.value   = shortcuts[index].workspaceId || 'w_default';
      editIndexInput.value      = index;
      editIconData.value        = shortcuts[index].icon || '';
      if (shortcuts[index].url) {
        faviconImg.src            = QuickLaunchBackup.safeIcon(shortcuts[index].icon)
          ? shortcuts[index].icon
          : localFaviconUrl(shortcuts[index].url);
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
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    try {
      new URL(url);
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
    const index = editIndexInput.value;

    if (!title || !url) { alert('Please fill in both title and URL.'); return; }
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

    if (!QuickLaunchBackup.webUrl(url)) { alert('Please enter a valid web URL.'); return; }

    const shortcutData = {
      title,
      url,
      icon: editIconData.value || (index !== '' ? shortcuts[index].icon : '') || '',
      workspaceId: shortcutWorkspace.value || 'w_default'
    };

    if (index !== '') {
      shortcuts[parseInt(index)] = shortcutData;
    } else {
      shortcuts.push(shortcutData);
      editIndexInput.value = shortcuts.length - 1;
    }

    chrome.storage.local.set({ shortcuts }, () => {
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
  exportBtn.addEventListener('click', () => {
    const data = { version: '2.6', shortcuts, snippets, settings, usageCounts, sortMode };
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
        const nextSettings = data.settings
          ? QuickLaunchBackup.settings(data.settings, settings)
          : { ...settings, workspaces: QuickLaunchBackup.workspaces(settings.workspaces) };
        const validWsIds = new Set(nextSettings.workspaces.map(w => w.id));
        const nextShortcuts = QuickLaunchBackup.shortcuts(data.shortcuts, validWsIds);
        const nextSnippets = QuickLaunchBackup.snippets(data.snippets);
        if (!nextShortcuts.length && !nextSnippets.length) {
          showToast('No valid shortcuts or snippets found in file.');
          return;
        }
        const nextUsageCounts = data.usageCounts
          ? QuickLaunchBackup.usageCounts(data.usageCounts) : usageCounts;
        const VALID_SORT_MODES = ['manual', 'most-used', 'az'];
        const nextSortMode = VALID_SORT_MODES.includes(data.sortMode) ? data.sortMode : sortMode;

        chrome.storage.local.set({
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
          showToast('Import successful!');
        });
      } catch(err) {
        alert('Invalid file. Please choose a valid QuickLaunch JSON backup.');
      } finally {
        importFile.value = '';
      }
    };
    reader.onerror = () => {
      alert('Could not read the file. Please try again.');
      importFile.value = '';
    };
    reader.readAsText(file);
  });

  // ── Reset Actions ─────────────────────────────────────────────────────────
  resetUsageBtn.addEventListener('click', () => {
    if (!confirm('Reset all usage counts? Your "Most-Used" sorting will start from scratch.')) return;
    chrome.storage.local.set({ usageCounts: {} }, () => {
      usageCounts = {};
      showToast('Usage counts reset');
    });
  });

  resetAllBtn.addEventListener('click', () => {
    if (!confirm('This will delete ALL shortcuts, snippets, and reset all settings. Are you sure?')) return;
    if (!confirm('Are you absolutely sure? This cannot be undone.')) return;
    chrome.storage.local.clear(() => {
      window.location.reload();
    });
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg = 'Saved!') {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const isEditModalOpen = editModal.classList.contains('active');
    const isSnippetModalOpen = snippetModal.style.display === 'flex';

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
