// options.js

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const navLinks = document.querySelectorAll('nav a');
  const sections = document.querySelectorAll('.content section');
  const rowsInput = document.getElementById('rows');
  const colsInput = document.getElementById('cols');
  const showTitlesCheckbox = document.getElementById('showTitles');
  const fontSizeInput = document.getElementById('fontSize');
  const fontSizeDisplay = document.getElementById('fontSizeDisplay');
  const gridGapInput = document.getElementById('gridGap');
  const gridGapDisplay = document.getElementById('gridGapDisplay');
  const themeSelect = document.getElementById('theme');
  const previewTitle = document.querySelector('.preview-title');
  const previewIcon = document.querySelector('.preview-icon');
  
  const shortcutsList = document.getElementById('shortcutsList');
  const addShortcutBtn = document.getElementById('addShortcutBtn');
  
  const editModal = document.getElementById('editModal');
  const modalTitle = document.getElementById('modalTitle');
  const shortcutTitleInput = document.getElementById('shortcutTitle');
  const shortcutUrlInput = document.getElementById('shortcutUrl');
  const editIndexInput = document.getElementById('editIndex');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const saveModalBtn = document.getElementById('saveModalBtn');
  
  const toast = document.getElementById('toast');

  // State
  let settings = {
    rows: 4,
    cols: 4,
    showTitles: true,
    fontSize: 12,
    gridGap: 16,
    theme: 'dark'
  };
  let shortcuts = [];
  let dragSrcEl = null;

  // Load state from storage
  chrome.storage.local.get(['settings', 'shortcuts'], (result) => {
    if (result.settings) {
      settings = { ...settings, ...result.settings };
      // Update UI with loaded settings
      rowsInput.value = settings.rows;
      colsInput.value = settings.cols;
      showTitlesCheckbox.checked = settings.showTitles;
      fontSizeInput.value = settings.fontSize;
      gridGapInput.value = settings.gridGap || 16;
      themeSelect.value = settings.theme || 'dark';
      document.documentElement.setAttribute('data-theme', themeSelect.value);
      updatePreview();
    }
    if (result.shortcuts) {
      shortcuts = result.shortcuts;
    }
    renderShortcutsList();
  });

  // Navigation
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      sections.forEach(s => {
        s.style.display = s.id === targetId ? 'block' : 'none';
      });
    });
  });

  // Settings Event Listeners
  const saveSettings = () => {
    settings = {
      rows: parseInt(rowsInput.value) || 4,
      cols: parseInt(colsInput.value) || 4,
      showTitles: showTitlesCheckbox.checked,
      fontSize: parseInt(fontSizeInput.value) || 12,
      gridGap: parseInt(gridGapInput.value) || 16,
      theme: themeSelect.value
    };
    document.documentElement.setAttribute('data-theme', settings.theme);
    chrome.storage.local.set({ settings }, showToast);
  };

  rowsInput.addEventListener('change', saveSettings);
  colsInput.addEventListener('change', saveSettings);
  themeSelect.addEventListener('change', saveSettings);
  
  showTitlesCheckbox.addEventListener('change', () => {
    updatePreview();
    saveSettings();
  });

  fontSizeInput.addEventListener('input', () => updatePreview());
  fontSizeInput.addEventListener('change', saveSettings);
  
  gridGapInput.addEventListener('input', () => updatePreview());
  gridGapInput.addEventListener('change', saveSettings);

  function updatePreview() {
    fontSizeDisplay.textContent = `${fontSizeInput.value}px`;
    gridGapDisplay.textContent = `${gridGapInput.value}px`;
    previewTitle.style.fontSize = `${fontSizeInput.value}px`;
    
    if (showTitlesCheckbox.checked) {
      previewTitle.style.display = 'block';
      previewIcon.style.marginBottom = '8px';
    } else {
      previewTitle.style.display = 'none';
      previewIcon.style.marginBottom = '0';
    }
  }

  // Shortcuts Management
  function renderShortcutsList() {
    shortcutsList.innerHTML = '';
    
    if (shortcuts.length === 0) {
      shortcutsList.innerHTML = '<div style="padding: 16px; color: var(--text-secondary); text-align: center;">No shortcuts configured yet.</div>';
      return;
    }

    shortcuts.forEach((shortcut, index) => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.draggable = true;
      item.dataset.index = index;

      // Drag handle col
      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle';
      dragHandle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>';

      // Title col
      const titleCol = document.createElement('div');
      titleCol.className = 'item-title';
      
      const iconDiv = document.createElement('div');
      iconDiv.className = 'item-icon';
      if (shortcut.icon) {
        iconDiv.innerHTML = `<img src="${shortcut.icon}">`;
      } else {
        iconDiv.textContent = shortcut.title ? shortcut.title.charAt(0) : '?';
        iconDiv.style.fontWeight = 'bold';
        iconDiv.style.fontSize = '10px';
      }
      
      const titleText = document.createElement('span');
      titleText.textContent = shortcut.title;
      
      titleCol.appendChild(iconDiv);
      titleCol.appendChild(titleText);
      
      // URL col
      const urlCol = document.createElement('div');
      urlCol.className = 'item-url';
      urlCol.textContent = shortcut.url;
      urlCol.title = shortcut.url;
      
      // Actions col
      const actionsCol = document.createElement('div');
      actionsCol.className = 'item-actions';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
      editBtn.onclick = () => openModal(index);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn delete';
      deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
      deleteBtn.onclick = () => {
        if (confirm('Are you sure you want to delete this shortcut?')) {
          shortcuts.splice(index, 1);
          chrome.storage.local.set({ shortcuts }, () => {
            renderShortcutsList();
            showToast('Shortcut deleted');
          });
        }
      };
      
      actionsCol.appendChild(editBtn);
      actionsCol.appendChild(deleteBtn);
      
      item.appendChild(dragHandle);
      item.appendChild(titleCol);
      item.appendChild(urlCol);
      item.appendChild(actionsCol);
      
      // Drag Events
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);

      shortcutsList.appendChild(item);
    });
  }

  // Drag and Drop Handlers
  function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('sortable-ghost');
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (dragSrcEl !== this) {
      const fromIndex = parseInt(dragSrcEl.dataset.index);
      const toIndex = parseInt(this.dataset.index);

      // Reorder array
      const item = shortcuts.splice(fromIndex, 1)[0];
      shortcuts.splice(toIndex, 0, item);

      chrome.storage.local.set({ shortcuts }, () => {
        renderShortcutsList();
      });
    }
    return false;
  }

  function handleDragEnd(e) {
    this.classList.remove('sortable-ghost');
    const items = document.querySelectorAll('.list-item');
    items.forEach(item => item.classList.remove('sortable-ghost'));
  }

  // Modal logic
  addShortcutBtn.addEventListener('click', () => openModal());
  cancelModalBtn.addEventListener('click', closeModal);
  
  function openModal(index = -1) {
    if (index >= 0) {
      modalTitle.textContent = 'Edit Shortcut';
      shortcutTitleInput.value = shortcuts[index].title;
      shortcutUrlInput.value = shortcuts[index].url;
      editIndexInput.value = index;
    } else {
      modalTitle.textContent = 'Add Shortcut';
      shortcutTitleInput.value = '';
      shortcutUrlInput.value = '';
      editIndexInput.value = '';
    }
    editModal.classList.add('active');
    shortcutTitleInput.focus();
  }
  
  function closeModal() {
    editModal.classList.remove('active');
  }

  saveModalBtn.addEventListener('click', () => {
    const title = shortcutTitleInput.value.trim();
    let url = shortcutUrlInput.value.trim();
    const index = editIndexInput.value;
    
    if (!title || !url) {
      alert('Please fill in both title and URL.');
      return;
    }
    
    // Auto-prepend https if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    try {
      new URL(url);
    } catch(e) {
      alert('Please enter a valid URL.');
      return;
    }

    const shortcutData = { title, url };

    if (index !== '') {
      // Keep existing icon if editing
      shortcutData.icon = shortcuts[index].icon;
      shortcuts[index] = shortcutData;
    } else {
      shortcuts.push(shortcutData);
    }

    chrome.storage.local.set({ shortcuts }, () => {
      renderShortcutsList();
      closeModal();
      showToast();
    });
  });
  
  // Close modal on click outside
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeModal();
    }
  });

  function showToast(msg = 'Saved successfully!') {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
});
