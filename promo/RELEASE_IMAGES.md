# QuickLaunch 2.7 listing images

Verified October 3, 2026 from the final candidate installed in normal Chrome **154.0.8037.95 arm64**, in the signed-out **QuickLaunch QA** profile. The three PNGs below are settled native UI captures made with DevTools **Capture screenshot**, at a 1280×800 desktop viewport and DPR 1. They show only generic `example.com`, `example.org` and `example.net` sample destinations and sample snippets. No personal browsing data, unrelated company logos, endorsement claims or review badges are included.

| File | Dimensions | Format / bytes | Use |
| --- | --- | --- | --- |
| `v2.7-settings-dark-native.png` | 1280×800 | 24-bit RGB PNG / 162,973 | Current full-bleed Settings/workspace screenshot |
| `v2.7-snippets-dark-native.png` | 1280×800 | 24-bit RGB PNG / 135,245 | Current full-bleed snippet management screenshot |
| `v2.7-appearance-light-native.png` | 1280×800 | 24-bit RGB PNG / 143,542 | Current full-bleed settled light appearance screenshot |
| `v2.7-popup-copy.jpg` | 380×510 | JPEG / 21,522 | Historical synthetic Copy-alignment QA; invalid Store screenshot dimensions |
| `small-promo-tile.png` | 440×280 | PNG | Separate existing promotional tile; original vector source is `small-promo-tile.svg` |

The current PNGs satisfy the [Store screenshot dimensions and image format requirements](https://developer.chrome.com/docs/webstore/images). Their original fully opaque RGBA captures were normalized to 24-bit RGB with identical visible pixel values; no resizing, added UI, compositing or promotional overlay was applied. All three were opened and visually inspected after normalization. These are installed-Chrome captures of the final UI, replacing the earlier synthetic images. Store upload/save is a separate action; this inventory does not claim it has occurred.

Verified SHA-256 values:

```text
6465929a182dc51007e4e7b4c6341fb4dfbf7c99a42dd8ed75852539b5be7f36  v2.7-settings-dark-native.png
886dda9d6e7d2e24a129dd9b5cd630c1ff9a5e48d11851e7911b38c70184daed  v2.7-snippets-dark-native.png
97b54322c8bdce87147dd0247e7e4b8bb757ce7bdaf0909cf2691a7edc6ff6ab  v2.7-appearance-light-native.png
```

`v2.7-settings-dark.jpg`, `v2.7-snippets-dark.jpg` and `v2.7-appearance-light.jpg` were October 2 synthetic adapter captures using `example.test` data. They are **superseded**, and must not be uploaded as the final listing images; the older light capture includes a view mid-transition. Retain them only as historical development evidence. The 380×510 popup JPG is also synthetic QA, not a Store screenshot.

`quicklaunch-screenshot-1.png`, `quicklaunch-screenshot-settings.png`, `screenshot.html`, `popup-demo.html`, `chrome-shim.js` and `favicons.js` are older local promotional material. They are excluded from the reviewed public update. Do not reuse the old composite as a screenshot of 2.7. All promotional material is excluded from the extension ZIP.
