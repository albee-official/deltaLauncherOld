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
import type { AuthInterface } from '../../../includes/auth-manager'
import type { ModpackManager } from '../../../includes/modpack-manager'
import type { SettingsInterface } from '../../../includes/settings-manager'

declare let authInterface: AuthInterface;
declare let modpackManager: ModpackManager;
declare let settingsInterface: SettingsInterface;
declare let shell: any;
declare let path: any;
declare let dialog: any;
declare let CapitalizeFirstLetter: Function;
declare let version: string;
declare let gc: any;
declare let max_setable_ram: number;
declare let min_setable_ram: number;
declare let os: any;

import type __Slider from '../../../components/slider/slider';
declare class Slider extends __Slider {};

import type { Overlay as __Overlay, SelectOverlay as __SelectOverlay, AskOverlay as __AskOverlay } from '../../../components/overlay/overlay';
declare class Overlay extends __Overlay {};
declare class SelectOverlay extends __SelectOverlay {};
declare class AskOverlay extends __AskOverlay {};
//#endregion

// I manually wrote this and i regret doing it
function ascii_to_dumbass(keycode: number) {
    switch (keycode) {
        //#region Alphabet
        case 65: return 30; // a
        case 66: return 48; // b
        case 67: return 46; // c
        case 68: return 32; // d
        case 69: return 18; // e NICE
        case 70: return 33; // f
        case 71: return 34; // g
        case 72: return 35; // h
        case 73: return 23; // i
        case 74: return 36; // j
        case 75: return 37; // k
        case 76: return 38; // l
        case 77: return 50; // m
        case 78: return 49; // n
        case 79: return 24; // o
        case 80: return 25; // p
        case 81: return 16; // q
        case 82: return 19; // r
        case 83: return 31; // s
        case 84: return 20; // t
        case 85: return 22; // u
        case 86: return 47; // v
        case 87: return 17; // w
        case 88: return 45; // x
        case 89: return 21; // y
        case 90: return 44; // z
        //#endregion
        //#region nums
        case 48: return 11; // 0
        case 49: return 2; // 1
        case 50: return 3; // 2
        case 51: return 4; // 3
        case 52: return 5; // 4
        case 53: return 6; // 5
        case 54: return 7; // 6
        case 55: return 8; // 7
        case 56: return 9; // 8
        case 57: return 10; // 9
        //#endregion
        //#region modifiers
        case 16: return 42; // SHIFT
        case 17: return 29; // CONTOLL
        case 18: return 42; // ALT
        case 18: return 42; // CAPS LOCK ( CAPITAL :) )
        case 9: return 15; // TAB
        case 192: return 41; // GRAVE ( ` )
        case 32: return 57; // SPACE ( )
        //#endregion
        default: return 0;
    }
}

//@ts-expect-error
onbeforeload();
console.log('hello from renderer :)');

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

let version_span = document.getElementById('version-span');
if (settingsInterface.settings.dev_mode) {
    if (version_span) version_span.innerHTML = `${version} [ Режим разработчика ]`;
} else {
    if (version_span) version_span.innerHTML = `${version}`;
}

let profile_picture_img = document.getElementById('profile-picture-img') as HTMLImageElement;
profile_picture_img.src = `http://localhost:3000/api/get/profile-picture?id=${authInterface.logged_user.id}`;

let profile_login_el = document.getElementById('profile-login-el') as HTMLHRElement;
profile_login_el.innerText = authInterface.logged_user.login;

enum sections {
    MAIN,
    SETTINGS,
    ACCOUNT,
}

class MainButton {
    public el = document.getElementById('main-button') as HTMLDivElement
    public container_el = this.el.parentElement?.parentElement as HTMLDivElement
    public h1_el = this.el?.querySelector('h1');
    public p_el = this.el?.querySelector('p');

    private PRESS_COOLDOWN = 200;
    private pressed = false;
    private _sub_buttons: any[] = [];

    private _state = 'play';
    private _locked = false;

    constructor () {
        this.state = 'play';
        this.locked = false;
    }

    public set sub_buttons(to: any[]) {
        this._sub_buttons = to;
        this.container_el.innerHTML = ``;
        
        let html = '';
            for (let i = 0; i < to.length; i++) {
                const el = to[i];
                if (el.toggle) {
                    html += `<div style="--order: ${i}" class="sub-button toggle">
                        <div class="info">
                            <h1>${el.title}</h1>
                        </div>
                        <div data-state="true" class="toggle noselect">
                            Да
                        </div>
                    </div>`
                } else {
                    html += `<div style="--order: ${i}" class="sub-button">
                        <div class="info">
                            <h1>${el.title}</h1>
                        </div>
                    </div>`
                }
            }

            html += `<div class="main-button">
                <div id="main-button" class="info">
                    <h1>${this.h1}</h1>
                    <p>${this.p}</p>
                </div>
                <div id="open-other-buttons" class="open-other-buttons">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10.854" height="6.426" viewBox="0 0 10.854 6.426">
                        <path id="Path_397" data-name="Path 397" d="M0,0,4.012,4.012,8.025,0" transform="translate(9.44 5.012) rotate(180)" fill="none" stroke="var(--fill)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                    </svg>                      
                </div>
            </div>`;

            this.container_el.innerHTML += html;

            let sub_butttons = document.querySelectorAll('.sub-button');

            let btns = document.getElementById('main-button-container') as HTMLDivElement;
            (document.getElementById('open-other-buttons')  as HTMLDivElement).addEventListener('mouseenter', () => {            
                btns.classList.add('show-sub');
            });

            btns.addEventListener('mouseleave', () => {
                btns.classList.remove('show-sub');
            });

            (document.getElementById('main-button') as HTMLDivElement).addEventListener('mouseenter', () => {
                btns.classList.remove('show-sub');
            });

            for (let i = 0; i < sub_butttons.length; i++) {
                let btn = sub_butttons[i] as HTMLDivElement;
                if (!btn.classList.contains('toggle')) {
                    btn.addEventListener('click', () => {
                        to[i].onclick();
                    })
                } else {
                    let btn_child = btn.children[1];
                    if (to[i].checked) {
                        //@ts-expect-error
                        btn_child.dataset.state = 'true';
                        btn_child.innerHTML = 'Да';
                    } else {
                        //@ts-expect-error
                        btn_child.dataset.state = 'false';
                        btn_child.innerHTML = 'Нет';
                    }

                    btn.addEventListener('click', () => {
                        //@ts-expect-error
                        if (btn_child.dataset.state == 'false') {
                            //@ts-expect-error
                            btn_child.dataset.state = 'true';
                            btn_child.innerHTML = 'Да';
                        } else {
                            //@ts-expect-error
                            btn_child.dataset.state = 'false';
                            btn_child.innerHTML = 'Нет';
                        }
                        //@ts-expect-error
                        to[i].onclick(btn_child.dataset.state == 'true');
                    })
                }
            }

        this.el = document.getElementById('main-button') as HTMLDivElement
        this.container_el = this.el.parentElement?.parentElement as HTMLDivElement
        this.h1_el = this.el?.querySelector('h1');
        this.p_el = this.el?.querySelector('p');

        this.el.addEventListener('click', async () => {
            modpackManager.updateModpackDirs();
            modpackManager.updateLibsDirs();
            if (this.locked) return;
            this.locked = true;
            setTimeout(() => {
                this.locked = false;
            }, this.PRESS_COOLDOWN);
            main_button_click();
        });
    }

    public get sub_buttons() {
        return this._sub_buttons;
    }

    public set locked(to: boolean) {
        this._locked = to;
        if (to) {
            this.container_el.classList.add('locked')
        } else {
            this.container_el.classList.remove('locked')
        }
    }

    public get locked() {
        return this._locked;
    }

    public set h1(to: string) {
        if (this.h1_el) this.h1_el.innerText = to;
    }

    public get h1() {
        if (this.h1_el) return this.h1_el.innerText;
        return '';
    }

    public set p(to: string) {
        if (this.p_el) this.p_el.innerText = to;
    }

    public get p() {
        if (this.p_el) return this.p_el.innerText;
        return '';
    }

    public set state(to: string) {
        this._state = to;
        switch (this._state) {
            case 'play':
                this.locked = false;
                this.h1 = 'Играть';
                this.p = settingsInterface.settings.auto_go_to_server_thing ? 'Автозаход на сервер включен' : 'Автозаход на сервер выключен';
                this.sub_buttons = [
                    {
                        toggle: false,
                        title: 'Удалить',
                        onclick: async () => {
                            await modpackManager.clearModpackDir(ui.modpack);
                            await modpackManager.updateModpackDirs();
                            ui.modpack = ui.modpack;
                        }
                    },
                    {
                        checked: settingsInterface.settings.auto_go_to_server_thing,
                        toggle: true,
                        title: 'Автозаход на сервер',
                        onclick: (checked: boolean) => {
                            settingsInterface.settings.auto_go_to_server_thing = checked;
                            settingsInterface.save();

                            if (checked) {
                                this.p = 'Автозаход на сервер включен';
                            } else {
                                this.p = 'Автозаход на сервер выключен';
                            }
                        }
                    },
                ]
                break;

            case 'launched':
                this.locked = true;
                this.h1 = 'Запущена';
                this.p = 'Сборка уже запущена';
                this.sub_buttons = [];
                break;

            case 'install':
                this.locked = false;
                this.h1 = 'Скачать';
                this.p = 'Запустить по завершении: Нет'
                this.sub_buttons = [
                    {
                        checked: false,
                        toggle: true,
                        title: 'Запустить по завершении',
                        onclick: (checked: boolean) => {
                            if (checked) {
                                this.p = 'Запустить по завершении: Да';
                            } else {
                                this.p = 'Запустить по завершении: Нет';
                            }
                        }
                    },
                ]
                break;

            case 'download':
                this.locked = false;
                this.h1 = 'Пауза';
                this.p = 'Не выключайте лаунчер';
                this.sub_buttons = [
                    {
                        toggle: false,
                        title: 'Остановить',
                        onclick: () => {
                            modpackManager.downloader.cancel()
                            ui.can_select_modpack = true;
                            ui.footer.download_progress = 0;
                            ui.footer.download_in_progress = false;
                            ui.footer.h1 = 'Выбрано: ' + capitalizeFirstLetter(ui.modpack);
                            ui.footer.p = 'Разработчик';
                            ui.modpack = ui.modpack;
                        }
                    },
                ]
                break;

            case 'unzipping':
                this.locked = true;
                this.h1 = 'Завершение';
                this.p = 'Не выключайте лаунчер';
                this.sub_buttons = [];
                break;
            
            case 'paused':
                this.locked = false;
                this.h1 = 'Возобновить';
                this.p = 'Не выключайте лаунчер'
                this.sub_buttons = [
                    {
                        toggle: false,
                        title: 'Отменить',
                        onclick: () => {
                            modpackManager.downloader.cancel()
                            ui.can_select_modpack = true;
                            ui.footer.download_progress = 0;
                            ui.footer.download_in_progress = false;
                            ui.footer.h1 = 'Выбрано: ' + capitalizeFirstLetter(ui.modpack);
                            ui.footer.p = 'Разработчик';
                            ui.modpack = ui.modpack;
                        }
                    },
                ]
                break;

            default:
                this.h1 = 'Играть';
                break;
        }
    }

    public get state() {
        return this._state;
    }
}

class SelectButton {
    private _id: string;
    readonly _el: HTMLDivElement;
    private _state: string;
    private _locked: boolean;

    constructor (id: string, c_state='none') {
        this._locked = false;
        this._id = id;
        this._el = document.getElementById(id) as HTMLDivElement;
        this._state = 'none';
        this.state = c_state;
    }

    public set locked(to: boolean) {
        this._locked = to;
        if (to) {
            this._el.classList.add('locked')
        } else {
            this._el.classList.remove('locked')
        }
    }

    public get locked() {
        return this._locked;
    }

    public set state(to: string) {
        console.log(to);
        
        this._state = to;
        switch (this._state) {
            case 'none':
                this._el.innerHTML = 'Выбрать';
                this._el.classList.remove('selected');
                break;

            case 'selected':
                this._el.innerHTML = 'Выбрано';
                this._el.classList.add('selected');
                break;
            
            case 'download':
                this._el.innerHTML = 'Скачать';
                this._el.classList.remove('selected');
                break;

            default:
                this._el.innerHTML = 'Выбрать';
                this._el.classList.remove('selected');
                break;
        }
    }

    public get state() {
        return this._state;
    }
}

class Footer {
    public el = document.getElementById('footer-bar') as HTMLDivElement;
    public h1_el = this.el?.querySelector('h1') as HTMLParagraphElement;
    public p_el = this.el?.querySelector('p') as HTMLParagraphElement;
    public _download_in_progress = false;
    public _download_progress = 0;

    public set download_in_progress(to: boolean) {
        if (to) {
            this.el?.parentElement?.classList.add('download');
        } else {
            this.el?.parentElement?.classList.remove('download');
        }
        this._download_in_progress = to;
    }

    public get download_in_progress() { return this._download_in_progress; }

    public set download_progress(to: number) {
        (this.el.querySelector('.filler') as HTMLDivElement).style.width = `${to}%`;
        this._download_progress = to;
    }

    public get download_progress() { return this._download_progress; }

    public set h1(to: string) {
        if (this.h1_el) this.h1_el.innerHTML = to;
    }

    public get h1() {
        if (this.h1_el) return this.h1_el.innerHTML;
        return '';
    }

    public set p(to: string) {
        if (this.p_el) this.p_el.innerHTML = to;
    }

    public get p() {
        if (this.p_el) return this.p_el.innerHTML;
        return '';
    }
}

class KeySelect {
    public _id: string;
    public el: HTMLDivElement;
    public _param: any;
    public _overlay: Overlay;

    constructor (id: string, param: string, overlay: Overlay) {
        this._id = id;
        this.el = document.getElementById(id) as HTMLDivElement;
        this._param = param;
        this._overlay = overlay;

        this.el.addEventListener('click', () => {this.select()})
    }

    public select() {
        //@ts-expect-error
        let setting = settingsInterface.settings.modpack_settings.controls[this._param];
        //@ts-expect-error
        console.log(this._param, settingsInterface.settings.modpack_settings.controls[this._param]);

        this._overlay.show('Нажмите любую клавишу...', setting.key_name);

        let input = document.createElement('input');
        input.classList.add('invisible');
        this._overlay.el.appendChild(input)
        input.focus();
        input.onblur = () => {
            this._overlay.hide();
            input.remove();
        }

        input.onkeydown = e => {
            let name = e.key.toUpperCase();
            let code = e.keyCode;

            if (name == 'ESCAPE') {
                code = -1;
                name = 'NONE';
            } else if (name == 'CONTROL') {
                name = 'LCTRL';
            } else if (name == 'SHIFT') {
                name = 'LSHIFT';
            }

            console.log(code);

            //@ts-expect-error
            settingsInterface.settings.modpack_settings.controls[this._param].key_code = code;
            //@ts-expect-error
            settingsInterface.settings.modpack_settings.controls[this._param].minecraft_code = ascii_to_dumbass(code);
            //@ts-expect-error
            settingsInterface.settings.modpack_settings.controls[this._param].key_name = name;

            this.el.innerText = name;

            this._overlay.hide();
        }
    }
}

class UI {
    private _header = document.getElementById('info-header');
    readonly _buttons: any = {
        magicae: new SelectButton('select-magicae', modpackManager.modpacks['magicae'].installed ? 'none' : 'download'),
        fabrica: new SelectButton('select-fabrica', modpackManager.modpacks['fabrica'].installed ? 'none' : 'download'),
        statera: new SelectButton('select-statera', modpackManager.modpacks['statera'].installed ? 'none' : 'download'),
        insula: new SelectButton('select-insula', modpackManager.modpacks['insula'].installed ? 'none' : 'download'),
    };
    private _sub = document.getElementById('info-sub');

    public footer = new Footer();
    public select_overlay = new SelectOverlay();
    public ask_overlay = new AskOverlay();
    public overlay = new Overlay();
    public main_button = new MainButton();

    readonly key_select_buttons: any = {
        crouch: new KeySelect('key-crouch', 'crouch', this.overlay),
        run: new KeySelect('key-run', 'run', this.overlay),
        forward: new KeySelect('key-forward', 'forward', this.overlay),
        back: new KeySelect('key-back', 'back', this.overlay),
        right: new KeySelect('key-right', 'right', this.overlay),
        left: new KeySelect('key-left', 'left', this.overlay),
        zoom: new KeySelect('key-zoom', 'zoom', this.overlay),
        quests: new KeySelect('key-quests', 'quests', this.overlay),
    }

    public memory_slider = new Slider(document.getElementById('memory-slider') as HTMLDivElement, settingsInterface.settings.modpack_settings.allocated_memory, min_setable_ram, Math.max(min_setable_ram, max_setable_ram), max_setable_ram - min_setable_ram < 6 ? 1 : 2);
    public sidemenu_memory_slider = new Slider(document.getElementById('sidemenu-memory-slider') as HTMLDivElement, settingsInterface.settings.modpack_settings.allocated_memory, min_setable_ram, Math.max(min_setable_ram, max_setable_ram), max_setable_ram - min_setable_ram < 6 ? 1 : 2);
    public optimization_slider = new Slider(document.getElementById('optimization-slider') as HTMLDivElement, settingsInterface.settings.modpack_settings.optimization_level);
    public blur_slider = new Slider(document.getElementById('blur-slider') as HTMLDivElement, settingsInterface.blur_amount);
    public opacity_slider = new Slider(document.getElementById('opacity-slider') as HTMLDivElement, settingsInterface.filter_opacity);

    constructor () {
        async function updateModpackDirs() {
            (document.getElementById('libs-dir') as HTMLParagraphElement).innerText = await modpackManager.ensureLibsDir();
            (document.getElementById('magicae-dir') as HTMLParagraphElement).innerText = await modpackManager.ensureModpackDir('magicae');
            (document.getElementById('fabrica-dir') as HTMLParagraphElement).innerText = await modpackManager.ensureModpackDir('fabrica');
            (document.getElementById('statera-dir') as HTMLParagraphElement).innerText = await modpackManager.ensureModpackDir('statera');
            (document.getElementById('insula-dir') as HTMLParagraphElement).innerText = await modpackManager.ensureModpackDir('insula');
        };
        updateModpackDirs();

        // setInterval(() => {
        //     max_setable_ram = Math.min(Math.ceil(os.freemem() / 1024 / 1024 / 1024) + 1, Math.ceil(os.totalmem() / 1024 / 1024 / 1024));
        //     if (!this.memory_slider.focused) this.memory_slider = new Slider(document.getElementById('memory-slider') as HTMLDivElement, this.memory_slider.value, min_setable_ram, Math.max(min_setable_ram, max_setable_ram), max_setable_ram - min_setable_ram < 6 ? 1 : 2);
        //     if (!this.sidemenu_memory_slider.focused) this.sidemenu_memory_slider = new Slider(document.getElementById('sidemenu-memory-slider') as HTMLDivElement, this.sidemenu_memory_slider.value, min_setable_ram, Math.max(min_setable_ram, max_setable_ram), max_setable_ram - min_setable_ram < 6 ? 1 : 2);
        // }, 2000)

        this.memory_slider.oninput = () => {
            settingsInterface.settings.modpack_settings.allocated_memory = this.memory_slider.value
            this.sidemenu_memory_slider.value = this.memory_slider.value;
        };
        this.memory_slider.onchange = () => settingsInterface.save();

        this.memory_slider.max_val = max_setable_ram;
        this.memory_slider.min_val = min_setable_ram;

        this.sidemenu_memory_slider.oninput = () => {
            settingsInterface.settings.modpack_settings.allocated_memory = this.sidemenu_memory_slider.value
            this.memory_slider.value = this.sidemenu_memory_slider.value;
        }
        this.sidemenu_memory_slider.onchange = () => settingsInterface.save();

        this.sidemenu_memory_slider.max_val = max_setable_ram;
        this.sidemenu_memory_slider.min_val = min_setable_ram;

        this.optimization_slider.oninput = () => settingsInterface.settings.modpack_settings.optimization_level = this.optimization_slider.value;
        this.optimization_slider.onchange = () => settingsInterface.save();

        this.blur_slider.oninput = () => settingsInterface.blur_amount = this.blur_slider.value;
        this.blur_slider.onchange = () => settingsInterface.save();

        this.opacity_slider.oninput = () => settingsInterface.filter_opacity = this.opacity_slider.value;
        this.opacity_slider.onchange = () => settingsInterface.save();

        let opacity_obg = document.getElementById('bg-opacity');
        if (opacity_obg) opacity_obg.style.transition = 'none 0s ease 0s';

        async function showSelectModpack(modpack: string) {
            let options = {
                title : "Выберите папку", 
                properties: ['openDirectory']
               }
               
            let file = await dialog.showOpenDialog(options)
            if (file.canceled) return;

            console.log(file.filePaths[0]);
            
            //@ts-expect-error
            settingsInterface.settings.modpacks[modpack].path = path.normalize(file.filePaths[0]);
            settingsInterface.save();
            modpackManager.updateModpackDirs();
            updateModpackDirs();
        }

        (document.getElementById('libs-dir') as HTMLParagraphElement).addEventListener('click', async (e) => {
            if (e.ctrlKey) {
                if (modpackManager.libs.path != '') shell.openPath(modpackManager.ensureLibsDir());
                return;
            } else {
                await showSelectModpack('libs');
            }
        });

        async function modpackHandler(e: any, modpack: string) {
            if (e.ctrlKey) {
                if (modpackManager.modpacks[modpack].path != '') shell.openPath(await modpackManager.ensureModpackDir(modpack));
                return;
            } else {
                await showSelectModpack(modpack);
            }
        }

        (document.getElementById('magicae-dir') as HTMLParagraphElement).addEventListener('click', (e) => {modpackHandler(e, 'magicae')});
        (document.getElementById('magicae-dir') as HTMLParagraphElement).addEventListener('lef', (e) => {modpackHandler(e, 'magicae')});
        (document.getElementById('fabrica-dir') as HTMLParagraphElement).addEventListener('click', (e) => {modpackHandler(e, 'fabrica')});
        (document.getElementById('statera-dir') as HTMLParagraphElement).addEventListener('click', (e) => {modpackHandler(e, 'statera')});
        (document.getElementById('insula-dir') as HTMLParagraphElement).addEventListener('click', (e) => {modpackHandler(e, 'insula')});

        this.footer.p = 'Разработчик';

        function displayThemes() {            
            let themes_html = '';
            if (themes_container) themes_container.innerHTML = `<div class="theme">
                <div class="left">
                    <h1>Default</h1>
                    <p>Standart look of delta</p>
                </div>
                <div class="right">
                    <h1>Albee</h1>
                    <p>v1.0</p>
                </div>
                <div class="button">
                    <div id="select-def-theme" class="select-button small">Выбрать</div>
                </div>
            </div>`;
            for (let theme_name in settingsInterface.themes) {
                const theme = settingsInterface.themes[theme_name];
                themes_html += `<div id="theme-${theme_name}" class="theme">
                    <div class="left">
                        <h1>${theme.name}</h1>
                        <p>${theme.description}</p>
                    </div>
                    <div class="right">
                        <h1>${theme.author}</h1>
                        <p>v${theme.version}</p>
                    </div>
                    <div class="button">
                        <div class="select-button small">Выбрать</div>
                    </div>
                </div>`;
            }
            if (themes_container) themes_container.innerHTML += themes_html;
            for (let theme_name in settingsInterface.themes) {
                const theme_el = document.getElementById(`theme-${theme_name}`);
                theme_el?.children[2].children[0].addEventListener('click', () => {
                    settingsInterface.theme = theme_name;
                    settingsInterface.save();
                });
            }
        }
        displayThemes();

        document.getElementById('change-account')?.addEventListener('click', async () => {
            let users = {};
            for (const k in authInterface.users) {
                const ussr = authInterface.users[k];
                users = {
                    ...users,
                    [ussr.id]: ussr.login, 
                }
            }

            users = {
                ...users,
                '-1': 'Выйти',
            }

            console.log(users);

            let selected = await this.select_overlay.showSelect('Выберите аккаунт', users);
            if (selected == authInterface.logged_user.id) return;
            if (selected != -1) {
                authInterface.switchUser(selected);
            } else {
                authInterface.logout();
            }
        });

        if (settingsInterface.settings.appearance.reduced_motion) {
            document.body.classList.add('reduced-motion');
        } else {
            document.body.classList.remove('reduced-motion');
        }

        (document.getElementById('reduced-motion-checkbox') as HTMLInputElement).checked = settingsInterface.settings.appearance.reduced_motion;
        document.getElementById('reduced-motion-checkbox')?.addEventListener('click', () => {
            settingsInterface.settings.appearance.reduced_motion = !settingsInterface.settings.appearance.reduced_motion;
            if (settingsInterface.settings.appearance.reduced_motion) {
                document.body.classList.add('reduced-motion');
            } else {
                document.body.classList.remove('reduced-motion');
            }
            settingsInterface.save();
        });

        (document.getElementById('show-console') as HTMLInputElement).checked = settingsInterface.settings.modpack_settings.show_console_output;
        document.getElementById('show-console')?.addEventListener('click', () => {
            settingsInterface.settings.modpack_settings.show_console_output = !settingsInterface.settings.modpack_settings.show_console_output;
            settingsInterface.save();
        });
        
        (document.getElementById('use-builtin-java') as HTMLInputElement).checked = settingsInterface.settings.modpack_settings.use_builtin_java;
        document.getElementById('use-builtin-java')?.addEventListener('click', () => {
            settingsInterface.settings.modpack_settings.use_builtin_java = !settingsInterface.settings.modpack_settings.use_builtin_java;
            settingsInterface.save();
        });

        document.getElementById('open-themes-list')?.addEventListener('click', () => {
            shell.openExternal(`https://github.com/AlbeeTheLoli/deltaLauncher/tree/main/themes`);
        });

        document.getElementById('open-themes-folder')?.addEventListener('click', () => {
            if (settingsInterface.themes_path) shell.openPath(path.normalize(settingsInterface.themes_path));
        });

        document.getElementById('recheck-themes')?.addEventListener('click', async () => {
            await settingsInterface.updateThemesList();
            settingsInterface.theme = settingsInterface.theme;
            displayThemes();
        });

        document.getElementById('select-def-theme')?.addEventListener('click', () => { 
            settingsInterface.theme = '';
            settingsInterface.save();
        });

        if (open_bg_el) open_bg_el.innerText = settingsInterface.bg == '' ? 'По умолчанию' : settingsInterface.bg;
        if (open_bg_el) open_bg_el.addEventListener('click', () => {
            if (settingsInterface.bg != '') shell.showItemInFolder(path.normalize(settingsInterface.bg));
        });

        document.getElementById('reset-bg')?.addEventListener('click', () => {
            settingsInterface.bg = '';
            settingsInterface.save();
            if (open_bg_el) open_bg_el.innerText = settingsInterface.bg == '' ? 'По умолчанию' : settingsInterface.bg;
        })

        document.getElementById('change-bg')?.addEventListener('click', async () => {
            let options = {
                title : "Выберите задний фон", 
                filters :[
                    {name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'ogg', 'mov']},
                ],
                properties: ['openFile']
               }
               
            let file = await dialog.showOpenDialog(options)
            if (file.canceled) return;

            console.log(file.filePaths[0]);
            
            settingsInterface.bg = path.normalize(file.filePaths[0]);
            settingsInterface.save();

            if (open_bg_el) open_bg_el.innerText = settingsInterface.bg == '' ? 'По умолчанию' : settingsInterface.bg;
        })

        let bg_video = document.getElementById('bg-video') as HTMLVideoElement;
        document.getElementById('bg-muted-cb')?.addEventListener('input', () => {
            settingsInterface.settings.appearance.muted = !settingsInterface.settings.appearance.muted;
            bg_video.muted = settingsInterface.settings.appearance.muted;
        });

        //@ts-expect-error
        document.getElementById('bg-muted-cb').checked = settingsInterface.settings.appearance.muted

        document.getElementById('open-root')?.addEventListener('click', () => {
            if (settingsInterface.root != '') shell.openPath(path.normalize(settingsInterface.root));
        })
    }

    _can_select_modpack = true;
    public set can_select_modpack(to: boolean) {
        if (this._can_select_modpack != to) {
            this._can_select_modpack = to;
            if (to) {
                let btns = this._buttons;
                for (const key in btns) {
                    const element = btns[key] as SelectButton;
                    element.locked = !to;
                }
            } else {
                let btns = this._buttons;
                for (const key in btns) {
                    const element = btns[key] as SelectButton;
                    element.locked = !to;
                }
            }
        }
    }

    public get can_select_modpack() {
        return this._can_select_modpack
    }

    public get modpack() { return settingsInterface.settings.on_modpack }

    public set modpack(to) {
        this._buttons[settingsInterface.settings.on_modpack].state
            = modpackManager.modpacks[settingsInterface.settings.on_modpack].installed ? 'none' : 'download';
            this._buttons[to].state = 'selected';
        this.updateMainButtonState(to);
        settingsInterface.settings.on_modpack = to;
    }

    public updateMainButtonState(modpack=this.modpack) {
        if (Object.keys(modpackManager.launched_modpacks).includes(modpack) && modpackManager.launched_modpacks[modpack] != undefined) {
            this.main_button.state = 'launched';
        } else if (modpackManager.modpacks[modpack].installed) {
            this.main_button.state = 'play';
        } else {
            this.main_button.state = 'install';
        }
    }
}

let themes_container = document.getElementById('themes-container');
let open_bg_el = document.getElementById('open-bg-path');

let ui = new UI();
ui.modpack = settingsInterface.settings.on_modpack;

//#region nav

let section: number = settingsInterface.settings.on_page; // Section by default

let section_elements = document.getElementById('sections-container')?.children;
let nav_elements = document.getElementById('header-nav')?.children;

function openSection(_section: sections) {
    section = _section;
    settingsInterface.settings.on_page = section;
    settingsInterface.save();
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
        openSection(sections.MAIN);
    });

    nav_elements[1].addEventListener('click', () => {
        openSection(sections.SETTINGS);
    });

    nav_elements[2].addEventListener('click', () => {
        openSection(sections.ACCOUNT);
    });
} else console.log('[MAIN]', 'cant find nav');

openSection(section);

//#endregion
//#region footer
document.getElementById('select-magicae')?.addEventListener('click', () => {
    if (ui._buttons.magicae.locked) return;
    ui.modpack = 'magicae';
    ui.footer.h1 = `Выбрано: Magicae`;
    settingsInterface.save();
});

document.getElementById('select-fabrica')?.addEventListener('click', () => {
    if (ui._buttons.fabrica.locked) return;
    ui.modpack = 'fabrica';
    ui.footer.h1 = `Выбрано: Fabrica`;
    settingsInterface.save();
});

document.getElementById('select-statera')?.addEventListener('click', () => {
    if (ui._buttons.statera.locked) return;
    ui.modpack = 'statera';
    ui.footer.h1 = `Выбрано: Statera`;
    settingsInterface.save();
});

document.getElementById('select-insula')?.addEventListener('click', () => {
    if (ui._buttons.insula.locked) return;
    ui.modpack = 'insula';
    ui.footer.h1 = `Выбрано: Insula`;
    settingsInterface.save();
});

ui.footer.h1 = `Выбрано: ${CapitalizeFirstLetter(ui.modpack)}`;
//#endregion

//#region PLAY BUTTON -------------------------------

let auto_login = true;

let LOADING_SPAN = '<span class="loading"><p>.</p><p>.</p><p>.</p></span>';

let downloading = false;
async function main_button_click() {
    let modpack = ui.modpack;
    if (ui.main_button.state == 'play') {                   //. ЗАПУСТИТЬ

        ui.can_select_modpack = false;

        let optifine_lol = await ui.ask_overlay.showSelect(`Optifine может вызывать сбои, оставить?`, {
            cancel: {
                body: 'Отменить',
            },
            leave: {
                body: 'Продолжить',
                type: 'alt',
            },
            remove: {
                body: 'Удалить и продолжить',
                type: 'clr',
            }
        }, 'Вы можете продолжить игру, если вы хотите играть с шейдерами, однако мы не виноваты, если у вас что то сломается.');

        switch (optifine_lol) {
            case 'cancel':
                return;

            case 'leave':
                console.log('launching with optifine, fine....');
                break;

            case 'remove':
                console.log('removing optifine....');
                break;
        }

        console.log(`${modpack} installed. launching...`);
        ui.overlay.show(`Запуск ${capitalizeFirstLetter(modpack)}...`, 'Пожалуйста, не выключайте лаунчер.', true)

        ui.main_button.h1 = 'Запускается...';
        ui.main_button.locked = true;
        ui.main_button.p = 'Не выключайте лаунчер';

        let status = await launchModpack(modpack);

        ui.modpack = modpack;
        ui.overlay.hide();
        ui.can_select_modpack = true;

    } else if (ui.main_button.state == 'install') {         //. УСТАНОВИТЬ

        ui.can_select_modpack = false;

        console.log(`${modpack} not installed. downloading...`);
        ui.footer.download_progress = 0;
        ui.footer.download_in_progress = true;
        ui.footer.h1 = 'Подготовка к загрузке: ' + capitalizeFirstLetter(modpack);
        ui.footer.p = `Ожидание ответа сервера${LOADING_SPAN}`;

        downloading = true;
        
        ui.main_button.state = 'download'
        let downloaded = modpackManager.downloadModpack(modpack);

        console.log(downloaded);
    } else if (ui.main_button.state == 'download') {        //. ПОСТАВИТЬ НА ПАУЗУ

        console.log(`${modpack} is downloading. pausing...`);
        ui.main_button.state = 'paused'
        modpackManager.downloader.pause();
    } else if (ui.main_button.state == 'paused') {          //. ВЕРНУТЬ НА ЗАГРУЗКУ

        console.log(`${modpack} is downloading. resuming...`);
        ui.footer.h1 = `Загрузка сборки ${capitalizeFirstLetter(modpack)}${LOADING_SPAN}`
        ui.main_button.state = 'download'
        modpackManager.downloader.resume();
    }
}

let last_received_bytes = 0;

ipcRenderer.on('download-started', (event, item) => {
    last_received_bytes = 0;
    ui.main_button.state = 'download';
    if (item == 'libs') {
        ui.footer.h1 = `Закрузка библиотек${LOADING_SPAN}`;
    } else {
        ui.footer.h1 = `Загрузка сборки: ${capitalizeFirstLetter(item)}${LOADING_SPAN}`;
    }
})

ipcRenderer.on('download-progress', (event, progress) => {
    let speed = (progress.received_size - last_received_bytes) / 1024 / 1024;
    ui.footer.p = `Скорость: ${speed.toPrecision(2)} Мб в секунду`;
    ui.footer.download_progress = progress.percent * 100;
    last_received_bytes = progress.received_size;
})

ipcRenderer.on('download-finished', (event) => {
    ui.footer.h1 = `Распаковка файлов${LOADING_SPAN}`;
    ui.footer.p = 'Это может занять некторое время.';

    ui.main_button.state = 'unzipping'

    downloading = false;
});

ipcRenderer.on('unzipping-finished', (event) => {
    ui.footer.h1 = `Удаление архива загрузки${LOADING_SPAN}`;
    ui.footer.p = 'Это может занять некторое время.';
})

ipcRenderer.on('moving-libs-start', async (event) => {
    ui.footer.h1 = `Перенос библиотек${LOADING_SPAN}`;
    ui.footer.p = 'Это может занять некторое время.';
})

ipcRenderer.on('moving-libs-progress', async (event, progress) => {
    ui.footer.h1 = `Перенос библиотек: ${(progress.percent).toFixed(1)}%${LOADING_SPAN}`;
    ui.footer.download_progress = progress.percent;
});

ipcRenderer.on('modpack-downloaded', async (event, modpack) => {
    console.log('aaaa');
    downloading = false;
    modpackManager.updateModpackDirs();
    ui.modpack = modpack;
    ui.footer.h1 = 'Выбрано: ' + capitalizeFirstLetter(modpack);
    ui.footer.p = 'Разработчик';
    ui.footer.download_in_progress = false;
    ui.can_select_modpack = true;
})

//#.region --- minecraft lifecycle ---

async function launchModpack(modpack_name: string) {
    let status = await modpackManager.launchModpack(modpack_name, 2, settingsInterface.settings.modpack_settings.allocated_memory, authInterface.logged_user.login, '123').catch(err => {
        console.error(err);
    });
    return status;
}

ipcRenderer.on('modpack-launched', (event, modpack_name) => {
    console.log(`[MODPACK] <${modpack_name}> modpack launched`);
    ui.can_select_modpack = true;
})

ipcRenderer.on('modpack-data', (event, {modpack_name, data}) => {
    console.log(`[MODPACK] <${modpack_name}> ${data}`);
})

ipcRenderer.on('modpack-exit', (event, {modpack_name, code, signal}) => {
    console.log(`[MODPACK] <${modpack_name}> modpack exited with code ${code} - ${signal}`);
    ui.updateMainButtonState();
})

ipcRenderer.on('modpack-error', (event, {modpack_name, error}) => {
    console.log(`[MODPACK] <${modpack_name}> ${error}`);
    ui.updateMainButtonState();
})

//#endregion