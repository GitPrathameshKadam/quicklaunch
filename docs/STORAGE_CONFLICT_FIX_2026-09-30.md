# False save-conflict fix

September 30, 2026. Investigated the screenshot showing “Your data changed in another QuickLaunch window. Reload before saving.” The user reported opening Settings or making the first change. The screenshot alone does not identify a conflicting storage key or establish that another editor changed anything.

## Reproduced cause

The concurrency guard in `storage.js` and `storage-worker.js` compared raw `JSON.stringify` strings. After a successful save the UI remembered its object's insertion order. A storage round-trip could return equivalent objects with a different property order, making a subsequent save falsely conflict. Reordering fields between the UI's first read and the worker's first save check could also trigger the same message without any content change.

The earlier mock preserved object-key insertion order and therefore missed this boundary. Chromium's dictionary implementation uses a `flat_map`; its JSON-compatible dictionary representation should not be treated as preserving JavaScript insertion order. See [Chromium's value implementation](https://chromium.googlesource.com/chromium/src/+/main/base/values.h). Chrome documents storage as JSON-serializable values, without promising object insertion order: [storage API](https://developer.chrome.com/docs/extensions/reference/api/storage).

Before the fix, a local reproduction with sorted storage reads saved Rows=5 successfully, then rejected Rows=6 and left Rows=5 stored. No other window changed the settings.

## Fix

- Shared `storage-value.js` consistently encodes nested objects with sorted keys in the UI and worker. Array order remains significant, preserving shortcut, snippet, tag, and workspace ordering.
- The worker also accepts equivalent older expected-JSON strings from an already-open page. Missing/malformed expectations or actual value/order changes still fail the comparison.
- No stored data format, permissions, or reset behavior changes. The genuine-conflict guard remains enabled; conflicting changes are not blindly retried or overwritten.
- Test and browser adapters now reorder object fields on storage reads so this case stays covered.

## Native Brave verification and second fix

The installed unpacked QuickLaunch 2.7 source path was verified as this workspace. Reloading it exposed a separate development-load failure: Brave rejected the root `_promo` folder because leading-underscore names are reserved. Renamed it to `promo`, preserving its contents and updating the release-document references. Added a release check for reserved root names. Promotional assets remain excluded from the Store package.

Retry successfully loaded the corrected extension. Native Settings rendered the saved shortcuts and preferences again without the recovery overlay. Consecutive capacity saves succeeded; the original **Rows=3** value was restored and verified after a native page reload. Native **Light → Dark** saves also succeeded, restoring the original Dark theme. No shortcut/snippet edits, deletions, resets, or clipboard permission changes were performed during this test.

The final native screenshot records the successful Dark save. The user subsequently took control of Brave, so no additional native actions were performed. This is a native save/reload check, not completion of the full Chrome Store acceptance checklist.

## Validation

- **68/68 tests pass**, including five new cases covering nested field reordering, significant array/value changes, malformed expectations, old JSON compatibility, first-save/repeated-save success, and genuine Settings conflicts. Existing stale shortcut, clear/reset, quota, draft, and import protections still pass with reordered storage reads.
- Syntax, references, shared-script ordering, manifest, reserved-root-name, and whitespace checks pass.
- Candidate allowlist now contains **25 files**, adding the shared comparison module. Package CRC and source-byte parity are checked by the builder. Current ZIP/hash are recorded in the [main review](REVIEW_2026-09-30.md).

Native Brave capture retained locally; omitted from the public repository because it contains the user's browser context.
