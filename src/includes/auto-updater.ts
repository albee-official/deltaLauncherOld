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
    compareNumerical(a: string, b: string, strict=true) { return compareNumerical(a, b, strict); }
}

// return true if "b" bigger than "a"
function compareNumerical(a: string, b: string, strict=true) {
    let a_values = a.split('.');
    let b_values = b.split('.');
    if (!strict && a == b) return true;
    for (let i = 0; i < Math.max(a_values.length, b_values.length); i++) {
        if (a_values[i] == undefined) return true;
        if (a_values[i] < b_values[i]) {
            return true;
        }
    }

    return false;
}

let prefixes = ['dev', 'alpha', 'beta', 'prerelease']

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
        let ver_a = a.split('-');
        let ver_b = b.split('-');

        // log.info(ver_a, ver_b);

        if (this.settingsStorage.settings.dev_mode) {
            if (ver_a.length > 1 && ver_b.length > 1) {
                if (compareNumerical(ver_a[0], ver_b[0])) {
                    return true;
                }

                if (ver_a[0] == ver_b[0]) {
                    return prefixes.findIndex(el => el == ver_b[1]) > prefixes.findIndex(el => el == ver_a[1])
                } else {
                    return false;
                }
            }

            return compareNumerical(ver_a[0], ver_b[0]);
        } else {
            if (ver_b.length > 1) return false;
            if (ver_a.length > 1) return true;
            return compareNumerical(ver_a[0], ver_b[0]);
        }
    }

    public async getLatestRelease(): Promise<Release> {
        let res: Array<any> = await fetch(`https://api.github.com/repos/AlbeeTheLoli/deltaLauncher/releases`).then(res => res.json());

        if (this.settingsStorage.settings.dev_mode) {
            let i = res.reverse().findIndex((_el: any) => {log.info(app.getVersion(), _el.name, this.compareVersions(app.getVersion(), _el.name)); return this.compareVersions(app.getVersion(), _el.name)})
            if (i == -1) i = 0;
            return {
                name: res[i].name,
                url: res[i].assets[0].browser_download_url,
            };
        } else {
            let i = res.findIndex((el: any) => el.name.split('-').length == 1)
            log.info(i)
            if (i == -1) {
                return {
                    name: res[0].name,
                    url: res[0].assets[0].browser_download_url,
                };
            }

            return {
                name: res[i].name,
                url: res[i].assets[0].browser_download_url,
            };
        }
    }

    public async checkForUpdates() {
        let release = await this.getLatestRelease();
        console.log(release);
        
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