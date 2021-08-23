import { IpcMain, remote as rmt, ipcRenderer as ipcR, app, BrowserWindow, shell } from 'electron';
import logger from 'electron-log';
import fetch from 'node-fetch'
import path from 'path';
import { Downloader, progress } from './downloader';
import { SettingsStorage } from './settings-manager';
import rimraf from 'rimraf';
import fs from 'fs-extra'
const log = logger.create('update');
log.variables.label = 'update';
log.transports.console.format = '{h}:{i}:{s} > [{label}] {text}';
log.transports.file.format = '{h}:{i}:{s} > [{label}] {text}';

interface Release {
    name: string,
    url: string,
}

export class AutoUpdaterInterface {
    private _getGlobal: typeof rmt.getGlobal;

    public constructor (remote: typeof rmt, ipcRenderer: typeof ipcR) {
        this._getGlobal = remote.getGlobal;
    }

    async getLatestRelease() { return await this._getGlobal('autoUpdater').getLatestRelease(); }
    async checkForUpdates() { return await this._getGlobal('autoUpdater').checkForUpdates(); }
    compareVersions(a: string, b: string) { return this._getGlobal('autoUpdater').compareVersions(a, b); }
}

// return true if "b" bigger than "a"
function compareNumerical(a: string, b: string) {
    let a_values = a.split('.');
    let b_values = b.split('.');
    for (let i = 0; i < Math.max(a_values.length, b_values.length); i++) {
        if (a_values[i] == undefined) return true;
        if (a_values[i] < b_values[i]) {
            return true;
        }
    }

    return false;
}

export class AutoUpdater {
    fetch: typeof fetch;
    ipc: IpcMain;
    settingsStorage: SettingsStorage;
    root: string;
    downloader = new Downloader();
    location: string;

    constructor (_ipcMain: IpcMain, _root: string, _settingsStorage: SettingsStorage) {
        log.info('init');

        this.root = _root;
        this.location = path.join(this.root, 'update');
        this.fetch = fetch;
        this.ipc = _ipcMain;
        this.settingsStorage = _settingsStorage;
    }

    // return true if "b" bigger than "a"
    public compareVersions(a: string, b: string) {
        let v_a = a.split('-');
        let v_b = b.split('-');
        if (v_a.length > 1 && v_b.length > 1) {
            return compareNumerical(v_a[0], v_b[0]);
        } else if (v_a.length > 1) {
            return true;
        } else if (v_b.length > 1) {
            return false;
        } else {
            return compareNumerical(v_a[0], v_b[0]);
        }
    }

    public async getLatestRelease(): Promise<Release> {
        let res = await fetch(`https://api.github.com/repos/AlbeeTheLoli/deltaLauncher/releases/latest`).then(res => res.json());
        return {
            name: res.name,
            url: res.assets[0].browser_download_url,
        };
    }

    public async checkForUpdates() {
        let release = await this.getLatestRelease();
        if (this.compareVersions(app.getVersion(), release.name)) {
            log.info('update is required. downloading');

            await this.downloadUpdate(release);

            return true;
        } else {
            log.info('latest version installed. no update needed');
            BrowserWindow.getAllWindows()[0].webContents.send('update-noneed', app.getVersion());
            return false;
        }
    }

    public async downloadUpdate(release: Release) {
        log.info(`downloading version '${release.name}' to '${this.location}' from '${release.url}'`);
        BrowserWindow.getAllWindows()[0].webContents.send('update-found', release.name);

        let downloaded_path = await this.downloader.download(this.location, release.url, 'updater.exe', 8, progress => {
            log.info(progress);
            BrowserWindow.getAllWindows()[0].webContents.send('update-progress', {...release, progress});
        });

        log.info(`downloaded version '${release.name}' to '${this.location}' from '${release.url}'`);
        BrowserWindow.getAllWindows()[0].webContents.send('update-downloaded', release.name);

        await shell.openPath(downloaded_path);
        process.exit();
    }

    public async afterUpdate() {
        if (await fs.pathExists(this.location)) await rimraf(this.location, err => {
            if (err) log.error(err);
        });
    }
}