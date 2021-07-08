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

// declare let ipcRenderer: IpcRenderer;
// declare let modpackManager: any;
// declare let settingsManager: any;
declare let CapitalizeFirstLetter: Function;
//#endregion

//@ts-expect-error
onbeforeload();
console.log('> [MAIN] hello from renderer :)');

enum sections {
    MAIN,
    SETTINGS,
    ACCOUNT,
}

class SelectButton {
    private _id: string;
    private _el: HTMLDivElement;
    private _state: string;

    constructor (id: string) {
        this._id = id;
        this._el = document.getElementById(id) as HTMLDivElement;
        this._state = 'selected';
    }

    public set state(to: string) {
        this._state = to;
        switch (this._state) {
            case 'none':
                this._el.innerHTML = 'Выбрать';
                this._el.classList.remove('selected');
                this._el.classList.remove('locked');
                break;

            case 'selected':
                this._el.innerHTML = 'Выбрано';
                this._el.classList.add('selected');
                break;

            case 'installing': 
                this._el.innerHTML = 'Установка';
                this._el.classList.add('locked');
                break;

            case 'not awailable':
                this._el.innerHTML = 'Не доступно';
                this._el.classList.add('locked');
                break;

            default:
                this._el.innerHTML = 'Выбрать';
                this._el.classList.remove('selected');
                this._el.classList.remove('locked');
                break;
        }
    }

    public get state() {
        return this._state;
    }
}

class UI {
    private _header = document.getElementById('info-header');
    private _buttons: any;
    private _sub = document.getElementById('info-sub');

    constructor () {
        this._buttons = {...this._buttons, magicae: new SelectButton('select-magicae')};
        this._buttons = {...this._buttons, fabrica: new SelectButton('select-fabrica')};
        this._buttons = {...this._buttons, statera: new SelectButton('select-statera')};
        this._buttons = {...this._buttons, insula: new SelectButton('select-insula')};
    }

    public get modpack() {
        return settingsManager.settings.on_modpack
    }

    public set modpack(to) {
        this._buttons[settingsManager.settings.on_modpack].state = 'none';
        this._buttons[to].state = 'selected';
        settingsManager.settings.on_modpack = to;
    }

    public get footer_h() {
        return this._header?.innerHTML;
    }

    public set footer_h(to) {
        if (this._header) this._header.innerHTML = to as string;
    }

    public get footer_p() {
        return this._sub?.innerHTML;
    }

    public set footer_p(to) {
        if (this._sub) this._sub.innerHTML = to as string;
    }
}

let ui = new UI();
ui.modpack = settingsManager.settings.on_modpack;

//#region nav

let section: number = sections.SETTINGS; // Section by default

let section_elements = document.getElementById('sections-container')?.children;
let nav_elements = document.getElementById('header-nav')?.children;

function openSection(section: sections) {
    if (section_elements && nav_elements) {
        for (let i = 0; i < section; i++) {
            section_elements[i].classList.add('toleft');
            section_elements[i].classList.remove('toright');

            nav_elements[i].classList.remove('active');
        }

        section_elements[section].classList.remove('toleft');
        section_elements[section].classList.remove('toright');
        
        nav_elements[section].classList.add('active');

        for (let i = section + 1; i < section_elements.length; i++) {
            section_elements[i].classList.remove('toleft');
            section_elements[i].classList.add('toright');

            nav_elements[i].classList.remove('active');
        }
    } else console.log('> [MAIN]', 'cant find sections or nav_elements');
    
}

if (nav_elements) {
    nav_elements[0].addEventListener('click', () => {
        section = sections.MAIN;
        openSection(sections.MAIN);
    });

    nav_elements[1].addEventListener('click', () => {
        section = sections.SETTINGS;
        openSection(sections.SETTINGS);
    });

    nav_elements[2].addEventListener('click', () => {
        section = sections.ACCOUNT;
        openSection(sections.ACCOUNT);
    });
} else console.log('> [MAIN]', 'cant find nav');

openSection(section);

//#endregion
//#region footer
document.getElementById('select-magicae')?.addEventListener('click', () => {
    ui.modpack = 'magicae';
    ui.footer_h = `Выбрано: Magicae`;
    settingsManager.saveSync();
});

document.getElementById('select-fabrica')?.addEventListener('click', () => {
    ui.modpack = 'fabrica';
    ui.footer_h = `Выбрано: Fabrica`;
    settingsManager.saveSync();
});

document.getElementById('select-statera')?.addEventListener('click', () => {
    ui.modpack = 'statera';
    ui.footer_h = `Выбрано: Statera`;
    settingsManager.saveSync();
});

document.getElementById('select-insula')?.addEventListener('click', () => {
    ui.modpack = 'insula';
    ui.footer_h = `Выбрано: Insula`;
    settingsManager.saveSync();
});

ui.footer_h = `Выбрано: ${CapitalizeFirstLetter(ui.modpack)}`;
//#endregion