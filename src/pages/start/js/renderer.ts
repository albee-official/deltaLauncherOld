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
declare let settingsManager: any;
//#endregion

//@ts-expect-error
onbeforeload();
console.log('> [START] hello from render :)');

const coreCount = document.getElementById('cores');
const start_steps = document.getElementById('steps')?.children;

function showLogin() {
    if (start_steps) start_steps[0].classList.remove('active');
    if (start_steps) start_steps[1].classList.add('active');

    document.getElementById('bg')?.classList.remove('darken');
    document.body.classList.add('login-open');
}

function closeLogin() {
    if (start_steps) start_steps[1].classList.remove('active');
    if (start_steps) start_steps[2].classList.add('active');

    document.getElementById('bg')?.classList.add('darken');
    document.body.classList.remove('login-open');
}

let a = 1;

(async () => {
    // speedrun();

    await checkForUpdates();

    showLogin();
    document.getElementById('login-submit')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await login();
        closeLogin();

        await start();
    });
})();

async function speedrun() {
    a = .01;
    await checkForUpdates();
    await login();
    await start();
}

let procent = 0;
async function checkForUpdates() {
    console.log('> [START] checking for updates...');
    
    // delay in async method
    procent = 0;
    let ae = setInterval(() => {
        procent++;
        if (start_steps) start_steps[0].innerHTML = `Проверка обновлений: ${procent}%`
    }, 2000 / 100);
    await new Promise((resolve, reject) => { setTimeout(() => {resolve(undefined)}, 2000 * a) } );
    clearInterval(ae);
}

async function login() {
    console.log('> [START] logging you in...');

    // delay in async method
    procent = 0;
    let ae = setInterval(() => {
        procent++;
        if (start_steps) start_steps[1].innerHTML = `Запрос авторизации: ${procent}%`
    }, 1000 / 100);
    await new Promise((resolve, reject) => { setTimeout(() => {resolve(undefined)}, 1000 * a) } );
    clearInterval(ae);
}

async function start() {
    console.log('> [START] starting...');

    // delay in async method
    procent = 0;
    let ae = setInterval(() => {
        procent++;
        if (start_steps) start_steps[2].innerHTML = `Запуск: ${procent}%`
    }, 3000 / 100);
    await new Promise((resolve, reject) => { setTimeout(() => {resolve(undefined)}, 3000 * a) } );
    clearInterval(ae);

    ipcRenderer.send('open-main-window');
    
    setTimeout(() => {
        //@ts-expect-error
        browserWindow.exit();
    }, 250);
}