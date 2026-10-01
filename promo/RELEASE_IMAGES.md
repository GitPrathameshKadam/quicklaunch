# QuickLaunch 2.7 listing images

Prepared October 2, 2026 from the candidate's real HTML, CSS and JavaScript, using the local synthetic Chrome adapter in `scripts/preview.cjs` and `tests/browser-fixture.js?store`. Only sample `example.test` destinations, generic titles and letter icons are shown. No user browsing data, third-party brand logos, endorsement claims or review badges are included.

| File | Dimensions | Use |
| --- | --- | --- |
| `v2.7-settings-dark.jpg` | 1280×800 | Full-bleed Settings/workspace screenshot |
| `v2.7-snippets-dark.jpg` | 1280×800 | Full-bleed snippet management screenshot |
| `v2.7-appearance-light.jpg` | 1280×800 | Full-bleed light appearance/settings screenshot |
| `v2.7-popup-copy.jpg` | 380×510 | Actual popup Copy alignment QA; do not upload to a Store screenshot slot |
| `small-promo-tile.png` | 440×280 | Separate promotional tile; existing original vector source is `small-promo-tile.svg` |

The three 1280×800 captures satisfy the [Store screenshot dimensions](https://developer.chrome.com/docs/webstore/images). They show the actual candidate UI with simulated APIs, rather than an installed Chrome extension. Compare them with the final extracted archive in Chrome before upload; replace them if that acceptance run changes the UI.

`quicklaunch-screenshot-1.png`, `quicklaunch-screenshot-settings.png`, `screenshot.html`, `popup-demo.html`, `chrome-shim.js` and `favicons.js` are older local promotional material. They are excluded from the reviewed public update. Do not reuse the old composite as a screenshot of 2.7. All promotional material is excluded from the extension ZIP.
