import type { IpcMainEvent } from 'electron/main';
import { remote as rmt, ipcRenderer as ipc, BrowserWindow, ipcMain } from 'electron'
import type { SettingsStorage } from '../includes/settings-manager';
import { copyWithProgress } from '../includes/copy-with-progress';
import request from 'request';
import nodeFetch from 'node-fetch';
import extract from 'extract-zip';
import rimraf from 'rimraf';
import * as fs from 'fs-extra';
import * as path from 'path'

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
}