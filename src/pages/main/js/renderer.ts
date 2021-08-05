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
//#endregion

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

enum sections {
    MAIN,
    SETTINGS,
    ACCOUNT,
}

class Overlay {
    public el = document.getElementById('overlay-thing') as HTMLDivElement
    public h1_el = this.el?.querySelector('h1') as HTMLParagraphElement;
    public p_el = this.el?.querySelector('p') as HTMLParagraphElement;

    public _visible = false;

    public set visible(to: boolean) {
        if (to) {
            this.el?.classList.add('open');
        } else {
            this.el?.classList.remove('open');
        }
        this._visible = to;
    }

    public get visible() { return this._visible; }

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

    public show(title?: string, p?: string) {
        if (title) this.h1 = title;
        if (p) this.p = p;
        this.visible = true;
    }

    public hide() {
        this.visible = false;
    }
}

class SelectOverlay {
    public el = document.getElementById('select-overlay-thing')
    public list_container = document.getElementById('select-overlay-list') as HTMLDivElement
    public h1_el = this.el?.querySelector('h1') as HTMLParagraphElement;

    public _visible = false;

    public set visible(to: boolean) {
        if (to) {
            this.el?.classList.add('open');
        } else {
            this.el?.classList.remove('open');
        }
        this._visible = to;
    }

    public get visible() { return this._visible; }

    public set h1(to: string) {
        if (this.h1_el) this.h1_el.innerText = to;
    }

    public get h1() {
        if (this.h1_el) return this.h1_el.innerText;
        return '';
    }

    public showSelect(title: string, options: {}) {
        return new Promise((resolve, reject) => {
            this.visible = true;

            this.h1 = title;

            this.list_container.innerHTML = '';
            let html = '';
            for (const option of Object.values(options)) { html += `<div class="el">${option}</div>` }
            this.list_container.innerHTML = html;

            for (let i = 0; i < Object.keys(options).length; i++) {
                this.list_container.children[i].addEventListener('click', () => {
                    console.log('selected', Object.values(options)[i]);
                    this.visible = false;
                    resolve(Object.keys(options)[i]);
                });
            }

            this.el?.addEventListener('click', e => {
                this.visible = false;
                reject('focus lost');
            });
        })
    }
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

    constructor (id: string) {
        this._locked = false;
        this._id = id;
        this._el = document.getElementById(id) as HTMLDivElement;
        this._state = 'selected';
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

class UI {
    private _header = document.getElementById('info-header');
    readonly _buttons: any = {
        magicae: new SelectButton('select-magicae'),
        fabrica: new SelectButton('select-fabrica'),
        statera: new SelectButton('select-statera'),
        insula: new SelectButton('select-insula'),
    };
    private _sub = document.getElementById('info-sub');

    public footer = new Footer();
    public select_overlay = new SelectOverlay();
    public overlay = new Overlay();
    public main_button = new MainButton();

    constructor () {
        async function updateModpackDirs() {
            (document.getElementById('libs-dir') as HTMLParagraphElement).innerText = await modpackManager.ensureLibsDir();
            (document.getElementById('magicae-dir') as HTMLParagraphElement).innerText = await modpackManager.ensureModpackDir('magicae');
            (document.getElementById('fabrica-dir') as HTMLParagraphElement).innerText = await modpackManager.ensureModpackDir('fabrica');
            (document.getElementById('statera-dir') as HTMLParagraphElement).innerText = await modpackManager.ensureModpackDir('statera');
            (document.getElementById('insula-dir') as HTMLParagraphElement).innerText = await modpackManager.ensureModpackDir('insula');
        };
        updateModpackDirs();

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
        })

        document.getElementById('change-bg')?.addEventListener('click', async () => {
            let options = {
                title : "Выберите задний фон", 
                filters :[
                    {name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif']},
                ],
                properties: ['openFile']
               }
               
            let file = await dialog.showOpenDialog(options)
            if (file.canceled) return;

            console.log(file.filePaths[0]);
            
            settingsInterface.bg = path.normalize(file.filePaths[0]);
            settingsInterface.save();
        })

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
        this._buttons[settingsInterface.settings.on_modpack].state = 'none';
        this._buttons[to].state = 'selected';
        if (modpackManager.modpacks[to].installed) {
            this.main_button.state = 'play';
        } else {
            this.main_button.state = 'install';
        }
        settingsInterface.settings.on_modpack = to;
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

let profile_picture_img = document.getElementById('profile-picture-img') as HTMLImageElement;
profile_picture_img.src = `http://localhost:3000/api/get/profile-picture?id=${authInterface.logged_user.id}`;

let profile_login_el = document.getElementById('profile-login-el') as HTMLHRElement;
profile_login_el.innerText = authInterface.logged_user.login;

//#region PLAY BUTTON -------------------------------

let auto_login = true;

let LOADING_SPAN = '<span class="loading"><p>.</p><p>.</p><p>.</p></span>';

let downloading = false;
async function main_button_click() {
    let modpack = ui.modpack;
    if (ui.main_button.state == 'play') {                   //. ЗАПУСТИТЬ

        ui.can_select_modpack = false;

        console.log(`${modpack} installed. launching...`);
        ui.overlay.show(`Запуск ${capitalizeFirstLetter(modpack)}...`, ' ')

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