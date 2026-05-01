# 🚀 QuickLaunch - Customizable Shortcut Extension

QuickLaunch is a premium, highly configurable Chrome extension that transforms your browser popup into a streamlined, beautiful grid of your favorite website shortcuts. Built with a focus on speed, aesthetics, and productivity.

## ✨ Features

- **📱 Customizable Grid**: Control exactly how many rows and columns appear in your shortcut grid.
- **🎨 Visual Precision**: Adjust font sizes, grid spacing, icon sizes, and icon shapes (Circle, Rounded, Square).
- **🌗 Theme Support**: Native Dark, Light, and System theme support with a premium Glassmorphism design.
- **🔍 Smart Search**: Lightning-fast search bar that filters shortcuts by title, URL, or hotkey index.
- **🖱️ Drag & Drop**: Intuitively reorder your shortcuts directly in the popup grid or the options dashboard.
- **⌨️ Hot-Key Launch**: Open any of your first 9 shortcuts instantly using number keys `1-9`.
- **🖱️ Context Menu**: Right-click any webpage and select "Add to QuickLaunch" to instantly save it.
- **⚡ Performance First**: Lightweight Manifest V3 extension with zero dependencies.

## 🛠️ Installation

### For Developers (Manual Load)

1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder containing the extension files.

## 🚀 Usage

1. **Open QuickLaunch**: Click the extension icon in your toolbar to open the grid.
2. **Search & Filter**: Start typing immediately to filter your shortcuts.
3. **Hotkey Launch**: Press `1-9` to open the corresponding shortcut instantly.
4. **Quick Add**: 
   - Click the `+` icon in the popup to add the current tab.
   - Or, right-click any page and select **Add to QuickLaunch**.
5. **Organize**: Click and drag any shortcut to reorder your grid.
6. **Customize**: Click the settings icon (⚙️) to open the full dashboard.

## ⚙️ Configuration Options

- **Grid Layout**: Set custom Rows (1-10) and Columns (1-10).
- **Appearance**:
  - **Icon Shape**: Circle, Rounded, or Square.
  - **Icon Size**: Small, Medium, or Large.
  - **Toggle Titles**: Hide or show shortcut names.
  - **Toggle Badges**: Show or hide the `1-9` hotkey numbers on icons.
  - **Custom Font & Spacing**: Fine-tune font sizes and grid gaps.
- **Behavior**:
  - **Tab Targeting**: Choose between opening in a **New Tab** or the **Current Tab**.
  - **Search Position**: Toggle the search bar between the **Top** or **Bottom** of the popup.
  - **Hotkey Action**: Choose if number keys should **Launch Directly** or just **Type in Search**.
- **Theming**: Select Dark, Light, or System-matching modes with custom accent color support.

## 📂 Project Structure

```text
QuickLaunch/
├── manifest.json    # Extension metadata & permissions
├── background.js    # Service worker (Context menus & storage logic)
├── popup.html       # Main shortcut grid interface
├── popup.js         # Popup logic, search, DND & hotkeys
├── popup.css        # Popup styling (Glassmorphism & animations)
├── options.html     # Settings dashboard
├── options.js       # Configuration management
├── options.css      # Dashboard styling
└── icon.png         # Extension iconography
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

_Built with ❤️ for a faster browsing experience._
