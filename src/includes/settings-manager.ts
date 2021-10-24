import { remote as rmt, ipcRenderer as ipc, remote } from 'electron'
import Events from 'events';
import * as fs from 'fs-extra';
import * as path from 'path'

import logger from 'electron-log';
const log = logger.create('settings');
log.variables.label = 'settings';
log.transports.console.format = '{h}:{i}:{s} > [{label}] {text}';
log.transports.file.format = '{h}:{i}:{s} > [{label}] {text}';

const settings_pattern = {
    dev_mode: false,
    on_page: 0,
    on_modpack: "magicae",
    selected_user: -1,
    auto_go_to_server_thing: false,
    version: "",
    modpack_settings: {
        allocated_memory: 4,
        optimization_level: 2,
        java_parameters: "",
        use_builtin_java: true,
        show_console_output: false,
        controls: {
            crouch: { minecraft_key: "key_key.sneak", minecraft_code: 42, key_code: 12, key_name: "SHIFT" },
            run: { minecraft_key: "key_key.sprint", minecraft_code: 29, key_code: 12, key_name: "CONTROL" },
            forward: { minecraft_key: "key_key.forward", minecraft_code: 17, key_code: 87, key_name: "W" },
            back: { minecraft_key: "key_key.back", minecraft_code: 31, key_code: 83, key_name: "S" },
            left: { minecraft_key: "key_key.left", minecraft_code: 30, key_code: 12, key_name: "A" },
            right: { minecraft_key: "key_key.right", minecraft_code: 32, key_code: 12, key_name: "D" },
            zoom: { minecraft_key: "key_of.key.zoom", minecraft_code: 0, key_code: 0, key_name: "NONE" },
            quests: { minecraft_key: "key_key.ftbquests.quests", minecraft_code: 20, key_code: 12, key_name: "T" },
            excavate: { minecraft_key: "key_oreexcavation.key.excavate", minecraft_code: 34, key_code: 12, key_name: "G" },
            shop: { minecraft_key: "key_key.ftbmoney.shop", minecraft_code: 35, key_code: 12, key_name: "H" },
        },
    },
    appearance: {
        reduced_motion: false,
        bg: "",
        theme: "",
        filter_opacity: 60,
        blur_amount: 0,
        muted: true,
    },
    modpacks: {
        libs: {
            path: "%ROOT%/libs",
        },
        magicae: {
            path: "%ROOT%/modpacks",
        },
        fabrica: {
            path: "%ROOT%/modpacks",
        },
        statera: {
            path: "%ROOT%/modpacks",
        },
        insula: {
            path: "%ROOT%/modpacks",
        },
    },
};

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

    public first_launch = false;
    public after_update = false;

    public constructor (remote: typeof rmt, root: string) {
        log.info('init');

        this._root = root;

        //. Get settings
        
        this._settings_path = path.join(this._root, 'settings.json');
        fs.ensureFileSync(this._settings_path);

        let settings = this._settings;
        try {
            let raw = fs.readFileSync(this._settings_path).toString();
            if (raw) settings = JSON.parse(raw);
                
        } catch (err) {
            log.info('error occured while trying to read settings');
            console.error('', err);
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
                log.info(`loading '${theme_name}'`);
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
                        log.info(`error while parsing '${theme_name}'`);
                        log.info(`this theme looks sus my friend... why would it contain any scripts?`);
                        continue;
                    } else {
                        this._themes = {
                            ...this._themes,
                            [theme_name.split('.theme.css')[0].toLowerCase()]: args
                        };
                    }
                } catch (err) {
                    log.info(`error while parsing '${theme_name}'`);
                    log.info(`make sure your theme fits the pattern:\n\t@name: ''\n\t@author: ''\n\t@version: ''\n\t@description: ''\n\t@default-bg: ''\n`);
                    
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
        log.info('saving...');
        await fs.writeFile(this._settings_path, JSON.stringify(this._settings, null, '\t'));
        log.info('saved!');
    }

    public saveSync() {
        log.info('saving...');
        fs.writeFileSync(this._settings_path, JSON.stringify(this._settings, null, '\t'));
        log.info('saved!');
    }
}

export class SettingsInterface {
    private _root = '';
    private _settings_path = '';
    private _settings = settings_pattern;

    private _themes_path = '';
    private _themes: any = {};

    private _events = new Events.EventEmitter();

    public first_launch: boolean;
    public after_update: boolean;

    public constructor (remote: typeof rmt, ipcRenderer: typeof ipc) {
        log.info('manager init');
        let storage = remote.getGlobal('settingsStorage');
        this._root = storage._root;
        this._settings_path = storage._settings_path;
        this._settings = storage._settings;
        this._themes_path = storage._themes_path;
        this._themes = storage._themes;
        this.first_launch = storage.first_launch;
        this.after_update = storage.after_update;
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

    public set filter_opacity(to: number) {
        this.settings.appearance.filter_opacity = to;
        //@ts-expect-error
        document.getElementById('bg-opacity').style.opacity = to / 100;
    }

    public get filter_opacity() {
        return this.settings.appearance.filter_opacity;
    }

    public set blur_amount(to: number) {
        this.settings.appearance.blur_amount = to;
        //@ts-expect-error
        document.getElementById('bg-blur').style = `--amount: ${to}px`;
    }

    public get blur_amount() {
        return this.settings.appearance.blur_amount;
    }

    public set bg(to: string) {
        if (to === '1') { // plain BG
            log.info('applying plain bg');
            let bg_el = document.getElementById('bg-img');
            if (bg_el) {
                (document.getElementById('bg-video') as HTMLVideoElement).src = '';
                document.body.classList.remove('video');
                bg_el.parentElement?.parentElement?.classList.add('plain');
            }
        } else if (to != undefined && to != '') {
            let ext = path.extname(to);   
            if (ext == '.png' || ext == '.jpeg' || ext == '.jpg' || ext == '.gif') {
                log.info('applying image bg', to);
                let bg_el = document.getElementById('bg-img') as HTMLImageElement;
                if (bg_el) {
                    (document.getElementById('bg-video') as HTMLVideoElement).src = '';
                    document.body.classList.remove('video');
                    bg_el.parentElement?.parentElement?.classList.remove('plain');
                    if (fs.existsSync(to)) {
                        bg_el.src = to;
                    } else {
                        log.info('path not found');
                        return;
                    }
                }
            } else if (ext == '.mp4' || ext == '.mov' || ext == '.ogg') {
                log.info('applying video bg', to);
                let bg_el = document.getElementById('bg-video') as HTMLVideoElement;
                if (bg_el) {
                    document.body.classList.add('video');
                    bg_el.parentElement?.parentElement?.classList.remove('plain');
                    if (fs.existsSync(to)) {
                        bg_el.src = to;
                    } else {
                        log.info('path not found');
                        return;
                    }
                }
            }
            
            this._settings.appearance.bg = to;
        } else if (to == '') {
            log.info(`setting default bg for '${this._settings.appearance.theme}'`);
            let bg_el = document.getElementById('bg-img') as HTMLImageElement;
            if (bg_el) {
                (document.getElementById('bg-video') as HTMLVideoElement).src = '';
                document.body.classList.remove('video');
                bg_el.parentElement?.parentElement?.classList.remove('plain');
                let dflt = '../../res/bg-light.jpg';
                if (this._settings.appearance.theme) {
                    dflt = this._themes[this._settings.appearance.theme].default_bg;
                    if (dflt == '') {
                        dflt = '../../res/bg-light.jpg';
                    }
                }

                bg_el.src = dflt;
                this._settings.appearance.bg = to;
            }
        }

        this._events.emit('bg-loaded');
    }

    public async setBgAsync(to: any) {
        return new Promise((resolve, reject) => {
            if (to === '1') { // plain BG
                log.info('applying plain bg');
                let bg_el = document.getElementById('bg-img');
                if (bg_el) {
                    (document.getElementById('bg-video') as HTMLVideoElement).src = '';
                    document.body.classList.remove('video');
                    bg_el.parentElement?.parentElement?.classList.add('plain');
                }
            } else if (to != undefined && to != '') {
                let ext = path.extname(to);   
                if (ext == '.png' || ext == '.jpeg' || ext == '.jpg' || ext == '.gif') {
                    log.info('applying image bg', to);
                    let bg_el = document.getElementById('bg-img') as HTMLImageElement;
                    if (bg_el) {
                        (document.getElementById('bg-video') as HTMLVideoElement).src = '';
                        document.body.classList.remove('video');
                        bg_el.parentElement?.parentElement?.classList.remove('plain');
                        if (fs.existsSync(to)) {
                            bg_el.src = to;
                        } else {
                            log.info('path not found');
                            return;
                        }
                    }
                } else if (ext == '.mp4' || ext == '.mov' || ext == '.ogg') {
                    log.info('applying video bg', to);
                    let bg_el = document.getElementById('bg-video') as HTMLVideoElement;
                    if (bg_el) {
                        document.body.classList.add('video');
                        bg_el.parentElement?.parentElement?.classList.remove('plain');
                        if (fs.existsSync(to)) {
                            bg_el.src = to;
                        } else {
                            log.info('path not found');
                            return;
                        }
                    }
                }
                
                this._settings.appearance.bg = to;
            } else if (to == '') {
                log.info(`setting default bg for '${this._settings.appearance.theme}'`);
                let bg_el = document.getElementById('bg-img') as HTMLImageElement;
                if (bg_el) {
                    (document.getElementById('bg-video') as HTMLVideoElement).src = '';
                    document.body.classList.remove('video');
                    bg_el.parentElement?.parentElement?.classList.remove('plain');
                    let dflt = '../../res/bg-light.jpg';
                    if (this._settings.appearance.theme) {
                        dflt = this._themes[this._settings.appearance.theme].default_bg;
                        if (dflt == '') {
                            dflt = '../../res/bg-light.jpg';
                        }
                    }
    
                    bg_el.src = dflt;
                    this._settings.appearance.bg = to;
                }
            }
    
            this._events.emit('bg-loaded');
            resolve(true);
        });
    }

    public get themes_path() {
        return this._themes_path;
    }

    public set themes_path(_: any) {}

    public get themes() {
        return this._themes;
    }

    public get theme() {
        return this._settings.appearance.theme;
    }
    
    public set theme(to) {
        if (this._themes[to] != undefined) {
            log.info('applying theme', this._themes[to]);
            let theme_link = document.getElementById('theme');
            if (theme_link) {
                theme_link.setAttribute('href', this._themes[to].path)
            }
            
            this._settings.appearance.theme = to;
            this.bg = this.bg;
        } else if (to == '') {
            log.info('setting default theme');
            this._settings.appearance.theme = '';
            let theme_link = document.getElementById('theme');
            if (theme_link) {
                theme_link.setAttribute('href', '')
            }
            this.bg = this.bg;
        } else {
            log.info('theme not found. setting default theme');
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
                log.info('applying theme', this._themes[to]);
                let theme_link = document.getElementById('theme');
                if (theme_link) {
                    theme_link.setAttribute('href', this._themes[to].path)
                }
                
                this._settings.appearance.theme = to;
            } else if (to == '') {
                log.info('setting default theme');
            } else {
                log.info('theme not found');
                reject('no-theme');
                return;
            }
    
            this._events.emit('theme-loaded');
            resolve(true);
        });
    }
    //#endregion
}