import { ipcRenderer, IpcRendererEvent, remote } from "electron";

//  Allow importing in renderers
//# DO NOT IMPORT ANYTHING THERE, ONLY TYPES
window.exports = exports;

// Includes

import { ModpackManager } from './includes/modpack-manager';
let modpackManager = new ModpackManager(remote, ipcRenderer);

import { SettingsManager } from './includes/settings-manager';
let settingsManager = new SettingsManager(remote, ipcRenderer);

//. ------------------
//#region Libs

//@ts-expect-error
window.modpackManager = modpackManager;

//@ts-expect-error
window.settingsManager = settingsManager;

//#endregion
//. ------------------
//#region Apis

//@ts-expect-error
window.browserWindow = {
    exit: () => {remote.getCurrentWindow().close()},
    minimize: () => {remote.getCurrentWindow().minimize()},
    maximize: () => {remote.getCurrentWindow().maximize()},
    reload: () => {remote.getCurrentWindow().reload()},
    isDevToolsOpened: () => {return remote.getCurrentWindow().webContents.isDevToolsOpened()}
}

//@ts-expect-error
window.ipcRenderer = {
    send: ipcRenderer.send,
    sendSync: ipcRenderer.sendSync,
    on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {ipcRenderer.on(channel, listener)},
    once: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {ipcRenderer.once(channel, listener)},
}

//#endregion
//. ------------------
//#region  //. Console warning --------------------------------------------

//@ts-expect-error
if (window.browserWindow.isDevToolsOpened()) {
    let header_color = `#705CF2`; 
    let p_color = `#6754E2`;
    console.log("%cПодожди-ка!", `color:${header_color}; font-size: 48px; padding: 8px 0; font-weight:bold`);
    console.log("%cТот, кто попросил вставить что либо сюда, с вероятностью 420/69 хочет тебя обмануть.", "color:#ffffff; font-size: 14px; padding: 8px 0");
    console.log("%cЕсли вставить сюда что-нибудь, плохие дяди смогут получить доступ к вашему аккаунту.", `color:${p_color}; font-size: 16px; padding: 8px 0; font-weight:bold`);
}

ipcRenderer.on('devtools-opened', (_) => {
    let header_color = `#705CF2`; 
    let p_color = `#6754E2`;
    console.log("%cПодожди-ка!", `color:${header_color}; font-size: 48px; padding: 8px 0; font-weight:bold`);
    console.log("%cТот, кто попросил вставить что либо сюда, с вероятностью 420/69 хочет тебя обмануть.", "color:#ffffff; font-size: 14px; padding: 8px 0");
    console.log("%cЕсли вставить сюда что-нибудь, плохие дяди смогут получить доступ к вашему аккаунту.", `color:${p_color}; font-size: 16px; padding: 8px 0; font-weight:bold`);
});

//#endregion
//. ------------------
//#region App frame (close, minimize, reload buttons), Theme and other onload stuff

let id = -1;

ipcRenderer.send('get-window');
ipcRenderer.on('window-id', (_, arg) => {
    id = arg - 1; // Get window id and store it
})

window.onload = () => {
    document.getElementById('app-exit')?.addEventListener('click', () => {
        //@ts-expect-error
        window.browserWindow.exit();
    });

    document.getElementById('app-minimize')?.addEventListener('click', () => {
        //@ts-expect-error
        window.browserWindow.minimize();
    });

    document.getElementById('app-reload')?.addEventListener('click', () => {
        //@ts-expect-error
        window.browserWindow.reload();
    });

    settingsManager.theme = settingsManager.settings.appearance.theme;
    settingsManager.bg = settingsManager.settings.appearance.bg;
}

//#endregion
//. ------------------