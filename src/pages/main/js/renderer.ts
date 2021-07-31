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
declare let shell: any;
declare let path: any;
declare let dialog: any;
declare let CapitalizeFirstLetter: Function;
declare let version: string;
//#endregion

//@ts-expect-error
onbeforeload();
console.log('hello from renderer :)');

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
                this.list_container.style.display = 'none';
                reject('focus lost');
            });
        })
    }
}

class MainButton {
    public el = document.getElementById('main-button') as HTMLDivElement
    public h1_el = this.el?.querySelector('h1');
    public p_el = this.el?.querySelector('p');

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

    public notInstalled() {

    }

    public installed() {

    }
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

class Footer {
    public el = document.getElementById('footer-bar') as HTMLDivElement;
    public h1_el = this.el?.querySelector('h1') as HTMLParagraphElement;
    public p_el = this.el?.querySelector('p') as HTMLParagraphElement;
    public _download_in_progress = false;
    public _download_progress = 0;

    constructor () {

    }

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
}

class UI {
    private _header = document.getElementById('info-header');
    private _buttons: any;
    private _sub = document.getElementById('info-sub');

    private footer = new Footer();
    private main_button = new MainButton();
    private select_overlay = new SelectOverlay();
    private overlay = new Overlay();

    constructor () {
        this._buttons = {...this._buttons, magicae: new SelectButton('select-magicae')};
        this._buttons = {...this._buttons, fabrica: new SelectButton('select-fabrica')};
        this._buttons = {...this._buttons, statera: new SelectButton('select-statera')};
        this._buttons = {...this._buttons, insula: new SelectButton('select-insula')};

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
            
            settingsInterface.settings.modpacks[modpack].path = path.normalize(file.filePaths[0]);
            settingsInterface.save();
            modpackManager.updateDirs();
            updateModpackDirs();
        }

        (document.getElementById('libs-dir') as HTMLParagraphElement).addEventListener('click', async () => {
            await showSelectModpack('libs');
        });

        this.main_button.el.onclick = () => {
            // this.overlay.show('привет', 'пидор');
            // this.footer.download_in_progress = true;
            // this.footer.download_progress = 75;
            // setTimeout(() => {
            //     this.footer.download_in_progress = false;
            //     this.overlay.hide();
            // }, 1000)
        }

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

            let selected = await this.select_overlay.showSelect('Выберите аккаунт', users);
            if (selected == authInterface.logged_user.id) return;
            if (selected != -1) {
                authInterface.switchUser(selected);
            } else {
                authInterface.logout();
            }
        });

        document.getElementById('open-themes-folder')?.addEventListener('click', () => {
            if (settingsInterface._themes_path) shell.openPath(path.normalize(settingsInterface._themes_path));
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
    }

    public get modpack() {
        return settingsInterface.settings.on_modpack
    }

    public set modpack(to) {
        this._buttons[settingsInterface.settings.on_modpack].state = 'none';
        this._buttons[to].state = 'selected';
        if (modpackManager.modpacks[to].installed) {
            this.main_button.h1 = 'Играть';
        } else {
            this.main_button.h1 = 'Скачать';
        }
        settingsInterface.settings.on_modpack = to;
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
} else console.log('> [MAIN]', 'cant find nav');

openSection(section);

//#endregion
//#region footer
document.getElementById('select-magicae')?.addEventListener('click', () => {
    ui.modpack = 'magicae';
    ui.footer_h = `Выбрано: Magicae`;
    settingsInterface.save();
});

document.getElementById('select-fabrica')?.addEventListener('click', () => {
    ui.modpack = 'fabrica';
    ui.footer_h = `Выбрано: Fabrica`;
    settingsInterface.save();
});

document.getElementById('select-statera')?.addEventListener('click', () => {
    ui.modpack = 'statera';
    ui.footer_h = `Выбрано: Statera`;
    settingsInterface.save();
});

document.getElementById('select-insula')?.addEventListener('click', () => {
    ui.modpack = 'insula';
    ui.footer_h = `Выбрано: Insula`;
    settingsInterface.save();
});

ui.footer_h = `Выбрано: ${CapitalizeFirstLetter(ui.modpack)}`;
//#endregion

let profile_picture_img = document.getElementById('profile-picture-img') as HTMLImageElement;
profile_picture_img.src = `http://localhost:3000/api/get/profile-picture?id=${authInterface.logged_user.id}`;

let profile_login_el = document.getElementById('profile-login-el') as HTMLHRElement;
profile_login_el.innerText = authInterface.logged_user.login;