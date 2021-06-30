import type { IpcMainEvent } from 'electron/main';
import type { remote as rmt, ipcRenderer as ipc } from 'electron'
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

    public constructor (remote: typeof rmt, ipcRenderer: typeof ipc) {
        this._root = ipcRenderer.sendSync('get-root');
    }

    public get root() {
        fs.ensureDirSync(this._root)
        return this._root;
    }

    public set root(_) {}
}