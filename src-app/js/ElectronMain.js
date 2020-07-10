/**
 * WebSlicer
 * Copyright (C) 2020  SynDaver Labs, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Entry point for when using SympleSlicer as an Electron app

const { app, BrowserWindow, Menu, powerSaveBlocker, ipcMain  } = require('electron')
const path = require('path')

function createWindow () {
    // Create the browser window.
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            enableremotemodule: false,
            preload: path.join(__dirname, 'ElectronPreload.js'),
            nativeWindowOpen: true
        }
    });

    // Open the DevTools.
    //devtools = new BrowserWindow()
    //win.webContents.setDevToolsWebContents(devtools.webContents)
    //win.webContents.openDevTools({ mode: 'detach' })

    // Open external links in external browsers
    let handleRedirect = (e, url) => {
      if(url.startsWith('http:') || url.startsWith('https:')) {
        if(url.match(/^[\w-.\/:]*$/)) {
            require('electron').shell.openExternal(url);
        }
        e.preventDefault();
      }
    }

    win.webContents.on('will-navigate', handleRedirect)
    win.webContents.on('new-window', handleRedirect)

    // and load the index.html of the app.
    win.loadFile('index.html')

    createMenu(win);
}

function createMenu(win) {
    const isMac = process.platform === 'darwin';

    const template = [
        ...(isMac ? [{role: 'appMenu' }] : []),
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open file(s)\u2026',
                    accelerator: 'CommandOrControl+O',
                    click: () => win.webContents.executeJavaScript('selectModelFiles()', true)
                },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        // { role: 'editMenu' }
        {
            label: 'Edit',
            submenu: [
                /*{ role: 'undo', enabled: false },
                { role: 'redo', enabled: false },
                { type: 'separator' },*/
                { label: 'Center Selected Object', click: () => win.webContents.executeJavaScript('stage.menuAction("center_one")') },
                { label: 'Delete Selected Objects', click: () => win.webContents.executeJavaScript('stage.menuAction("delete_some")') },
                { type: 'separator' },
                { label: 'Edit Transform Values\u2026', click: () => win.webContents.executeJavaScript('stage.menuAction("xform_some")') },
                { type: 'separator' },
                { label: 'Select All Objects', click: () => win.webContents.executeJavaScript('stage.menuAction("select_all")') },
                { label: 'Arrange All Objects', click: () => win.webContents.executeJavaScript('stage.menuAction("arrange_all")') },
                { label: 'Clear Build Plate', click: () => win.webContents.executeJavaScript('stage.menuAction("delete_all")') },
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
                {label: 'Front',  click: () => win.webContents.executeJavaScript('renderLoop.setView("front")')},
                {label: 'Left',   click: () => win.webContents.executeJavaScript('renderLoop.setView("left")')},
                {label: 'Right',  click: () => win.webContents.executeJavaScript('renderLoop.setView("right")')},
                {label: 'Back',   click: () => win.webContents.executeJavaScript('renderLoop.setView("back")')},
                {label: 'Top',    click: () => win.webContents.executeJavaScript('renderLoop.setView("top")')},
                {label: 'Bottom', click: () => win.webContents.executeJavaScript('renderLoop.setView("bottom")')},
                { type: 'separator' },
                { role: 'togglefullscreen' },
                { role: 'toggledevtools' }
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'Tasks',
            submenu: [
                {label: 'Select Profiles\u2026',   click: () => win.webContents.executeJavaScript('settings.gotoPage("page_profiles")')},
                {label: 'Place Objects\u2026',     click: () => win.webContents.executeJavaScript('settings.gotoPage("page_place")')},
                {label: 'Slice Objects\u2026',     click: () => win.webContents.executeJavaScript('settings.gotoPage("page_slice")')},
                { type: 'separator' },
                {label: 'Machine Setup\u2026',     click: () => win.webContents.executeJavaScript('settings.gotoPage("page_machine")')},
                {label: 'Update Firmware\u2026',   click: () => win.webContents.executeJavaScript('settings.gotoPage("page_flash_fw")')},
                {label: 'Advanced Features\u2026', click: () => win.webContents.executeJavaScript('settings.gotoPage("page_advanced")')},
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: "About Symple Slicer\u2026",
                    click: () => win.webContents.executeJavaScript('showAbout()')
                },
                {
                    label: "User's Guide\u2026",
                    click: () => win.webContents.executeJavaScript('showUserGuide()')
                },
                {
                    label: "Change Log\u2026",
                    click: () => win.webContents.executeJavaScript('Updater.showReleaseNotes()')
                },
                { type: 'separator' },
                {
                    label: 'About SynDaver\u2026',
                    click: async () => {
                        const { shell } = require('electron')
                        await shell.openExternal('https://syndaver.com')
                    }
                }
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

//app.commandLine.appendSwitch('--enable-gpu')
//app.commandLine.appendSwitch('--enable-logging')
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");

app.allowRendererProcessReuse = false;
app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
})

let powerSaveId;

ipcMain.on('setPowerSaveEnabled', (event, enabled) => {
    if(enabled) {
        // Enable power saving mode if it was previously disabled
        if(powerSaveId) {
            console.log("Enabling power saving mode");
            powerSaveBlocker.stop(powerSaveId);
            powerSaveId = null;
        }
    } else {
        // Disable power saving mode if it was previously enabled
        if(!powerSaveId) {
            console.log("Disabling power saving mode");
            powerSaveId = powerSaveBlocker.start('prevent-app-suspension');
        }
    }
})