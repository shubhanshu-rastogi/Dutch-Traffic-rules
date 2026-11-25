# Dutch Road Signs Trainer

Learn all 165 Dutch road traffic signs from the *Reglement verkeersregels en verkeerstekens 1990* (RVV 1990), one at a time. Every sign has a plain-English meaning, what to do, a tip, and an animated top-down road example. A quiz mode tests you.

It is an installable web app (PWA): it works offline and can be added to a phone's home screen. No app store, no cost.

**Live app:** <https://shubhanshu-rastogi.github.io/Dutch-Traffic-rules/>

## Run it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (Offline mode needs `http://localhost` or `https://`; it does not work from a `file://` path.)

## Publish free on GitHub Pages

This repository deploys itself: the workflow in `.github/workflows/pages.yml` publishes the site on every push to `main`.

One-time setup on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The site is then at <https://shubhanshu-rastogi.github.io/Dutch-Traffic-rules/>.

## Install on a phone

- **iPhone (Safari):** open the site → Share → **Add to Home Screen**.
- **Android (Chrome):** open the site → menu → **Install app** (or tap the **Install app** button in the header).

After the first visit, everything is cached and works without a connection.

## Project layout

| Path | What it is |
|---|---|
| `index.html` | The page and all styles |
| `app.js` | Catalogue, sign detail, quiz, progress |
| `data.js` | The 165 signs: names, meanings, tips, scene settings |
| `scenes.js` | Engine that draws and animates the road examples (SVG) |
| `signs/` | Sign images |
| `icons/`, `manifest.webmanifest` | App icon and install settings |
| `sw.js` | Offline cache (generated, see below) |
| `pwa.js` | Registers the offline cache and the install button |

### After changing files

Run `python3 scripts/build-sw.py` so that `sw.js` lists the new files and gets a new cache version. The GitHub workflow also does this automatically on every deploy.

## Source and disclaimer

Sign names and rules are based on the English translation of the RVV 1990 published by the Dutch government. That translation states that the Dutch version is the legally binding one. This app is an unofficial learning aid and is not affiliated with the Dutch government. Learning progress is stored only in your own browser.
