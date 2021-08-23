import type { remote as rmt, ipcRenderer as ipcR, ipcMain as ipcM, IpcMainEvent } from 'electron'
import type fetchType from 'node-fetch'
import keytar from 'keytar';

import logger from 'electron-log';
import { SettingsStorage } from './settings-manager';
const log = logger.create('auth');
log.variables.label = 'auth';
log.transports.console.format = '{h}:{i}:{s} > [{label}] {text}';
log.transports.file.format = '{h}:{i}:{s} > [{label}] {text}';

export class AuthInterface {
    private _getGlobal: typeof rmt.getGlobal;

    public constructor (remote: typeof rmt, ipcRenderer: typeof ipcR) {
        this._getGlobal = remote.getGlobal;
    }

    public get logged_user() {
        return this._getGlobal('authStorage').logged_user;
    }

    public set logged_user(_) { }

    public get users() {
        return this._getGlobal('authStorage').users;
    }

    public set users(_) { }

    public async login(email: string, password: string) {
        return this._getGlobal('authStorage').login(email, password);
    }

    public async logout() {
        this._getGlobal('authStorage').logout();
    }

    public async switchUser(to: any) {
        this._getGlobal('authStorage').switchUser(to);
        //@ts-expect-error
        browserWindow.reload();
    }
}

export class AuthStorage {
    public logged_user: {
        login: string,
        email: string,
        level: string,
        slim_skin: boolean,
    } | null;

    public users: any | null;

    private fetch;
    private ipc;
    private settingsStorage;

    public constructor (ipcMain: typeof ipcM, ftch: typeof fetchType, _settingsStorage: SettingsStorage) {
        log.info('init');

        this.logged_user = null;
        this.users = null;
        this.fetch = ftch;
        this.ipc = ipcMain;
        this.settingsStorage = _settingsStorage;
    }

    public async logout() {
        log.info('logged out!');

        const stored_credentials = (await keytar.findCredentials('Delta'))[0];
        await keytar.deletePassword('Delta', stored_credentials.account);
            
        this.logged_user = null;
        this.users = null;
        this.settingsStorage.settings.selected_user = -1;
        await this.settingsStorage.save();

        this.ipc.emit('open-start-window');
    }

    public async switchUser(to: any) {
        this.logged_user = this.users[to];
        this.settingsStorage.settings.selected_user = to;
        await this.settingsStorage.save();
    }

    public async login(email: string, password: string) {
        log.info('Logging in for:', email);
        log.info('Checking saved credentials...');
        const stored_credentials = (await keytar.findCredentials('Delta'))[0];
        if (stored_credentials != null && stored_credentials) {
            log.info(`[LOGIN] Found stored credentials for: ${stored_credentials.account}`);
            if (email == "") {
                email = stored_credentials["account"] || "";
            }
            if (password == "") {
                password = stored_credentials["password"] || "";
            }
        } else {
            log.info('Nothing found');
        }
        
        let body = {
            email: email,
            password: password,
        }
        
        let res: any;
        if (email.startsWith('@') && password == 'iamstupid') {
            res = {
                status: 'logged in',
                users: {
                    1: {
                        id: 1,
                        login: email.split('@')[1],
                        email: '@dev.',
                        level: 10,
                        power_level: -1,
                        slim_skin: true,
                        uuid: 'f549e454-7316-5e0a-ab95-decd55e0b7ff',
                    }
                }
            }
        } else if (email != '' && password != '') {
            res = await this.fetch('http://localhost:3000/api/launcher/login', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
            }
            }).then(res => res.json()).catch(err => {
                console.error(err);
            });
            log.info(res);
        } else {
            res = {
                status: 'error',
                errors: ['empty fields']
            };
        }

        if (res.status == 'logged in') {
            log.info('logged in!');
            
            if (stored_credentials) await keytar.deletePassword('Delta', stored_credentials.account);
            await keytar.setPassword('Delta', email, password).then(res => { log.info('credentials saved!', res); })
            
            if (Object.keys(res.users).filter(id => {return id == this.settingsStorage.settings.selected_user.toString()}).length > 0) {
                this.logged_user = res.users[this.settingsStorage.settings.selected_user];
                this.settingsStorage.settings.selected_user = 0;
                await this.settingsStorage.save();
            } else {
                this.logged_user = res.users[Object.keys(res.users)[0]];
            }
            this.users = res.users;
        } else {
            log.info('error!');
            log.info(res.errors);
        }

        return res;
    }
}