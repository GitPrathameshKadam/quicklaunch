// options.js

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
  const openTabSelect   = document.getElementById('open-tab');
  const hotkeyActionSelect = document.getElementById('hotkeyAction');
  const searchPositionControl = document.getElementById('searchPositionControl');

  const shortcutsList   = document.getElementById('shortcutsList');
  const addShortcutBtn  = document.getElementById('addShortcutBtn');

  const editModal       = document.getElementById('editModal');
  const modalTitle      = document.getElementById('modalTitle');
  const shortcutTitleIn = document.getElementById('shortcutTitle');
  const shortcutUrlIn   = document.getElementById('shortcutUrl');
  const editIndexInput  = document.getElementById('editIndex');
  const editIconData    = document.getElementById('editIconData');
  const cancelModalBtn  = document.getElementById('cancelModalBtn');
  const saveModalBtn    = document.getElementById('saveModalBtn');
  const fetchFaviconBtn = document.getElementById('fetchFaviconBtn');
  const faviconPreview  = document.getElementById('faviconPreview');
  const faviconImg      = document.getElementById('faviconImg');
  const faviconStatus   = document.getElementById('faviconStatus');

  const exportBtn       = document.getElementById('exportBtn');
  const importFile      = document.getElementById('importFile');
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
  };
  let shortcuts = [];
  let dragSrcEl = null;

  // ── Default accent per theme ──────────────────────────────────────────────
  const DEFAULT_ACCENT = { dark: '#8ab4f8', light: '#1a73e8', system: '#8ab4f8' };

  // ── Load storage ──────────────────────────────────────────────────────────
  chrome.storage.local.get(['settings', 'shortcuts', 'searchPosition'], (result) => {
    if (result.settings) settings = { ...settings, ...result.settings };
    if (result.shortcuts) shortcuts = result.shortcuts;
    if (result.searchPosition) settings.searchPosition = result.searchPosition;
    applySettingsToUI();
    renderShortcutsList();
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
    // Update accent placeholder
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

  rowsInput.addEventListener('change', saveSettings);
  colsInput.addEventListener('change', saveSettings);

  showTitlesCb.addEventListener('change', () => { updatePreview(); saveSettings(); });
  showBadgesCb.addEventListener('change', saveSettings);
  openTabSelect.addEventListener('change', saveSettings);
  hotkeyActionSelect.addEventListener('change', saveSettings);

  // ── Save settings ─────────────────────────────────────────────────────────
  function saveSettings() {
    settings = {
      ...settings,
      rows: parseInt(rowsInput.value) || 4,
      cols: parseInt(colsInput.value) || 4,
      showTitles: showTitlesCb.checked,
      fontSize: parseInt(fontSizeInput.value) || 12,
      gridGap: parseInt(gridGapInput.value) || 16,
      popupWidth: parseInt(popupWidthInput.value) || 380,
      iconSize: settings.iconSize,
      iconShape: settings.iconShape,
      theme: settings.theme,
      accentColor: settings.accentColor,
      openInNewTab: openTabSelect.value === 'new',
      hotkeyAction: hotkeyActionSelect.value,
      showBadges: showBadgesCb.checked,
    };
    chrome.storage.local.set({ settings }, () => showToast());
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
      item.draggable = true;
      item.dataset.index = index;

      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle';
      dragHandle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;

      const titleCol = document.createElement('div');
      titleCol.className = 'item-title';
      const iconDiv = document.createElement('div');
      iconDiv.className = 'item-icon';
      if (shortcut.icon) {
        iconDiv.innerHTML = `<img src="${shortcut.icon}" onerror="this.style.display='none'">`;
      } else {
        iconDiv.textContent = (shortcut.title || '?').charAt(0).toUpperCase();
        iconDiv.style.fontWeight = 'bold';
        iconDiv.style.fontSize = '10px';
      }
      const titleText = document.createElement('span');
      titleText.textContent = shortcut.title;
      titleCol.appendChild(iconDiv);
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

      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);

      shortcutsList.appendChild(item);
    });
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    this.classList.add('sortable-ghost');
  }
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }
  function handleDrop(e) {
    e.stopPropagation();
    if (dragSrcEl !== this) {
      const from = parseInt(dragSrcEl.dataset.index);
      const to   = parseInt(this.dataset.index);
      const [item] = shortcuts.splice(from, 1);
      shortcuts.splice(to, 0, item);
      chrome.storage.local.set({ shortcuts }, renderShortcutsList);
    }
    return false;
  }
  function handleDragEnd() {
    document.querySelectorAll('.list-item').forEach(i => i.classList.remove('sortable-ghost'));
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  addShortcutBtn.addEventListener('click', () => openModal());
  cancelModalBtn.addEventListener('click', closeModal);
  editModal.addEventListener('click', e => { if (e.target === editModal) closeModal(); });

  function openModal(index = -1) {
    faviconPreview.style.display = 'none';
    editIconData.value = '';

    if (index >= 0) {
      modalTitle.textContent    = 'Edit Shortcut';
      shortcutTitleIn.value     = shortcuts[index].title;
      shortcutUrlIn.value       = shortcuts[index].url;
      editIndexInput.value      = index;
      editIconData.value        = shortcuts[index].icon || '';
      if (shortcuts[index].icon) {
        faviconImg.src            = shortcuts[index].icon;
        faviconStatus.textContent = 'Current icon';
        faviconPreview.style.display = 'flex';
      }
    } else {
      modalTitle.textContent = 'Add Shortcut';
      shortcutTitleIn.value  = '';
      shortcutUrlIn.value    = '';
      editIndexInput.value   = '';
    }
    editModal.classList.add('active');
    shortcutTitleIn.focus();
  }

  function closeModal() {
    editModal.classList.remove('active');
  }

  // ── Favicon fetcher ───────────────────────────────────────────────────────
  fetchFaviconBtn.addEventListener('click', async () => {
    let url = shortcutUrlIn.value.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    try {
      const origin = new URL(url).origin;
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${origin}&sz=64`;
      faviconImg.src = faviconUrl;
      faviconStatus.textContent = 'Fetching…';
      faviconPreview.style.display = 'flex';

      faviconImg.onload = () => {
        editIconData.value = faviconUrl;
        faviconStatus.textContent = 'Icon found ✓';
      };
      faviconImg.onerror = () => {
        faviconStatus.textContent = 'Could not fetch icon';
      };

      // Auto-fill title from hostname if empty
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

    try { new URL(url); } catch(e) { alert('Please enter a valid URL.'); return; }

    const shortcutData = {
      title,
      url,
      icon: editIconData.value || (index !== '' ? shortcuts[index].icon : '') || '',
    };

    if (index !== '') {
      shortcuts[parseInt(index)] = shortcutData;
    } else {
      shortcuts.push(shortcutData);
    }

    chrome.storage.local.set({ shortcuts }, () => {
      renderShortcutsList();
      closeModal();
      showToast();
    });
  });

  // ── Import / Export ───────────────────────────────────────────────────────
  exportBtn.addEventListener('click', () => {
    const data = { version: 1, shortcuts, settings };
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
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.shortcuts) shortcuts = data.shortcuts;
        if (data.settings)  settings  = { ...settings, ...data.settings };
        chrome.storage.local.set({ shortcuts, settings }, () => {
          applySettingsToUI();
          renderShortcutsList();
          showToast('Import successful!');
        });
      } catch(err) {
        alert('Invalid file. Please choose a valid QuickLaunch JSON backup.');
      }
    };
    reader.readAsText(file);
    importFile.value = '';
  });

  resetAllBtn.addEventListener('click', () => {
    if (!confirm('This will delete ALL shortcuts and reset all settings. Are you sure?')) return;
    chrome.storage.local.clear(() => {
      shortcuts = [];
      settings  = {
        rows: 4, cols: 4, showTitles: true, fontSize: 12, gridGap: 16,
        theme: 'dark', popupWidth: 380, iconShape: 'circle', iconSize: 48,
        accentColor: '', openInNewTab: true,
      };
      applySettingsToUI();
      renderShortcutsList();
      showToast('All data cleared');
    });
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg = 'Saved!') {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
});
