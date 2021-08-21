import electron, { app, BrowserWindow, ipcMain, remote } from "electron";
import path from 'path';
import logger from 'electron-log'
import * as fs from 'fs-extra';
import fetch from 'node-fetch'

const log = logger.create('main');

let mainWindow: BrowserWindow;

app.on('ready', () => {
    appReady();

    onFirstLaunch();
});

app.commandLine.appendSwitch("js-flags", "--expose_gc --max-old-space-size=256");
// app.allowRendererProcessReuse = false;

function appReady() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 800,
        minWidth: 1000,
        minHeight: 724,
        frame: false,
        thickFrame: true,
        icon: 'D:/Projects/delta launcher wohoo/src/res/favicon.png',
        // transparent: true,
        // vibrancy: 'fullscreen-ui',
        webPreferences: {
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: false,
            enableRemoteModule: true,
        },
        show: false,
    })

    mainWindow.loadFile('./src/pages/start/index.html');
    // mainWindow.on('ready-to-show', () => mainWindow.show());

    mainWindow.webContents.on("devtools-opened", (err: string) => {
        mainWindow.webContents.send("devtools-opened");
        log.info("[MAIN] console opened");
        // win.webContents.closeDevTools();
    });
}

function createMainWindow() {
    return new Promise((resolve, _) => {
        let win = new BrowserWindow({
            width: 1610,
            height: 900,
            minWidth: 1000,
            minHeight: 724,
            frame: false,
            thickFrame: true,
            icon: 'D:/Projects/delta launcher wohoo/src/res/favicon.png',
            // transparent: true,
            // vibrancy: 'fullscreen-ui',
            webPreferences: {
                nodeIntegration: false,
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: false,
                enableRemoteModule: true,
            },
            show: false,
        })
    
        win.loadFile('./src/pages/main/index.html');
        win.on('ready-to-show', async () => {
            resolve(win);
        });
    
        win.webContents.on("devtools-opened", (err: string) => {
            win.webContents.send("devtools-opened");
            log.info("[MAIN] console opened");
        });
    })
}

// Biblioteks

import { listeners as mm_l } from  './includes/modpack-manager';
for (const listener_name in mm_l) {
    //@ts-expect-error
    ipcMain.on(listener_name as string, listeners[listener_name] as Function);
}

// Settings
import { SettingsStorage } from './includes/settings-manager';
Object.defineProperty(global, 'settingsStorage', {
    value: new SettingsStorage(remote, getRoot())
})

// Auth

import { listeners as auth_listeners, AuthStorage } from './includes/auth-manager'
Object.defineProperty(global, 'authStorage', {
    //@ts-expect-error
    value: new AuthStorage(ipcMain, fetch, settingsStorage)
})
for (const listener_name in auth_listeners) {
    //@ts-expect-error
    ipcMain.on(listener_name as string, listeners[listener_name] as Function);
}

// ModpackManager
import { ModpackManager } from './includes/modpack-manager';
Object.defineProperty(global, 'modpackManager', {
    //@ts-expect-error
    value: new ModpackManager(remote, getRoot(), settingsStorage)
})


// IPC

function onFirstLaunch(afterupdate?: boolean) {
    if (afterupdate) {
        console.log('first launch');
    }
}

function getRoot() {
    let _path = path.join(app.getPath('appData'), '.delta-new');
    fs.ensureDirSync(_path);
    return _path;
}

ipcMain.on('get-root', (event) => {
    event.returnValue = getRoot();
});

ipcMain.on('open-main-window', async (event) => {
    mainWindow = (await createMainWindow()) as BrowserWindow;
    
    event.reply('main-window-opened', event.sender.id)
})

ipcMain.on('open-start-window', async (event) => {
    // app.relaunch();
    // app.exit();
    appReady();
    BrowserWindow.getAllWindows()[1].destroy();
})

ipcMain.on('get-window', (event) => {    
    event.reply('window-id', event.sender.id)
})