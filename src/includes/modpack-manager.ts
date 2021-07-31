import type { IpcMainEvent } from 'electron/main';
import type { remote as rmt, ipcRenderer as ipc } from 'electron'
import type { SettingsStorage } from '../includes/settings-manager';
import * as fs from 'fs-extra';
import * as path from 'path'

import logger from 'electron-log';
const log = logger.create('modpack');

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

export class ModpackManager {
    private _graphics_level = GRAPHICS_LEVELS.DEFAULT;
    private _root = '';
    private _modpacks: any;
    private _libs: any;
    private _resources: any;
    private _settingsStorage: SettingsStorage;

    public constructor (remote: typeof rmt, root: string, settingsStorage: SettingsStorage) {
        log.info('[MODPACKS] init');
        
        this._settingsStorage = settingsStorage;
        this._root = root;

        this.updateDirs();
        fs.ensureDirSync(this._resources.path);
        this.ensureRoot();
        this.ensureModpackDirs();
    }

    public updateDirs() {
        this._modpacks = {
            magicae: {
                link: '',
                path: path.normalize(path.join(this._settingsStorage.settings.modpacks.magicae.path.replace(/%ROOT%/g, this._root), 'magicae')),
                version: 1.0,
                installed: false,
            },
            fabrica: {
                link: '',
                path: path.normalize(path.join(this._settingsStorage.settings.modpacks.fabrica.path.replace(/%ROOT%/g, this._root), 'fabrica')),
                version: 1.0,
                installed: false,
            },
            statera: {
                link: '',
                path: path.normalize(path.join(this._settingsStorage.settings.modpacks.statera.path.replace(/%ROOT%/g, this._root), 'statera')),
                version: 1.0,
                installed: false,
            },
            insula: {
                link: '',
                path: path.normalize(path.join(this._settingsStorage.settings.modpacks.insula.path.replace(/%ROOT%/g, this._root), 'insula')),
                version: 1.0,
                installed: false,
            },
        };

        this._libs = {
            path: path.normalize(path.join(this._settingsStorage.settings.modpacks.libs.path.replace(/%ROOT%/g, this._root))),
            '1.12': {
                link: '',
                path: path.normalize(path.join(this._settingsStorage.settings.modpacks.libs.path.replace(/%ROOT%/g, this._root), '1.12')),
                version: 1.0,
                installed: false,
            },
        }

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
    public set modpacks(_) {}

    public get libs() { return this._libs; }
    public set libs(_) {}

    public async modpackInstalled(modpack: string) {
        return fs.readdirSync(this.modpacks[modpack].path).length === 1;
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
            this._modpacks[modpack_key].installed = await this.modpackInstalled(modpack_key);
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
}