# PileMd

*PileMd is a Markdown Note App.*
*with Beautiful Markdown Editor, Comfortable Notes, and Local File Syncing.*

---

**Website**: https://pilemd.com/

**Original Project**: https://github.com/hirokiky/pilemd

---

## Upgrades

- updated _electron_
- updated _[Vue.js](https://vuejs.org/)_ to 2.x
- [single file components](https://vuejs.org/v2/guide/single-file-components.html) with `.vue` extension
- new template engine for Vue.js components: _Pug_
- stylesheet language: _Sass_
- _Uglify.js_ to minify javascript code

## Quick list of new features

- file system folder structure with **racks**, **folders** and `.md` note files for easy access
- `.rack` and `.folder` files to store metadata like display order
- **note** contents are only loaded when the **folder** or the **note** itself is opened (instead of loading everything on startup)
- sidebar with expandable tree menu list (**folders** and **racks**)
- resize sidebar width (could use more work but it's there)
- note menu with option to change font size, insert tables and more
- properties window with word/line count
- application settings saved inside `appData` folder (window size, last open folder, preview toggle, etc.) 
- added more items to the right click menu in preview mode (toggle, copy, etc.)
- checkbox display and interaction in preview mode
- style changes all around for the heck of it
- choose between different themes (light,dark)
- **encrypted** notes (password protected)

## Run (development)

```
npm install
npm run build
npm run start
```

or

```
npm install
npm run develop
```

## Build (production)

```
npm run linux
```

or

```
npm run linux && npm run deb64
```

or

```
npm run windows
```

or

```
npm run darwin
```