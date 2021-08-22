import { IpcMain, remote as rmt, ipcRenderer as ipcR } from 'electron';
import logger from 'electron-log';
import fetch from 'node-fetch'
import { SettingsStorage } from './settings-manager';
const log = logger.create('update');
log.variables.label = 'update';
log.transports.console.format = '{h}:{i}:{s} > [{label}] {text}';

export class AutoUpdaterInterface {
    private _getGlobal: typeof rmt.getGlobal;

    public constructor (remote: typeof rmt, ipcRenderer: typeof ipcR) {
        this._getGlobal = remote.getGlobal;
    }
}

export class AutoUpdater {
    fetch: typeof fetch;
    ipc: IpcMain;
    settingsStorage: SettingsStorage;
    root: string;

    constructor (_ipcMain: IpcMain, _root: string, _settingsStorage: SettingsStorage) {
        log.info('init');

        this.root = _root;
        this.fetch = fetch;
        this.ipc = _ipcMain;
        this.settingsStorage = _settingsStorage;
    }

    
}