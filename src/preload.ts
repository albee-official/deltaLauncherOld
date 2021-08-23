import { BrowserWindow, ipcRenderer, IpcRendererEvent, remote, Shell, shell } from "electron";
import path from 'path'
import logger from 'electron-log';
const log = logger.create('renderer');
log.transports.console.format = '{h}:{i}:{s} > {text}';
log.transports.file.format = '{h}:{i}:{s} > {text}';
import fs from 'fs-extra';
import os from 'os'

//  Allow importing in renderers
//# DO NOT IMPORT ANYTHING THERE, ONLY TYPES
window.exports = exports;

// Includes

let modpackManager = remote.getGlobal('modpackManager');

import { SettingsInterface } from './includes/settings-manager';
let settingsInterface = new SettingsInterface(remote, ipcRenderer);

import { AuthInterface } from './includes/auth-manager';
let authInterface = new AuthInterface(remote, ipcRenderer);

import { AutoUpdaterInterface } from './includes/auto-updater';
let autoUpdater = new AutoUpdaterInterface(remote, ipcRenderer);


//. ------------------
//#region Libs

//@ts-expect-error
window.modpackManager = modpackManager;

//@ts-expect-error
window.settingsInterface = settingsInterface;

//@ts-expect-error
window.authInterface = authInterface;

//@ts-expect-error
window.autoUpdater = autoUpdater;

//#endregion
//. ------------------
//#region Apis

//@ts-expect-error
window.browserWindow = {
    exit: () => {remote.getCurrentWindow().close()},
    minimize: () => {remote.getCurrentWindow().minimize()},
    maximize: () => {remote.getCurrentWindow().maximize()},
    show: () => {remote.getCurrentWindow().show()},
    //@ts-expect-error
    reload: () => {window.modpackManager.downloader.cancel(); remote.getCurrentWindow().reload()},
    isDevToolsOpened: () => {return remote.getCurrentWindow().webContents.isDevToolsOpened()}
}

//@ts-expect-error
window.ipcRenderer = {
    send: ipcRenderer.send,
    sendSync: ipcRenderer.sendSync,
    on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {ipcRenderer.on(channel, listener)},
    once: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {ipcRenderer.once(channel, listener)},
    removeAllListeners: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {ipcRenderer.removeAllListeners(channel)},
}

//@ts-expect-error
window.shell = {
    showItemInFolder: async (path: string) => {        
        await shell.showItemInFolder(path);
    },
    openPath: async (path: string) => {
        await shell.openPath(path);
    },
    openExternal: async (url: string) => {
        await shell.openExternal(url);
    }
}

//@ts-expect-error
window.path = {
    ...path    
}

//@ts-expect-error
window.dialog = {
    showOpenDialog: async (options: any) => {
        return await remote.dialog.showOpenDialog(options);
    }
}

//#endregion
//. ------------------
//#region  //. Console warning --------------------------------------------

//@ts-expect-error
if (window.browserWindow.isDevToolsOpened()) {
    let header_color = `#705CF2`; 
    let p_color = `#6754E2`;
    console.info("%cПодожди-ка!", `color:${header_color}; font-size: 48px; padding: 8px 0; font-weight:bold`);
    console.info("%cТот, кто попросил вставить что либо сюда, с вероятностью 420/69 хочет тебя обмануть.", "color:#ffffff; font-size: 14px; padding: 8px 0");
    console.info("%cЕсли вставить сюда что-нибудь, плохие дяди смогут получить доступ к вашему аккаунту.", `color:${p_color}; font-size: 16px; padding: 8px 0; font-weight:bold`);
}

ipcRenderer.on('devtools-opened', (_) => {
    let header_color = `#705CF2`; 
    let p_color = `#6754E2`;
    console.info("%cПодожди-ка!", `color:${header_color}; font-size: 48px; padding: 8px 0; font-weight:bold`);
    console.info("%cТот, кто попросил вставить что либо сюда, с вероятностью 420/69 хочет тебя обмануть.", "color:#ffffff; font-size: 14px; padding: 8px 0");
    console.info("%cЕсли вставить сюда что-нибудь, плохие дяди смогут получить доступ к вашему аккаунту.", `color:${p_color}; font-size: 16px; padding: 8px 0; font-weight:bold`);
});

//#endregion
//. ------------------
//#region App frame (close, minimize, reload buttons), Theme and other onload stuff

let id = -1;

ipcRenderer.send('get-window');
ipcRenderer.on('window-id', (_, arg) => {
    id = arg - 1; // Get window id and store it
})

// window.onunload = () => {
//     ipcRenderer.send('win-hide');
// }

//@ts-expect-error
window.onbeforeload = () => {
    settingsInterface.theme = settingsInterface.settings.appearance.theme;
    settingsInterface.bg = settingsInterface.settings.appearance.bg;
    settingsInterface.filter_opacity = settingsInterface.settings.appearance.filter_opacity;
    settingsInterface.blur_amount = settingsInterface.settings.appearance.blur_amount;

    console.log('onbeforeload');
}

//@ts-expect-error
window.max_setable_ram = Math.min(Math.ceil(os.freemem() / 1024 / 1024 / 1024) + 1, Math.ceil(os.totalmem() / 1024 / 1024 / 1024));
//@ts-expect-error
window.min_setable_ram = 4;
//@ts-expect-error
window.os = os;

window.onload = async () => {
    // settingsManager.theme = settingsManager.settings.appearance.theme;
    // settingsManager.bg = settingsManager.settings.appearance.bg;
    console.log('onload');

    if (settingsInterface.settings.dev_mode) document.body.classList.add('dev');
    (document.getElementById('bg-video') as HTMLVideoElement).muted = settingsInterface.settings.appearance.muted;
    
    document.getElementById('app-exit')?.addEventListener('click', () => {
        console.log('exiting');
        //@ts-expect-error
        window.browserWindow.exit();
    });

    document.getElementById('app-minimize')?.addEventListener('click', () => {
        //@ts-expect-error
        window.browserWindow.minimize();
    });

    document.getElementById('app-reload')?.addEventListener('click', () => {
        console.log('reloading');
        //@ts-expect-error
        window.browserWindow.reload();
        //@ts-expect-error
        window.modpackManager.downloader.cancel();
    });

    window.onbeforeunload = () => {
        //@ts-expect-error
        window.modpackManager.downloader.cancel();
        console.log('BYE :)');
    }

    //@ts-expect-error
    window.browserWindow.show();
}

window.console.log = log.info;

//@ts-expect-error
window.version = remote.app.getVersion();

//@ts-expect-error
window.CapitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// let i = 10000000000;
// while (i > 0) {i--};

//#endregion
//. ------------------