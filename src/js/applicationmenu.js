const electron = require('electron');
const remote = electron.remote;
const Menu = remote.Menu;
const app = remote.app;
const webFrame = electron.webFrame;

var IS_DARWIN = remote.process.platform == 'darwin';
var IS_DEBUG = ENV == 'development';

const APP_NAME = app.getName();
const DARWIN_APP_TEMPLATE = {
  label: APP_NAME,
  submenu: [
    {
      label: 'About ' + APP_NAME,
      role: 'about'
    },
    {
      type: 'separator'
    },
    {
      label: 'Services',
      role: 'services',
      submenu: []
    },
    {
      type: 'separator'
    },
    {
      label: 'Hide ' + APP_NAME,
      accelerator: 'Command+H',
      role: 'hide'
    },
    {
      label: 'Hide Others',
      accelerator: 'Command+Shift+H',
      role: 'hideothers'
    },
    {
      label: 'Show All',
      role: 'unhide'
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit ' + APP_NAME,
      accelerator: 'Command+Q',
      click: function() { app.quit(); }
    }
  ]
};

const VIEW_TEMPLATE = {
  label: 'View',
  submenu: [
    {
      label: 'Reload',
      accelerator: (function() {
        if (IS_DARWIN)
          return 'Command+R';
        else
          return 'Alt+R';
      })(),
      click: function(item, focusedWindow) {
        if (focusedWindow)
          focusedWindow.reload();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Zoom Reset',
      accelerator: 'CmdOrCtrl+0',
      click: () => {
        webFrame.setZoomFactor(1);
      }
    },
    {
      label: 'Zoom In',
      accelerator: 'CmdOrCtrl+Plus',
      click: () => {
        var zoom = webFrame.getZoomFactor();
        webFrame.setZoomFactor(zoom + 0.1);
      }
    },
    {
      label: 'Zoom Out',
      accelerator: 'CmdOrCtrl+-',
      click: () => {
        var zoom = webFrame.getZoomFactor();
        webFrame.setZoomFactor(zoom - 0.1);
      }
    }
  ]
};

const WINDOW_TEMPLATE =     {
  label: 'Window',
  role: 'window',
  submenu: [
    {
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    }
  ]
};

var ADD_NEW_NOTE;
var IMPORT_NOTES;
var MOVE_SYNC;
var OPEN_EXISTING_SYNC;
var EDIT_SUBMENU;
var DISPLAY_ORDER;
var DISP_SET_UPDATED;
var DISP_SET_CREATED;
var TOGGLE_PREVIEW;
var TOGGLE_WIDESCREEN;
var DISPLAY_CREDITS;

class ApplicationMenu {
  // File
  setAddNewNote(addNewNote) {
    ADD_NEW_NOTE = {
      label: 'New Note',
      accelerator: (function() {
        if (IS_DARWIN)
          return 'Command+N';
        else
          return 'Alt+N';
      })(),
      click: () => {
        addNewNote()
      }
    }
  }
  setImportNotes(importNotes) {
    IMPORT_NOTES = {
      label: 'Import Markdown Note...',
      click: () => {
        importNotes()
      }
    }
  }
  setMoveSync(moveSync) {
    MOVE_SYNC = {
      label: 'Move Sync Folder...',
      click: () => {
        moveSync()
      }
    }

  }
  setOpenExistingSync(openSync) {
    OPEN_EXISTING_SYNC = {
      label: 'Open Existing Sync Folder...',
      click: () => {
        openSync()
      }
    }
  }
  // Edit
  setEditSubmenu(submenu) {
    EDIT_SUBMENU = submenu
  }

  // View
  setDisplayOrder(order, setU, setC) {
    DISPLAY_ORDER = order;
    DISP_SET_UPDATED = setU;
    DISP_SET_CREATED = setC;
  }

  setTogglePreview(togglePreview) {
    TOGGLE_PREVIEW = {
      label: 'Toggle Preview',
      accelerator: (function() {
        if (IS_DARWIN)
          return 'Command+P';
        else
          return 'Alt+P';
      })(),
      click: () => {
        togglePreview()
      }
    }
  }

  setToggleWidescreen(toggleWidescreen) {
    TOGGLE_WIDESCREEN = {
      label: 'Toggle Sidebar',
      accelerator: (function() {
        if (IS_DARWIN)
          return 'Command+S';
        else
          return 'Shift+Alt+S';
      })(),
      click: () => {
        toggleWidescreen()
      }
    }
  }

  setCredits(dialogCredits) {
    DISPLAY_CREDITS = {
      label: 'Credits',
      click: () => {
        dialogCredits()
      }
    }
  }

  setMenu() {
    var viewTmp = _.cloneDeep(VIEW_TEMPLATE);
    viewTmp.submenu.unshift({
      type: 'separator'
    });
    viewTmp.submenu.unshift({
      label: 'Notes Order',
      submenu: [
        {label: 'Updated Date',
         type: 'radio',
         checked: (() => {return DISPLAY_ORDER == 'updatedAt'})(),
         click: DISP_SET_UPDATED,
         accelerator: (function() {
           if (IS_DARWIN)
             return 'Shift+Cmd+U';
           else
             return 'Shift+Alt+U';
         })()},
        {label: 'Created Date',
         type: 'radio',
         checked: (() => {return DISPLAY_ORDER == 'createdAt'})(),
         click: DISP_SET_CREATED,
         accelerator: (function() {
           if (IS_DARWIN)
             return 'Shift+Cmd+C';
           else
             return 'Shift+Alt+C';
         })()}
      ]
    });
    viewTmp.submenu.push({
      type: 'separator'
    });
    viewTmp.submenu.push({
      label: 'Toggle Fullscreen',
      accelerator: (function() {
        if (IS_DARWIN)
          return 'Ctrl+Command+F';
        else
          return 'F11';
      })(),
      click: function(item, focusedWindow) {
        if (focusedWindow)
          focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
      }
    });
    viewTmp.submenu.push(TOGGLE_WIDESCREEN);
    viewTmp.submenu.push(TOGGLE_PREVIEW);

    //if (IS_DEBUG) {
      viewTmp.submenu.push({
        type: 'separator'
      });
      viewTmp.submenu.push({
        label: 'Toggle Developer Tools',
        accelerator: (function() {
          if (IS_DARWIN)
            return 'Alt+Command+I';
          else
            return 'Ctrl+Shift+I';
        })(),
        click: function(item, focusedWindow) {
          if (focusedWindow)
            focusedWindow.toggleDevTools();
        }
      })
    //}
    
    //if(DISPLAY_CREDITS) HELP_TEMPLATE.submenu.push(DISPLAY_CREDITS);
    var HELP_TEMPLATE = {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Go to Official Site',
          click: function() { require('electron').shell.openExternal('https://pilemd.com/') }
        },
        {
          label: 'Go to GitHub Project',
          click: function() { require('electron').shell.openExternal('https://github.com/MattNer0/pilemd/') }
        },
        {
          label: 'Go to Original GitHub Project',
          click: function() { require('electron').shell.openExternal('https://github.com/hirokiky/pilemd/') }
        },
        DISPLAY_CREDITS
      ]
    };

    var temp = [
      {label: 'File',
       submenu: [
         ADD_NEW_NOTE,
         {type: 'separator'},
         IMPORT_NOTES,
         MOVE_SYNC,
         OPEN_EXISTING_SYNC
       ]},
      {label: 'Edit',
       submenu: EDIT_SUBMENU || []},
      viewTmp,
      WINDOW_TEMPLATE,
      HELP_TEMPLATE
    ];
    if (IS_DARWIN) {
      temp.unshift(DARWIN_APP_TEMPLATE);
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(temp))
  }
}

module.exports = {
  ApplicationMenu: ApplicationMenu,
  IS_DARWIN: IS_DARWIN
};
