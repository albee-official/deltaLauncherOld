import { app, BrowserWindow, ipcMain } from "electron";
import path from 'path';
import logger from 'electron-log'
import * as fs from 'fs-extra';

const log = logger.create('main');

let mainWindow: BrowserWindow;

app.on('ready', () => {
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
    mainWindow.on('ready-to-show', () => mainWindow.show());

    mainWindow.webContents.on("devtools-opened", (err: string) => {
        mainWindow.webContents.send("devtools-opened");
        log.info("[MAIN] console opened");
        // win.webContents.closeDevTools();
    });

    onFirstLaunch();
});

function createMainWindow() {
    return new Promise((resolve, _) => {
        let win = new BrowserWindow({
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
    
        win.loadFile('./src/pages/main/index.html');
        win.on('ready-to-show', async () => {
            win.show()
            resolve(win);
        });
    
        win.webContents.on("devtools-opened", (err: string) => {
            win.webContents.send("devtools-opened");
            log.info("[MAIN] console opened");
        });
    })
}

// Biblioteks

import { listeners } from  './includes/modpack-manager';
for (const listener_name in listeners) {
    //@ts-expect-error
    ipcMain.on(listener_name as string, listeners[listener_name] as Function);
}

// IPC

function onFirstLaunch(afterupdate?: boolean) {
    if (afterupdate) {
        console.log('first launch');
    }
}

function getRoot() {
    let _path = path.join(app.getPath('appData'), '.delta');
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

ipcMain.on('get-window', (event) => {    
    event.reply('window-id', event.sender.id)
})