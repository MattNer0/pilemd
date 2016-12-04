# PileMd

*PileMd is a Markdown Note App.*
*with Beautiful Markdown Editor, Comfortable Notes, and Local File Syncing.*

---

**Website**: https://pilemd.com/
**Original Project**: https://github.com/hirokiky/pilemd

---

> **Note**:
> I'm kind of going my own way with this right now...

## Quick list of changes

- file system folder structure with **racks**, **folders** and `.md` note files for easy access
- `.rack` and `.folder` files to store metadata like display order
- **note** contents are only loaded when the **folder** or the **note** itself is opened (instead of loading everything on startup)
- sidebar with expandable tree menu list of the **folders** inside **racks**
- resize sidebar width (could use more work but it's there)
- application settings saved inside `appData` folder (window size, last open folder, preview toggle, etc.) 
- added preview mode toggle from right click menu for quicker access
- checkbox display and interaction in preview mode
- style changes all around for the heck of it

## Run

```
npm install
NODE_ENV=development webpack
electron .
```

## Build

* `gulp`
* `PM_OSX_SIGN='...' gulp electron`
* `gulp electron-linux`
* `gulp electron-windows`