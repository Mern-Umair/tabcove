# Tabcove

Chrome extension (Manifest V3) that saves, restores and backs up tabs and windows. Vite + Preact + TypeScript.

```
npm ci
npm run build        # dist/ (also checks the build against the manifest and store limits)
npm test             # unit tests
npm run test:e2e     # drives the built extension in Chrome for Testing
npm run zip          # tabcove-<version>.zip for the Chrome Web Store
```

The browser test needs Chrome for Testing, because Google Chrome 137+ no longer loads unpacked extensions from the
command line:

```
npx @puppeteer/browsers install chrome@stable --path .cache
```

Load the extension for manual testing: `chrome://extensions` → Developer mode → Load unpacked → `dist/`.

## Layout

- `public/manifest.json`: permissions, pages, shortcuts; `public/icons/` from `scripts/make-icons.mjs`.
- `src/background/index.ts`: service worker. Live snapshot of all windows (debounced on every tab event), timed
  backups (alarm), closed windows, previous session on startup, restore, import, licence.
- `src/lib/`: pure logic, unit-tested: `capture.ts` (Chrome windows → saved form), `restore.ts`, `import.ts`
  (Tabcove, Session Buddy, OneTab, URL lists), `license.ts` (Gumroad), `storage.ts`, `model.ts`.
- `src/manager/`: the full-page manager (sidebar, session view, search, settings, welcome).
- `src/popup/`: the toolbar popup.
- `store/listing.md`: Chrome Web Store text. `PRIVACY.md`: the policy the listing links to.

## Pro licence

`GUMROAD_PRODUCT_ID` in `src/lib/license.ts` is empty until the Gumroad product exists; keys are refused with a plain
message until then. Set it and `PRO_URL`, rebuild, and licence checks go live (one POST to api.gumroad.com).
