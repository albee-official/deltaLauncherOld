//#region declare stuff from preload...
interface IpcRendererEvent extends Event {
    ports: MessagePort[];
    sender: IpcRenderer;
    senderId: number;
}
interface IpcRenderer extends NodeJS.EventEmitter {
    on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): this;
    once(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): this;
    send(channel: string, ...args: any[]): void;
    sendSync(channel: string, ...args: any[]): any;
}

declare let ipcRenderer: IpcRenderer;
declare let modpackManager: any;
//#endregion

console.log('> [START] Hallo from render :)');

const coreCount = document.getElementById('cores');
// console.log(modpackManager);

(async () => {
    
})();