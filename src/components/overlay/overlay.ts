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

    public show(title?: string, p?: string, loading=false) {
        if (title) this.h1 = title;
        if (p) this.p = p;
        if (loading) this.el.classList.add('ld');
        this.visible = true;
    }

    public hide() {
        this.el.classList.remove('ld');
        this.p = '';
        this.h1 = '';
        this.visible = false;
    }
}

class SelectOverlay extends Overlay {
    public el = document.getElementById('select-overlay-thing') as HTMLDivElement
    public list_container = document.getElementById('select-overlay-list') as HTMLDivElement
    public h1_el = this.el?.querySelector('h1') as HTMLParagraphElement;

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

class AskOverlay extends Overlay {
    el = document.getElementById('ask-overlay-thing') as HTMLDivElement
    list_container = document.getElementById('ask-overlay-list') as HTMLDivElement
    h1_el = this.el?.querySelector('h1') as HTMLParagraphElement;
    p_el = this.el?.querySelector('p') as HTMLParagraphElement;

    public showSelect(title: string, options: {}, p?:string) {
        return new Promise((resolve, reject) => {
            this.show(title, p);

            this.list_container.innerHTML = '';
            let html = '';
            for (const option of Object.values(options)) { html += `<div class="button${!(option as any).type ? '' : ' ' + (option as any).type}">${(option as any).body}</div>` }
            this.list_container.innerHTML = html;

            for (let i = 0; i < Object.keys(options).length; i++) {
                this.list_container.children[i].addEventListener('click', () => {
                    console.log('selected', Object.keys(options)[i]);
                    this.hide();
                    resolve(Object.keys(options)[i]);
                });
            }

            this.el?.addEventListener('click', e => {
                this.hide();
                reject('focus lost');
            });
        })
    }
}

export {
    Overlay,
    SelectOverlay,
    AskOverlay
}