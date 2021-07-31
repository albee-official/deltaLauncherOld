import { remote as rmt, ipcRenderer as ipc, remote } from 'electron'
import Events from 'events';
import * as fs from 'fs-extra';
import * as path from 'path'

import logger from 'electron-log';
const log = logger.create('settings');

export let listeners = {
    // 'test': (event: IpcMainEvent) => {
    //     event.reply('fuck off');
    // },
}

//# Lib

const settings_pattern = {
    dev_mode: true,
    on_page: 0,
    on_modpack: 'magicae',
    selected_user: -1,
    appearance: {
        bg: '',
        theme: '',
    },
    modpacks: {
        libs: {
            path: '%ROOT%/libs'
        },
        magicae: {
            path: '%ROOT%/modpacks',
        },
        fabrica: {
            path: '%ROOT%/modpacks',
        },
        statera: {
            path: '%ROOT%/modpacks',
        },
        insula: {
            path: '%ROOT%/modpacks',
        },
    },
}

interface theme {
    name: string,
    author: string,
    version: string,
    description: string,
    default_bg?: string,
    fileName: string,
}

export class SettingsStorage {
    private _root = '';
    private _settings_path = '';
    private _settings = settings_pattern;

    private _themes_path = '';
    private _themes: any = {};

    public constructor (remote: typeof rmt, root: string) {
        log.info('[SETTINGS] init');

        this._root = root;

        //. Get settings
        
        this._settings_path = path.join(this._root, 'settings.json');
        fs.ensureFileSync(this._settings_path);

        let settings = this._settings;
        try {
            let raw = fs.readFileSync(this._settings_path).toString();
            if (raw) settings = JSON.parse(raw);
                
        } catch (err) {
            log.info('[SETTINGS] error occured while trying to read settings');
            console.error('[SETTINGS]', err);
        }

        this._settings = Object.assign(this._settings, settings);
        this.saveSync();

        //. Get themes
        this.updateThemesList();
    }

    public updateThemesList() {
        this._themes_path = path.join(this._root, 'themes');
        this._themes = {};
        fs.ensureDirSync(this._themes_path);
        for (const theme_name of fs.readdirSync(this._themes_path)) {
            if (theme_name.endsWith('.theme.css')) {
                log.info(`[SETTINGS] loading '${theme_name}'`);
                let raw = fs.readFileSync(path.join(this._themes_path, theme_name)).toString();
                try {
                    let args = {
                        name: raw.split('@name:')[1].split('\n')[0].split('\'')[1],
                        author: raw.split('@author:')[1].split('\n')[0].split('\'')[1],
                        version: raw.split('@version:')[1].split('\n')[0].split('\'')[1],
                        description: raw.split('@description:')[1].split('\n')[0].split('\'')[1],
                        default_bg: raw.split('@default-bg:')[1].split('\n')[0].split('\'')[1],
                        path: path.join(this._themes_path, theme_name),
                    }

                    if (args.name.split('<script>').length > 1 ||
                        args.author.split('<script>').length > 1 ||
                        args.version.split('<script>').length > 1 ||
                        args.description.split('<script>').length > 1 ||
                        args.default_bg.split('<script>').length > 1 ||
                        args.path.split('<script>').length > 1
                    ) {
                        log.info(`[SETTINGS] error while parsing '${theme_name}'`);
                        log.info(`[SETTINGS] this theme looks sus my friend... why would it contain any scripts?`);
                        continue;
                    } else {
                        this._themes = {
                            ...this._themes,
                            [theme_name.split('.theme.css')[0].toLowerCase()]: args
                        };
                    }
                } catch (err) {
                    log.info(`[SETTINGS] error while parsing '${theme_name}'`);
                    log.info(`[SETTINGS] make sure your theme fits the pattern:\n\t@name: ''\n\t@author: ''\n\t@version: ''\n\t@description: ''\n\t@default-bg: ''\n`);
                    
                    console.warn(err);
                }
            }
        }
    }

    public get settings() {
        fs.ensureFileSync(this._settings_path);
        return this._settings;
    }

    public set settings(to) {
        this._settings = to;
    }

    public async save() {
        await fs.writeFile(this._settings_path, JSON.stringify(this._settings, null, '\t'));
    }

    public saveSync() {
        fs.writeFileSync(this._settings_path, JSON.stringify(this._settings, null, '\t'));
    }
}

export class SettingsInterface {
    private _root = '';
    private _settings_path = '';
    private _settings = settings_pattern;

    private _themes_path = '';
    private _themes: any = {};

    private _events = new Events.EventEmitter();

    public constructor (remote: typeof rmt, ipcRenderer: typeof ipc) {
        log.info('[SETTINGS] manager init');
        let storage = remote.getGlobal('settingsStorage');
        this._root = storage._root;
        this._settings_path = storage._settings_path;
        this._settings = storage._settings;
        this._themes_path = storage._themes_path;
        this._themes = storage._themes;
    }

    public get events () { return this._events; }
    public set events(_) {}

    public get root() {
        fs.ensureDirSync(this._root)
        return path.normalize(this._root);
    }

    public set root(_) {}

    public get settings() {
        fs.ensureFileSync(this._settings_path);
        return this._settings;
    }

    public set settings(to) {
        this._settings = to;
    }

    public async updateThemesList() {
        await remote.getGlobal('settingsStorage').updateThemesList();
        this._themes = remote.getGlobal('settingsStorage')._themes;
    }

    public async save() {
        await remote.getGlobal('settingsStorage').save();
    }

    public saveSync() {
        remote.getGlobal('settingsStorage').saveSync();
    }
    
    //#region Appearance

    public get bg() {
        if (this._settings.appearance.bg == '') {
            return this._settings.appearance.bg;
        } else {
            return path.normalize(this._settings.appearance.bg);
        }
        
    }

    public set bg(to: any) {
        if (to === 1) { // plain BG
            log.info('[SETTINGS] applying plain bg');
            let bg_el = document.getElementById('bg-img');
            if (bg_el) {
                bg_el.parentElement?.parentElement?.classList.add('plain');
            }
        } else if (to != undefined && to != '') {
            log.info('[SETTINGS] applying bg', to);
            let bg_el = document.getElementById('bg-img');
            if (bg_el) {
                bg_el.parentElement?.parentElement?.classList.remove('plain');
                if (fs.existsSync(to)) {
                    bg_el.setAttribute('src', to);
                } else {
                    log.info('[SETTINGS] path not found');
                    return;
                }
            }
            
            this._settings.appearance.bg = to;
        } else if (to == '') {
            log.info(`[SETTINGS] setting default bg for '${this._settings.appearance.theme}'`);
            let bg_el = document.getElementById('bg-img');
            if (bg_el) {
                bg_el.parentElement?.parentElement?.classList.remove('plain');
                let dflt = '../../res/bg-light.jpg';
                if (this._settings.appearance.theme) {
                    dflt = this._themes[this._settings.appearance.theme].default_bg;
                    if (dflt == '') {
                        dflt = '../../res/bg-light.jpg';
                    }
                }

                bg_el.setAttribute('src', dflt);
                this._settings.appearance.bg = to;
            }
        }

        this._events.emit('bg-loaded');
    }

    public async setBgAsync(to: any) {
        return new Promise((resolve, reject) => {
            if (to === 1) { // plain BG
                log.info('[SETTINGS] applying plain bg');
                let bg_el = document.getElementById('bg-img');
                if (bg_el) {
                    bg_el.parentElement?.parentElement?.classList.add('plain');
                }
            } else if (to != undefined && to != '') {
                log.info('[SETTINGS] applying bg', to);
                let bg_el = document.getElementById('bg-img');
                if (bg_el) {
                    bg_el.parentElement?.parentElement?.classList.remove('plain');
                    if (fs.existsSync(to)) {
                        bg_el.setAttribute('src', to);
                    } else {
                        log.info('[SETTINGS] path not found');
                        reject('no-path');
                        return;
                    }
                }
                
                this._settings.appearance.bg = to;
            } else if (to == '') {
                log.info(`[SETTINGS] setting default bg for '${this._settings.appearance.theme}'`);
                let bg_el = document.getElementById('bg-img');
                if (bg_el) {
                    bg_el.parentElement?.parentElement?.classList.remove('plain');
                    let dflt = '../../res/bg-light.jpg';
                    if (this._settings.appearance.theme) {
                        dflt = this._themes[this._settings.appearance.theme].default_bg;
                        if (dflt == '') {
                            dflt = '../../res/bg-light.jpg';
                        }
                    }
    
                    bg_el.setAttribute('src', dflt);
                }
            }
    
            this._events.emit('bg-loaded');
            resolve(true);
        });
    }

    public get themes() {
        return this._themes;
    }

    public get theme() {
        return this._settings.appearance.theme;
    }
    
    public set theme(to) {
        if (this._themes[to] != undefined) {
            log.info('[SETTINGS] applying theme', this._themes[to]);
            let theme_link = document.getElementById('theme');
            if (theme_link) {
                theme_link.setAttribute('href', this._themes[to].path)
            }
            
            this._settings.appearance.theme = to;
            this.bg = this.bg;
        } else if (to == '') {
            log.info('[SETTINGS] setting default theme');
            this._settings.appearance.theme = '';
            let theme_link = document.getElementById('theme');
            if (theme_link) {
                theme_link.setAttribute('href', '')
            }
            this.bg = this.bg;
        } else {
            log.info('[SETTINGS] theme not found. setting default theme');
            this._settings.appearance.theme = '';
            let theme_link = document.getElementById('theme');
            if (theme_link) {
                theme_link.setAttribute('href', '')
            }
            this.bg = this.bg;
            return;
        }

        this._events.emit('theme-loaded');
    }

    public async setThemeAsync(to: string) {
        return new Promise((resolve, reject) => {
            if (this._themes[to] != undefined) {
                log.info('[SETTINGS] applying theme', this._themes[to]);
                let theme_link = document.getElementById('theme');
                if (theme_link) {
                    theme_link.setAttribute('href', this._themes[to].path)
                }
                
                this._settings.appearance.theme = to;
            } else if (to == '') {
                log.info('[SETTINGS] setting default theme');
            } else {
                log.info('[SETTINGS] theme not found');
                reject('no-theme');
                return;
            }
    
            this._events.emit('theme-loaded');
            resolve(true);
        });
    }
    //#endregion
}