import { remote as rmt, ipcRenderer as ipc } from 'electron'
import * as fs from 'fs-extra';
import * as path from 'path'

export let listeners = {
    // 'test': (event: IpcMainEvent) => {
    //     event.reply('fuck off');
    // },
}

//# Lib

interface theme {
    name: string,
    author: string,
    version: string,
    description: string,
    default_bg?: string,
    fileName: string,
}

export class SettingsManager {
    private _root = '';
    private _settings_path = '';
    private _settings = {
        dev_mode: true,
        op_page: 'main',
        appearance: {
            bg: '',
            theme: '',
        }
    };

    private _themes_path = '';
    private _themes: any = {};

    public constructor (remote: typeof rmt, ipcRenderer: typeof ipc) {
        this._root = ipcRenderer.sendSync('get-root');

        //. Get settings
        
        this._settings_path = path.join(this._root, 'settings.json');
        fs.ensureFileSync(this._settings_path);

        let settings = this._settings;
        try {
            let raw = fs.readFileSync(this._settings_path).toString();
            if (raw) settings = JSON.parse(raw);
                
        } catch (err) {
            console.log('> [SETTINGS] error occured while trying to read settings');
            console.error('> [SETTINGS]', err);
        }

        this._settings = Object.assign(this._settings, settings);
        this.saveSync();

        //. Get themes
        this._themes_path = path.join(this._root, 'themes');
        fs.ensureDirSync(this._themes_path);
        for (const theme_name of fs.readdirSync(this._themes_path)) {
            if (theme_name.endsWith('.theme.css')) {
                console.log(`> [SETTINGS] loading '${theme_name}'`);
                let raw = fs.readFileSync(path.join(this._themes_path, theme_name)).toString();
                try {
                    this._themes = {
                        ...this._themes,
                        [theme_name.split('.theme.css')[0].toLowerCase()]: {
                            name: raw.split('@name:')[1].split('\n')[0].split('\'')[1],
                            author: raw.split('@author:')[1].split('\n')[0].split('\'')[1],
                            version: raw.split('@version:')[1].split('\n')[0].split('\'')[1],
                            description: raw.split('@description:')[1].split('\n')[0].split('\'')[1],
                            default_bg: raw.split('@default-bg:')[1].split('\n')[0].split('\'')[1],
                            path: path.join(this._themes_path, theme_name),
                        }
                    };
                } catch (err) {
                    console.log(`> [SETTINGS] error while parsing '${theme_name}'`);
                    console.log(`> [SETTINGS] make sure your theme fits the pattern:\n\t@name: ''\n\t@author: ''\n\t@version: ''\n\t@description: ''\n\t@default-bg: ''\n`);
                    
                    console.warn(err);
                }
            }
        }
    }

    public get root() {
        fs.ensureDirSync(this._root)
        return this._root;
    }

    public set root(_) {}

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
    
    //#region Appearance

    public get bg() {
        return this._settings.appearance.bg;
    }

    public set bg(to: any) {
        if (to === 1) { // plain BG
            console.log('> [SETTINGS] applying plain bg');
            let bg_el = document.getElementById('bg-img');
            if (bg_el) {
                bg_el.parentElement?.parentElement?.classList.add('plain');
            }
        } else if (to != undefined && to != '') {
            console.log('> [SETTINGS] applying bg', to);
            let bg_el = document.getElementById('bg-img');
            if (bg_el) {
                bg_el.parentElement?.parentElement?.classList.remove('plain');
                if (fs.existsSync(to)) {
                    bg_el.setAttribute('src', to);
                } else {
                    console.log('> [SETTINGS] path not found');
                }
            }
            
            this._settings.appearance.bg = to;
        } else if (to == '') {
            console.log(`> [SETTINGS] setting default bg for '${this._settings.appearance.theme}'`);
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
    }

    public get themes() {
        return this._themes;
    }

    public get theme() {
        return this._settings.appearance.theme;
    }
    
    public set theme(to) {
        if (this._themes[to] != undefined) {
            console.log('> [SETTINGS] applying theme', this._themes[to]);
            let theme_link = document.getElementById('theme');
            if (theme_link) {
                theme_link.setAttribute('href', this._themes[to].path)
            }
            
            this._settings.appearance.theme = to;
        } else if (to == '') {
            console.log('> [SETTINGS] setting default theme');
        } else {
            console.log('> [SETTINGS] theme not found');
        }
    }
    //#endregion
}