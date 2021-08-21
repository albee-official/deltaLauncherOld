import { remote as rmt, ipcRenderer as ipc, BrowserWindow, ipcMain, app } from 'electron'
import type { SettingsStorage } from '../includes/settings-manager';
import { copyWithProgress } from '../includes/copy-with-progress';
import request from 'request';
import nodeFetch from 'node-fetch';
import extract from 'extract-zip';
import rimraf from 'rimraf';
import * as fs from 'fs-extra';
import { open as openFile, FileHandle as FileHandle } from 'fs/promises';
import * as path from 'path'
import os from 'os'
import { spawn, ChildProcess } from 'child_process';

const mergeFiles = require('merge-files');

import logger from 'electron-log';
const log = logger.create('modpack');

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

//# Listeners in main event

export let listeners = {
    // 'test': (event: IpcMainEvent) => {
    //     event.reply('fuck off');
    // },
}

//# Lib

enum GRAPHICS_LEVELS {
    LOW,
    MINOR,
    DEFAULT,
    HIGH,
    ULTRA
}

export class Downloader {
    downloading = false;
    path = '';
    threads = -1;
    paused = false;
    progress = {
        percent: -1,
        total_size: -1,
        received_size: -1,
        status: 'idle',
    }

    public clearThreadFiles(path: string, threads: number) {
        for (let i = 0; i < threads; i++) {
            if (fs.pathExistsSync(path + `\\downloadingthread${i}.thread`)) fs.unlinkSync(path + `\\downloadingthread${i}.thread`);
        }
    }

    public cancel() {
        this.downloading = false;
        this.paused = false;
        return new Promise((resolve, reject) => {
            if (this.progress_interval != undefined) {
                clearInterval(this.progress_interval);
                this.progress_interval = undefined;
            }
    
            for (let req of this.requests) {
                req.abort();
            }

            if (this.requests.length > 1) {
                this.clearThreadFiles(this.path, this.threads);
            }
    
            if (fs.pathExistsSync(`${this.path}\\modpack.zip`)) fs.unlinkSync(`${this.path}\\modpack.zip`);

            this.downloading = false;
            this.path = '';
            this.threads = -1;
            this.progress = {
                percent: -1,
                total_size: -1,
                received_size: -1,
                status: 'idle',
            }
            this.requests = [];
            resolve(true);
        }).catch(err => {
            log.error(err)
        });
    }

    public pause() {
        this.paused = true;
        log.info('[DOWNLOAD] download paused')
        for (let req of this.requests) {
            req.pause();
        }
    }

    public resume() {
        this.paused = false;
        log.info('[DOWNLOAD] download resumed')
        for (let req of this.requests) {
            req.resume();
        }
    }

    //@ts-expect-error
    public async getInfo(url: string): {total_bytes: number} {
        let actual_attempts = 0; 
        while (actual_attempts < 20) {
            actual_attempts++;;
            let attempts = 0; 
            while (attempts <= 5) {
                attempts++;
                let res: {total_bytes: number} = await new Promise((resolve, reject) => {
                    log.info(`[DOWNLOAD] attempting to get file size. [${attempts}]`);
                    
                    let req = request({
                        method: "GET",
                        url: url,
                    })
            
                    req.on('response', (data) => {
                        req.abort();
                        if (data.headers['content-length']) {
                            let total_bytes = data.headers['content-length'];
                            //@ts-expect-error
                            resolve({total_bytes});
                        }
                        //@ts-expect-error
                        resolve(null);
                    })
                })
                if (res != null) {
                    log.info(`[DOWNLOAD] file size: ${res.total_bytes}`);
                    return res;
                } else {
                    continue;
                }
            }

            await this.foolGithubIntoThinkingIAmAGoodPerson(url);
        }

        //@ts-expect-error
        return null;
    }

    private foolGithubIntoThinkingIAmAGoodPerson(url: string) {
        return new Promise((resolve, reject) => {
            log.info(`Faking download from: ${url}`);
    
            let req = request({
                method: "GET",
                uri: url,
            });
    
            let fooling = setTimeout(() => {
                req.abort();
                resolve('');
            }, 3000);
        });
    }
 
    requests: any[] = [];
    public async createDownloadThread(start_bytes: number, finish_bytes: number, url: string, path: string, thread_num: number, onData: Function) {
        let thread_created_successfully = false;
        let thread_attempts = 0;
        while (!thread_created_successfully) {
            thread_attempts++;
            log.info(`[DOWNLOAD THREAD] <${thread_num}> attempting to create thread from: ${start_bytes} to: ${finish_bytes}. [${thread_attempts}]`);

            if (thread_attempts > 7) {
                thread_attempts = 0;
                await this.foolGithubIntoThinkingIAmAGoodPerson(url);
            }

            let received_bytes = 0;
            let total_bytes = 0;

            await new Promise((resolve, reject) => {                
                let req = request({
                    headers: {
                        Range: `bytes=${start_bytes}-${finish_bytes}`,
                    },
                    method: "GET",
                    url: url,
                })

                let out = fs.createWriteStream(path + "\\" + `downloadingthread${thread_num}.thread`);
                req.pipe(out);
        
                req.on('response', (data) => {
                    //@ts-expect-error
                    total_bytes = parseInt(data.headers["content-length"]);
                    log.info(`[DOWNLOAD THREAD] <${thread_num}> Got response. Size: ${data.headers["content-length"]}`);
                    if (total_bytes != undefined && total_bytes > (finish_bytes - start_bytes) / 2) {
                        this.requests.push(req);
                        thread_created_successfully = true;
                    } else {
                        reject("broken thread");
                        req.abort();
                        out.end();
                    }
                })

                req.on("data", function (chunk) {
                    // Update the received bytes
                    onData(chunk.length);
                });

                req.on("end", function (data) {
                    req.abort();
                    resolve('success');
                });

            }).then((res) => {
                return 'test';
            })
            .catch((err) => {
                log.info(`[DOWNLOAD THREAD] <${thread_num}> broken thread`);
            });
        }
    }

    progress_interval: NodeJS.Timeout | undefined = undefined;
    public download(folder: string, url: string, file_name: string, threads: number = 1, onProgress: (progress: any) => void) {
        return new Promise(async (resolve, reject) => {
            if (this.downloading) {
                log.info(`[DOWNLOAD] download in progress.`)
                reject();
            }
            this.downloading = true;
            this.path = folder;
            this.threads = threads;
            log.info(`[DOWNLOAD] initiating threaded download with '${threads}' threads from '${url}' to ${folder}`)
    
            let file_info = await this.getInfo(url);
    
            if (file_info == null) {
                log.info(`[DOWNLOAD] something went wrong while getting size... aborting download`);
                resolve(false);
            }
    
            let received_bytes = 0;
            let total_bytes = file_info.total_bytes;
            let threads_done = 0;
    
            this.progress_interval = setInterval(() => {
                if (this.paused) return;
                this.progress = {
                    percent: received_bytes / total_bytes,
                    received_size: received_bytes,
                    total_size: total_bytes,
                    status: 'downloading',
                }
                onProgress(this.progress);
            }, 1000)
    
            for (let i = 0; i < threads; i++) {
                let chunk_start = Math.floor((total_bytes / threads) * i);
                if (i > 0) chunk_start++;
                let chunk_finish = Math.floor((total_bytes / threads) * (i + 1));
    
                this.createDownloadThread(chunk_start, chunk_finish, url, folder, i, (chunk_length: any) => {
                    received_bytes += chunk_length;
                }).then(async res => {
                    log.info(`[DOWNLOAD THREAD] <${i}> thread done`);
                    threads_done++;
    
                    if (threads_done == threads) {
                        if (this.downloading) {
                            log.info(`[DOWNLOAD] merging threads...`);
    
                            if (this.progress_interval != undefined) {
                                clearInterval(this.progress_interval);
                                this.progress_interval = undefined;
                            }
    
                            this.progress = {
                                percent: 1,
                                received_size: total_bytes,
                                total_size: total_bytes,
                                status: 'merging',
                            }
                            onProgress(this.progress);
    
                            const outputPath = folder + `\\${file_name}`;
    
                            let inputPathList = [];
    
                            //. Add Thread to Threads list
                            for (let i = 0; i < threads; i++) {
                                inputPathList.push(folder + `\\downloadingthread${i}.thread`);
                            }
    
                            const status = await mergeFiles(inputPathList, outputPath);
                            log.info(`[DOWNLOAD] files merged: ${status}`);
    
                            this.progress = {
                                percent: 1,
                                received_size: total_bytes,
                                total_size: total_bytes,
                                status: 'finished',
                            }
                            onProgress(this.progress);
    
                            this.clearThreadFiles(folder, threads);
                            log.info(`[DOWNLOAD] completed`);
                            this.downloading = false;
                            resolve(outputPath);
                        } else {
                            log.info(`[DOWNLOAD] canceled`);
                            resolve(false);
                        }
                    }
                });
            }
        })
    }
}

export class ModpackManager {
    private _graphics_level = GRAPHICS_LEVELS.DEFAULT;
    private _root = '';
    private _modpacks: any;
    private _libs: any;
    private _resources: any;
    private _settingsStorage: SettingsStorage;
    private log_location = log.transports.file.getFile().path.split('\\main.log')[0];

    public downloader: Downloader;

    public constructor (remote: typeof rmt, root: string, settingsStorage: SettingsStorage) {
        log.info('[MODPACKS] init');
        
        this._settingsStorage = settingsStorage;
        this._root = root;
        this.ensureRoot();

        this.updateLibsDirs();
        this.updateModpackDirs();
        this.updateResourcesDirs();

        this.downloader = new Downloader();
    }

    public updateModpackDirs() {
        this._modpacks = {
            magicae: {
                link: '',
                path: path.normalize(path.join(this._settingsStorage.settings.modpacks.magicae.path.replace(/%ROOT%/g, this._root), 'magicae')),
                version: 1.0,
                libs_version: '1.12',
                installed: false,
            },
            fabrica: {
                link: '',
                path: path.normalize(path.join(this._settingsStorage.settings.modpacks.fabrica.path.replace(/%ROOT%/g, this._root), 'fabrica')),
                version: 1.0,
                libs_version: '1.12',
                installed: true,
            },
            statera: {
                link: '',
                path: path.normalize(path.join(this._settingsStorage.settings.modpacks.statera.path.replace(/%ROOT%/g, this._root), 'statera')),
                version: 1.0,
                libs_version: '1.12',
                installed: false,
            },
            insula: {
                link: '',
                path: path.normalize(path.join(this._settingsStorage.settings.modpacks.insula.path.replace(/%ROOT%/g, this._root), 'insula')),
                version: 1.0,
                libs_version: '1.12',
                installed: false,
            },
        };

        this.ensureModpackDirs();

        this._modpacks.magicae.installed = this.modpackInstalledSync('magicae');
        this._modpacks.fabrica.installed = this.modpackInstalledSync('fabrica');
        this._modpacks.statera.installed = this.modpackInstalledSync('statera');
        this._modpacks.insula.installed = this.modpackInstalledSync('insula');
    }

    public updateLibsDirs() {
        this._libs = {
            path: path.normalize(path.join(this._settingsStorage.settings.modpacks.libs.path.replace(/%ROOT%/g, this._root))),
            '1.12': {
                link: '',
                path: path.normalize(path.join(this._settingsStorage.settings.modpacks.libs.path.replace(/%ROOT%/g, this._root), '1.12')),
                version: 1.0,
                installed: false,
            },
        }
    }

    public updateResourcesDirs() {
        fs.ensureDirSync(path.normalize(path.join(this._root, 'resources')));
        this._resources = {
            path: path.normalize(path.join(this._root, 'resources')),
            skin: {
                path: path.normalize(path.join(this._root, 'resources', 'skin.png')),
            }
        }
    }

    public ensureRoot() {
        fs.ensureDirSync(this._root)
    }

    public get root() {
        fs.ensureDirSync(this._root)
        return this._root;
    }

    public set root(_) {}

    public get modpacks() { return this._modpacks; }
    public set modpacks(_: any) {}

    public get libs() { return this._libs; }
    public set libs(_: any) {}

    public modpackInstalledSync(modpack: string) {
        let pth = this._modpacks[modpack].path;
        if (fs.pathExistsSync(pth))
            return (fs.pathExistsSync(pth + '\\mods'));
        else return false;
    }

    public modpackInstalled(modpack: string) {
        return new Promise((resolve, reject) => {
            try {
                let installed = this.modpackInstalledSync(modpack)
                resolve(installed);
            } catch (err) {
                log.error(err);
                reject(err)
            }
        })
    }

    public libsIntalledSync(version: string, modpack?: string) {
        let pth = this._libs[version].path;
        if (fs.pathExistsSync(pth))
            if (modpack) {
                let modpack_pth = this._modpacks[modpack].path;
                console.log(modpack_pth + '\\assets');
                return ((fs.readdirSync(pth).length > 0
                    && fs.pathExistsSync(pth + '\\assets')
                    && fs.pathExistsSync(pth + '\\libraries')
                    && fs.pathExistsSync(pth + '\\versions')) && (
                       fs.pathExistsSync(modpack_pth + '\\assets')
                    && fs.pathExistsSync(modpack_pth + '\\libraries')
                    && fs.pathExistsSync(modpack_pth + '\\versions')));
            } else {
                return (fs.readdirSync(pth).length > 0
                    && fs.pathExistsSync(pth + '\\assets')
                    && fs.pathExistsSync(pth + '\\libraries')
                    && fs.pathExistsSync(pth + '\\versions'));
            }
        else return false;
    }

    public libsIntalled(version: string, modpack?: string) {
        return new Promise((resolve, reject) => {
            try {
                let installed = this.libsIntalledSync(version, modpack);
                resolve(installed);
            } catch (err) {
                log.error(err);
                reject(err)
            }
        })
    }

    public async ensureModpackDir(modpack_key: string) {
        let pth = path.normalize(this.modpacks[modpack_key].path);
        await fs.ensureDir(pth)
        return pth;
    }

    public async ensureLibsDir(libs_version?: string) {
        if (libs_version) {
            let pth = this.libs[libs_version].path;
            await fs.ensureDir(pth)
            return pth;
        } else {
            let pth = this.libs.path;
            await fs.ensureDir(pth)
            return pth;
        }
    }

    public async ensureModpackDirs() {
        for (const modpack_key in this.modpacks) {
            const modpack = this.modpacks[modpack_key];
            await fs.ensureDir(path.normalize(modpack.path))
        }
    }

    public async isFirstLaunch(modpack: string) {
        return await fs.pathExists((await this.ensureModpackDir(modpack)) + '\\.mixin.out');
    }

    public async getInfo(item: string, version?: string) {
        await fs.ensureDir(item)
        let pth = '';
        if (item == 'libs' && version) {
            pth = this.libs[version].path;
        } else if (this.modpacks[item]) {
            pth = this.modpacks[this.modpacks[item]].path;
        }

        const res = JSON.parse((await fs.readFile(pth)).toString());
        if (!res.version) res.version = 'v0.0.0.0';
        return res; 
    }

    public async setInfo(item: string, to: any, version?: string) {
        await fs.ensureDir(item)
        let pth = '';
        if (item == 'libs' && version) {
            pth = this.libs[version].path;
        } else if (this.modpacks[item]) {
            pth = this.modpacks[this.modpacks[item]].path;
        }

        let res = JSON.parse((await fs.readFile(pth)).toString());
        res = { ...res, ...to }
        fs.writeFile(pth, JSON.stringify(res));
    }

    public async getLatestLinkToModpack(modpack_name: string) {
        return new Promise((resolve, reject) => {
            nodeFetch(`https://api.github.com/repos/Avandelta/${capitalizeFirstLetter(modpack_name)}/tags`, {
                method: 'GET',
            }).then(res => res.json()).then(res => {
                if (res[0].zipball_url) {
                    log.info(res[0].name);
                    resolve(res[0].name);
                }
            }).catch(err => {log.error(err)})
        }).then(res => {
            return `https://github.com/Avandelta/${capitalizeFirstLetter(modpack_name)}/releases/download/${res}/${capitalizeFirstLetter(modpack_name)}-${res}.zip`
        })
    }

    public async getLatestLinkToLibs() {
        return new Promise((resolve, reject) => {
            nodeFetch(`https://api.github.com/repos/Avandelta/Libraries/tags`, {
                method: 'GET',
            }).then(res => res.json()).then(res => {
                if (res[0].zipball_url) {
                    log.info(res[0].name);
                    resolve(res[0].name);
                }
            }).catch(err => {log.error(err)})
        }).then(res => {
            return `https://github.com/Avandelta/Libraries/releases/download/${res}/Libraries-${res}.zip`
        })
    }

    public async clearLibsDir(version?: string) {
        let pth = '';
        if (version) {
            console.log(version);
            pth = this.libs[version].path;
        } else {
            pth = this.libs.path;
        }

        if (await fs.pathExists(pth))
            fs.readdir(pth, (err, files) => {
                files.forEach(file => {
                    if (file.toString().split('.').length > 1 && file.toString() != '.mixin.out' && file.toString() != '.git')
                    {
                        if (fs.pathExistsSync(path.join(pth, file))) fs.unlinkSync(path.join(pth, file));
                    }
                    else
                    {
                        if (fs.pathExistsSync(path.join(pth, file))) rimraf.sync(path.join(pth, file));
                    }
                })
            })
    }

    public async clearModpackDir(modpack_name: string) {
        let pth = this.modpacks[modpack_name].path;
        if (await fs.pathExists(pth))
            fs.readdir(pth, (err, files) => {
                files.forEach(file => {
                    if (file.toString().split('.').length > 1 && file.toString() != '.mixin.out' && file.toString() != '.git')
                    {
                        if (fs.pathExistsSync(path.join(pth, file))) fs.unlinkSync(path.join(pth, file));
                    }
                    else
                    {
                        if (fs.pathExistsSync(path.join(pth, file))) rimraf.sync(path.join(pth, file));
                    }
                })
            })
    }

    public async downloadLibs(modpack_name: string, force_download=false) {
        let version = this.modpacks[modpack_name].libs_version;
        let folder = await this.ensureLibsDir(version);
        await this.clearLibsDir(version);
        if (await fs.pathExists(path.join(folder, 'libs.zip')) && !force_download) {
            log.info('[MODPACK] <libs> looks like archive is already downloaded... skipping download.');
        } else {
            BrowserWindow.getAllWindows()[0]?.webContents.send('download-started', 'libs');
            this._libs[version].link = await this.getLatestLinkToLibs();
            let downloaded_path = await this.downloader.download(
                folder, 
                this.libs[version].link,
                'libs.zip',
                8,
                (progress: any) => {
                    if (this.downloader.paused) return;
                    log.info(progress.percent.toPrecision(2), progress.status);
                    BrowserWindow.getAllWindows()[0]?.webContents.send('download-progress', progress);
                }
            )
            if (downloaded_path == false) {
                log.info('[MODPACK] <libs> download cancelled');
                return;
            }
        }

        BrowserWindow.getAllWindows()[0]?.webContents.send('download-finished');
        await this.processLibs(folder, modpack_name);
    }

    public async processLibs(folder: string, modpack_name: string) {
        log.info('[MODPACK] <libs> unzipping...');
        try {
            await extract(path.join(folder, 'libs.zip'), { dir: folder })
            BrowserWindow.getAllWindows()[0]?.webContents.send('unzipping-finished');
            log.info('[MODPACK] <libs> success');

            if (await fs.pathExists(path.join(folder, 'libs.zip'))) await fs.unlink(path.join(folder, 'libs.zip'))
            BrowserWindow.getAllWindows()[0]?.webContents.send('libs-downloaded');
          } catch (err) {
            log.error('[MODPACK] <libs> Error occured while unpacking libraries...');
            return false;
          }
    }

    public async downloadModpack(modpack_name: string, force_download=false) {

        if (await this.libsIntalled('1.12')) {
            log.info('[MODPACK] libs are installed')
        } else {
            log.info('[MODPACK] libs are not installed')
            await this.downloadLibs(modpack_name);
            log.info('[MODPACK] libs installed');
        }

        let folder = await this.ensureModpackDir(modpack_name);
        await this.clearModpackDir(modpack_name);
        if (await fs.pathExists(path.join(folder, 'modpack.zip')) && !force_download) {
            log.info(`[MODPACK] <${modpack_name}> looks like archive is already downloaded... skipping download.`);
        } else {
            this._modpacks[modpack_name].link = await this.getLatestLinkToModpack(modpack_name);
            BrowserWindow.getAllWindows()[0]?.webContents.send('download-started', modpack_name);
            let downloaded_path = await this.downloader.download(
                folder, 
                this.modpacks[modpack_name].link,
                'modpack.zip',
                8,
                (progress: any) => {
                    if (this.downloader.paused) return;
                    log.info(progress.percent.toPrecision(2), progress.status);
                    BrowserWindow.getAllWindows()[0]?.webContents.send('download-progress', progress);
                }
            )
            if (downloaded_path == false) {
                log.info(`[MODPACK] <${modpack_name}> download cancelled`);
                return;
            }
        }

        BrowserWindow.getAllWindows()[0]?.webContents.send('download-finished', modpack_name);
        await this.unzipModpack(folder, modpack_name);
        BrowserWindow.getAllWindows()[0]?.webContents.send('unzipping-finished');
        if (await fs.pathExists(path.join(folder, 'modpack.zip'))) await fs.unlink(path.join(folder, 'modpack.zip'));

        BrowserWindow.getAllWindows()[0]?.webContents.send('moving-libs-start');
        await this.moveLibs(modpack_name);
        BrowserWindow.getAllWindows()[0]?.webContents.send('modpack-downloaded', modpack_name);
    }

    public async unzipModpack(folder: string, modpack_name: string) {
        log.info(`[MODPACK] <${modpack_name}> unzipping...`);
        try {
            await extract(path.join(folder, 'modpack.zip'), { dir: folder })
            log.info('[MODPACK] success');
          } catch (err) {
            log.error('Error occured while unpacking modpack...');
            return false;
          }
    }

    public async moveLibs(modpack_name: string) {
        let libs_version = this.modpacks[modpack_name].libs_version;
        let modpack_path = this.modpacks[modpack_name].path;
        log.info(`[MODPACK] <${modpack_name}> moving libs...`);

        log.info('[MODPACK] Moving: libraries...');
        if (!(await fs.pathExists(modpack_path + '\\libraries'))) {
            await fs.ensureDir(modpack_path + '\\libraries');
            await copyWithProgress(path.join(modpackManager.libs[libs_version].path, 'libraries'), path.join(modpack_path, 'libraries'), 
                (progress: any) => {
                    BrowserWindow.getAllWindows()[0]?.webContents.send('moving-libs-progress', {
                        percent: progress.progress * 30
                    });
                },
                250,
            );   
        }
        BrowserWindow.getAllWindows()[0]?.webContents.send('moving-libs-progress', {
            percent: 30
        });

        log.info('[MODPACK] Moving: assets...');
        if (!(await fs.pathExists(modpack_path + '\\assets'))) {
            await fs.ensureDir(modpack_path + '\\assets');
            await copyWithProgress(path.join(modpackManager.libs[libs_version].path, 'assets'), path.join(modpack_path, 'assets'), 
                (progress: any) => {
                    BrowserWindow.getAllWindows()[0]?.webContents.send('moving-libs-progress', {
                        percent: 30 + (progress.progress * 35)
                    });
                },
                250,
            );   
        }

        BrowserWindow.getAllWindows()[0]?.webContents.send('moving-libs-progress', {
            percent: 65
        });

        log.info('[MODPACK] Moving: versions...');
        if (!(await fs.pathExists(modpack_path + '\\versions'))) {
            await fs.ensureDir(modpack_path + '\\versions');
            await copyWithProgress(path.join(modpackManager.libs[libs_version].path, 'versions'), path.join(modpack_path, 'versions'), 
                (progress: any) => {
                    BrowserWindow.getAllWindows()[0]?.webContents.send('moving-libs-progress', {
                        percent: 65 + (progress.progress * 35)
                    });
                },
                250,
            );   
        }

        BrowserWindow.getAllWindows()[0]?.webContents.send('moving-libs-progress', {
            percent: 100
        });
        return;
    }

    os_version = os.release().split(".")[0];
    launched_modpacks: {
        [key: string]: {process: ChildProcess},
    } = {};
    public async launchModpack(modpack_name: string, min_rem: number, max_rem: number, username: string, uuid: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            if (Object.keys(this.launched_modpacks).includes(modpack_name) && modpackManager.launched_modpacks[modpack_name] != undefined) {
                reject('already launched');
                return;
            }
    
            log.info(`[MODPACK] <${modpack_name}> launching...`);
    
            let game_dir = await this.ensureModpackDir(modpack_name);
            let args = `-Djava.net.preferIPv4Stack=true -Dos.name="Windows ${this.os_version}" -Dos.version=${
                os.release().split(".")[0] + "." + os.release().split(".")[1]
            } -Xmn${min_rem * 1024}M -Xmx${max_rem * 1024}M -Djava.library.path=${game_dir}\\versions\\Forge-1.12.2\\natives -cp ${game_dir}\\libraries\\net\\minecraftforge\\forge\\1.12.2-14.23.5.2855\\forge-1.12.2-14.23.5.2855.jar;${game_dir}\\libraries\\org\\ow2\\asm\\asm-debug-all\\5.2\\asm-debug-all-5.2.jar;${game_dir}\\libraries\\net\\minecraft\\launchwrapper\\1.12\\launchwrapper-1.12.jar;${game_dir}\\libraries\\org\\jline\\jline\\3.5.1\\jline-3.5.1.jar;${game_dir}\\libraries\\com\\typesafe\\akka\\akka-actor_2.11\\2.3.3\\akka-actor_2.11-2.3.3.jar;${game_dir}\\libraries\\com\\typesafe\\config\\1.2.1\\config-1.2.1.jar;${game_dir}\\libraries\\org\\scala-lang\\scala-actors-migration_2.11\\1.1.0\\scala-actors-migration_2.11-1.1.0.jar;${game_dir}\\libraries\\org\\scala-lang\\scala-compiler\\2.11.1\\scala-compiler-2.11.1.jar;${game_dir}\\libraries\\org\\scala-lang\\plugins\\scala-continuations-library_2.11\\1.0.2_mc\\scala-continuations-library_2.11-1.0.2_mc.jar;${game_dir}\\libraries\\org\\scala-lang\\plugins\\scala-continuations-plugin_2.11.1\\1.0.2_mc\\scala-continuations-plugin_2.11.1-1.0.2_mc.jar;${game_dir}\\libraries\\org\\scala-lang\\scala-library\\2.11.1\\scala-library-2.11.1.jar;${game_dir}\\libraries\\org\\scala-lang\\scala-parser-combinators_2.11\\1.0.1\\scala-parser-combinators_2.11-1.0.1.jar;${game_dir}\\libraries\\org\\scala-lang\\scala-reflect\\2.11.1\\scala-reflect-2.11.1.jar;${game_dir}\\libraries\\org\\scala-lang\\scala-swing_2.11\\1.0.1\\scala-swing_2.11-1.0.1.jar;${game_dir}\\libraries\\org\\scala-lang\\scala-xml_2.11\\1.0.2\\scala-xml_2.11-1.0.2.jar;${game_dir}\\libraries\\lzma\\lzma\\0.0.1\\lzma-0.0.1.jar;${game_dir}\\libraries\\java3d\\vecmath\\1.5.2\\vecmath-1.5.2.jar;${game_dir}\\libraries\\net\\sf\\trove4j\\trove4j\\3.0.3\\trove4j-3.0.3.jar;${game_dir}\\libraries\\org\\apache\\maven\\maven-artifact\\3.5.3\\maven-artifact-3.5.3.jar;${game_dir}\\libraries\\net\\sf\\jopt-simple\\jopt-simple\\5.0.3\\jopt-simple-5.0.3.jar;${game_dir}\\libraries\\org\\tlauncher\\patchy\\1.2.3\\patchy-1.2.3.jar;${game_dir}\\libraries\\oshi-project\\oshi-core\\1.1\\oshi-core-1.1.jar;${game_dir}\\libraries\\net\\java\\dev\\jna\\jna\\4.4.0\\jna-4.4.0.jar;${game_dir}\\libraries\\net\\java\\dev\\jna\\platform\\3.4.0\\platform-3.4.0.jar;${game_dir}\\libraries\\com\\ibm\\icu\\icu4j-core-mojang\\51.2\\icu4j-core-mojang-51.2.jar;${game_dir}\\libraries\\net\\sf\\jopt-simple\\jopt-simple\\5.0.3\\jopt-simple-5.0.3.jar;${game_dir}\\libraries\\com\\paulscode\\codecjorbis\\20101023\\codecjorbis-20101023.jar;${game_dir}\\libraries\\com\\paulscode\\codecwav\\20101023\\codecwav-20101023.jar;${game_dir}\\libraries\\com\\paulscode\\libraryjavasound\\20101123\\libraryjavasound-20101123.jar;${game_dir}\\libraries\\com\\paulscode\\librarylwjglopenal\\20100824\\librarylwjglopenal-20100824.jar;${game_dir}\\libraries\\com\\paulscode\\soundsystem\\20120107\\soundsystem-20120107.jar;${game_dir}\\libraries\\io\\netty\\netty-all\\4.1.9.Final\\netty-all-4.1.9.Final.jar;${game_dir}\\libraries\\com\\google\\guava\\guava\\21.0\\guava-21.0.jar;${game_dir}\\libraries\\org\\apache\\commons\\commons-lang3\\3.5\\commons-lang3-3.5.jar;${game_dir}\\libraries\\commons-io\\commons-io\\2.5\\commons-io-2.5.jar;${game_dir}\\libraries\\commons-codec\\commons-codec\\1.10\\commons-codec-1.10.jar;${game_dir}\\libraries\\net\\java\\jinput\\jinput\\2.0.5\\jinput-2.0.5.jar;${game_dir}\\libraries\\net\\java\\jutils\\jutils\\1.0.0\\jutils-1.0.0.jar;${game_dir}\\libraries\\com\\google\\code\\gson\\gson\\2.8.0\\gson-2.8.0.jar;${game_dir}\\libraries\\com\\mojang\\authlib\\1.5.25\\authlib-1.5.25.jar;${game_dir}\\libraries\\com\\mojang\\realms\\1.10.22\\realms-1.10.22.jar;${game_dir}\\libraries\\org\\apache\\commons\\commons-compress\\1.8.1\\commons-compress-1.8.1.jar;${game_dir}\\libraries\\org\\apache\\httpcomponents\\httpclient\\4.3.3\\httpclient-4.3.3.jar;${game_dir}\\libraries\\commons-logging\\commons-logging\\1.1.3\\commons-logging-1.1.3.jar;${game_dir}\\libraries\\org\\apache\\httpcomponents\\httpcore\\4.3.2\\httpcore-4.3.2.jar;${game_dir}\\libraries\\it\\unimi\\dsi\\fastutil\\7.1.0\\fastutil-7.1.0.jar;${game_dir}\\libraries\\org\\apache\\logging\\log4j\\log4j-api\\2.8.1\\log4j-api-2.8.1.jar;${game_dir}\\libraries\\org\\apache\\logging\\log4j\\log4j-core\\2.8.1\\log4j-core-2.8.1.jar;${game_dir}\\libraries\\org\\lwjgl\\lwjgl\\lwjgl\\2.9.4-nightly-20150209\\lwjgl-2.9.4-nightly-20150209.jar;${game_dir}\\libraries\\org\\lwjgl\\lwjgl\\lwjgl_util\\2.9.4-nightly-20150209\\lwjgl_util-2.9.4-nightly-20150209.jar;${game_dir}\\libraries\\com\\mojang\\text2speech\\1.10.3\\text2speech-1.10.3.jar;${game_dir}\\versions\\Forge-1.12.2\\Forge-1.12.2.jar -Dminecraft.applet.TargetDirectory="${game_dir}" -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M -Dfml.ignoreInvalidMinecraftCertificates=true -Dfml.ignorePatchDiscrepancies=true net.minecraft.launchwrapper.Launch --username ${username} --version Forge-1.12.2 --gameDir ${game_dir} --assetsDir ${game_dir}\\assets --assetIndex 1.12 --uuid ${uuid} --accessToken null --userType mojang --tweakClass net.minecraftforge.fml.common.launcher.FMLTweaker --versionType Forge --width 925 --height 530`;
    
            args = this.integrate_java_parameters(args);
            let cd_path = game_dir;
            let java_path = await this.get_latest_java_version_path(modpack_name);
            let final_command = `${game_dir[0]}:&&cd "${cd_path}"&&"${java_path}" ${args}`;
    
            log.info(`[MODPACK] <${modpack_name}> final command: ${final_command}`);
    
            let process = spawn(final_command, [], {windowsHide: true, shell: true})
    
            let window_opened = false;
            process.on('exit', (code, signal) => {
                log.info(`[MODPACK] <${modpack_name}> exit`, code, signal);
                delete this.launched_modpacks[modpack_name]
                BrowserWindow.getAllWindows()[0]?.webContents.send('modpack-exit', {modpack_name, code, signal});
                resolve('exited');
                return;
            })
    
            process.on('error', error => {
                log.error(`[MODPACK] <${modpack_name}> error`, error);
                delete this.launched_modpacks[modpack_name]
                BrowserWindow.getAllWindows()[0]?.webContents.send('modpack-error', {modpack_name, error});
                resolve('error');
                return;
            })

            if (this._settingsStorage.settings.modpack_settings.show_console_output)
                process.stdout.on('data', (data) => {
                    BrowserWindow.getAllWindows()[0]?.webContents.send('modpack-data', {modpack_name, data: data.toString()});
                })
    
            process.stdout.on('data', (data) => {
                if (!window_opened) {
                    if (data.toString().split("Starts to replace vanilla recipe ingredients with ore ingredients.").length > 1) {
                        window_opened = true;
                        BrowserWindow.getAllWindows()[0]?.webContents.send('modpack-launched', modpack_name);
                        resolve('launched');
                    }
                }
            })
    
            this.launched_modpacks = {
                ...this.launched_modpacks,
                [modpack_name]: {
                    process: process,
                }
            }
        })
    }

    private async get_latest_java_version_path(modpack_name: string): Promise<string> {
        let installed_java = await this.get_installed_java_path();
        if (installed_java == "No java found" || this._settingsStorage.settings.modpack_settings.use_builtin_java) {
            if (os.arch() == "x64") {
                const path_to_java = path.join(app.getAppPath().split("app.asar")[0], "\\src\\res\\java\\runtime-windows-x64\\bin\\javaw.exe");
                log.info(`[MODPACK] <${modpack_name}> Using builtin x64-java: ${path_to_java}`);
                return path_to_java;
            } else {
                const path_to_java = path.join(app.getAppPath().split("app.asar")[0], "\\src\\res\\java\\runtime\\bin\\javaw.exe");
                log.info(`[MODPACK] <${modpack_name}> Using builtin x86-java: ${path_to_java}`);
                return path_to_java;
            }
        } 

        log.info(`[LAUNCH] Using installed java: ${installed_java}`);
        return installed_java;
    }

    private async get_installed_java_path(): Promise<string> {
        if ((await fs.readdir("C:\\Program Files")).includes("Java")) {
            for (const version of await fs.readdir("C:\\Program Files\\Java")) {
                if (await fs.pathExists(`C:\\Program Files\\Java\\${version}\\bin\\javaw.exe`)) {
                    return `C:\\Program Files\\Java\\${version}\\bin\\javaw.exe`;
                }
            }

            return "No java found";
        } else if ((await fs.readdir("C:\\Program Files (x86)")).includes("Java")) {
            for (const version of await fs.readdir("C:\\Program Files (x86)\\Java")) {
                if (await fs.pathExists(`C:\\Program Files (x86)\\Java\\${version}\\bin\\javaw.exe`)) {
                    return `C:\\Program Files (x86)\\Java\\${version}\\bin\\javaw.exe`;
                }
            }

            return "No java found";
        } else {
            return "No java found";
        }
    }

    private integrate_java_parameters(command: string): string {
        let settings = this._settingsStorage.settings
        let pars = settings.modpack_settings.java_parameters;
        if (pars == '') return command;
        let pars_arr = pars.split(" ");
    
        for (let parameter of pars_arr) {
            if (parameter.charAt(0) != "-") continue;
    
            if (parameter.includes("-Xmx")) {
                let par_prototype = `-Xmx${settings.modpack_settings.alocated_memory * 1024}M`;
                command = command.replace(par_prototype, parameter);
                continue;
            } else if (parameter.includes("-Xms")) {
                let par_prototype = `-Xms1000M`;
                command = command.replace(par_prototype, parameter);
                continue;
            } else if (parameter.includes("-username")) {
                continue;
            } else if (parameter.includes("-uuid")) {
                continue;
            } else {
                command += " " + parameter;
            }
        }
    
        return command;
    }
    
}