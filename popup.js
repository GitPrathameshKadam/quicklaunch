// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('gridContainer');
  const searchInput = document.getElementById('searchInput');
  const settingsBtn = document.getElementById('settingsBtn');
  const emptyState = document.getElementById('emptyState');
  const addFirstBtn = document.getElementById('addFirstShortcutBtn');

  // Default settings
  let settings = {
    rows: 4,
    cols: 4,
    showTitles: true,
    fontSize: 12,
    gridGap: 16,
    theme: 'dark'
  };
  
  let shortcuts = [];

  // Load data from storage
  chrome.storage.local.get(['settings', 'shortcuts'], (result) => {
    if (result.settings) {
      settings = { ...settings, ...result.settings };
    }
    if (result.shortcuts) {
      shortcuts = result.shortcuts;
    }

    // Apply theme and grid gap
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--grid-gap', `${settings.gridGap}px`);

    renderGrid(shortcuts);
  });

  function renderGrid(dataToRender) {
    gridContainer.innerHTML = ''; // clear
    
    if (dataToRender.length === 0 && searchInput.value.trim() === '') {
      gridContainer.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    gridContainer.style.display = 'grid';
    emptyState.style.display = 'none';

    // Apply grid template columns based on settings
    gridContainer.style.gridTemplateColumns = `repeat(${settings.cols}, minmax(0, 1fr))`;
    
    // Apply styling classes
    if (!settings.showTitles) {
      gridContainer.classList.add('hide-titles');
    } else {
      gridContainer.classList.remove('hide-titles');
    }

    // Determine max items (if not searching)
    const maxItems = settings.rows * settings.cols;
    const itemsToDisplay = searchInput.value.trim() === '' ? dataToRender.slice(0, maxItems) : dataToRender;

    itemsToDisplay.forEach(shortcut => {
      const a = document.createElement('a');
      a.className = 'shortcut-item';
      a.href = shortcut.url;
      a.target = '_blank'; // Open in new tab or use chrome.tabs.create

      // Handle opening logic to close popup immediately
      a.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: shortcut.url });
      });

      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'icon-wrapper';
      
      if (shortcut.icon) {
        const img = document.createElement('img');
        img.className = 'shortcut-icon';
        img.src = shortcut.icon;
        // Fallback if image fails to load
        img.onerror = () => {
          img.style.display = 'none';
          iconWrapper.innerHTML = `<span class="fallback-icon">${shortcut.title.charAt(0)}</span>`;
        };
        iconWrapper.appendChild(img);
      } else {
        // Fallback letter
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
    
    // Optional: Fill remaining empty slots with blank placeholders to maintain grid shape
    // if you want a fixed grid look even when half empty.
  }

  // Search functionality
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query === '') {
      renderGrid(shortcuts);
    } else {
      const filtered = shortcuts.filter(s => 
        s.title.toLowerCase().includes(query) || s.url.toLowerCase().includes(query)
      );
      renderGrid(filtered);
    }
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Add first button
  addFirstBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Focus search input immediately on open
  setTimeout(() => {
    searchInput.focus();
  }, 100);
});
