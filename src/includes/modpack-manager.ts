import type { IpcMainEvent } from 'electron/main';
import type { remote as rmt } from 'electron'
import * as fs from 'fs-extra';
import * as path from 'path'

//# Listeners in main event

export let listeners = {
    // 'test': (event: IpcMainEvent) => {
    //     event.reply('fuck off');
    // },
}

//# Lib

export class ModpackManager {
    private _root = '';

    public constructor (remote: typeof rmt) {
        this._root = path.join(remote.app.getPath('appData'), 'DeltaThing');
    }

    public get root() {
        fs.ensureDirSync(this._root)
        return this._root;
    }

    public set root(val) {
        fs.ensureDirSync(val);
        this._root = val;
    }
}