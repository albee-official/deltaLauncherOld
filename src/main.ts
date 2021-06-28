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
        frame: false,
        transparent: true,
        vibrancy: 'fullscreen-ui',
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
});

// Biblioteks

import { listeners } from  './includes/modpack-manager';
for (const listener_name in listeners) {
    //@ts-expect-error
    ipcMain.on(listener_name as string, listeners[listener_name] as Function);
}

ipcMain.on('get-window', (event) => {    
    event.reply('window-id', event.sender.id)
})