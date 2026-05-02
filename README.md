# 🚀 QuickLaunch - Customizable Shortcut Extension (v2.2)

QuickLaunch is a premium, highly configurable Chrome extension that transforms your browser popup into a streamlined, beautiful grid of your favorite website shortcuts. Built for speed, aesthetics, and maximum productivity.

## ✨ Latest Features (v2.2)

- **📝 Edit Mode**: Manage your grid directly! Toggle Edit Mode in the popup to remove shortcuts or **inline-rename** titles instantly.
- **📊 Smart Sorting**: Choose between **Manual**, **Alphabetical**, and **Most-Used** sorting. Frequency tracking automatically prioritizes your most-visited shortcuts.
- **💾 Import/Export Everywhere**: Backup or transfer your configuration via JSON files directly from the popup banner or the options dashboard.
- **🎨 Premium Visuals**: 
  - Dynamic **Glassmorphism** UI with smooth transitions.
  - Configurable **Icon Shapes** (Circle, Rounded, Square) and **Sizes**.
  - Custom **Accent Colors** with native theme support (Dark, Light, System).
- **🔍 Intelligent Search**: Filter through shortcuts by title, URL, or hotkey index (1-9).
- **🚀 One-Click Add**: Save the current tab instantly via the `+` icon or the **Context Menu** ("Add to QuickLaunch").
- **🌐 Automatic Favicons**: v2.2 includes an improved favicon fetcher that captures high-quality icons automatically.

## 🛠️ Installation

### For Developers (Manual Load)

1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder containing the extension files.

## 🚀 Usage

1. **Open QuickLaunch**: Click the extension icon in your toolbar.
2. **Launch Fast**: Press `1-9` to open your first 9 shortcuts instantly.
3. **Toggle Edit Mode**: Click the pencil icon (📝) in the popup to enter management mode.
4. **Change Sorting**: Click the sort icon to cycle through Manual, A-Z, and Most-Used modes.
5. **Add Current Tab**: Click the `+` button for a quick-add preview.
6. **Full Dashboard**: Click the gear icon (⚙️) to fine-tune your grid layout, themes, and behavior.

## 📂 Project Structure

```text
QuickLaunch/
├── assets/          # High-resolution icons and assets
├── manifest.json    # Extension v3 configuration
├── background.js    # Service worker (Context menus & storage)
├── popup.html       # The main interface
├── popup.js         # v2.2 logic: Edit mode, Sorting, Search
├── popup.css        # Premium styling
├── options.html     # Configuration dashboard
├── options.js       # Settings management & shortcut editing
└── options.css      # Dashboard aesthetics
```

---

_Built with ❤️ for a faster browsing experience._
