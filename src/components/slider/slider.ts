class Slider {
    el: HTMLDivElement;
    input: HTMLInputElement;

    id: string;
    min: number;
    max: number;
    step: number;
    unit: string;
    step_values: string[];
    free: boolean;
    value_step: number;

    max_val: number;
    min_val: number;

    focused: boolean;

    private _index = 0;

    constructor (slider: HTMLDivElement, value?: number, min?: number, max?:number, value_step?: number) { 
        this.el = slider;

        this.id = slider.id;
        this.min = min || parseInt(slider.dataset.min as string);
        this.max = max || parseInt(slider.dataset.max as string);
        this.step = parseInt(slider.dataset.step as string) || -1;
        this.unit = (slider.dataset.unit as string) || '';
        this.value_step = value_step || parseInt(slider.dataset.spread as string) || 1;
        this.step_values = (slider.dataset.values as string || '').toString().split(';');
        this.free = slider.dataset.free == 'true'

        this.max_val = this.max;
        this.min_val = this.min;

        this.focused = false;

        let html = `
            <input min="${this.min}" max="${this.max}" ${this.step > 0 ? 'step="' + this.step + '"' : 'step="1"'} type="range" name="${this.id}-input" id="${this.id}-input">
            <div class="stops">
        `;

        if (this.free) {
            html += `
                <div class="stop only-value">
                    <div class="value">
                        ${this.min}${this.unit}
                    </div>
                    <div></div>
                </div>
                <div class="stop only-value">
                    <div class="value">
                        ${this.max}${this.unit}
                    </div>
                    <div></div>
                </div>
                <div class="stop pointer" style="position: absolute;">
                    <div></div>
                    <div class="value">
                        ${this.min}${this.unit}
                    </div>
                </div>
            `;
        } else {
            let j = 0;
            if (this.step_values.length > 1) {
                for (let i = this.min; i <= this.max; i += this.step) {
                    if (j % this.value_step == 0) {
                        html += `
                            <div class="stop">
                                <div class="line"></div>
                                <div class="value">
                                    ${this.step_values[j]}
                                </div>
                            </div>
                        `
                    } else {
                        html += `
                            <div class="stop empty">
                                <div class="line"></div>
                            </div>
                        `
                    }
                    j++;
                }
            } else {
                for (let i = this.min; i <= this.max; i += this.step) {
                    if (j % this.value_step == 0) {
                        html += `
                            <div class="stop">
                                <div class="line"></div>
                                <div class="value">
                                    ${i}${this.unit}
                                </div>
                            </div>
                        `
                    } else {
                        html += `
                            <div class="stop empty">
                                <div class="line"></div>
                            </div>
                        `
                    }
                    j++;
                }
            }
        }

        html += `</div>`
        slider.innerHTML = html;

        let slider_input = slider.children[0] as HTMLInputElement;
        this.input = slider_input;

        if (value != undefined) this.value = value;        

        if (!this.free) {
            this._index = (parseInt(slider_input.value) - this.min) / this.step;
            slider_input.addEventListener('input', () => {
                this.value = Math.min(Math.max(this.min_val, this.value), this.max_val);
                slider.children[1].children[this._index].classList.remove('active');
                this._index = (parseInt(slider_input.value) - this.min) / this.step;
                slider.children[1].children[this._index].classList.add('active');
            });

            this.el.children[1].children[(parseInt(this.input.value) - this.min) / this.step].classList.add('active');
        } else {
            let pointer = slider.children[1].children[2] as HTMLDivElement;
            slider_input.addEventListener('input', () => {
                this.value = Math.min(Math.max(this.min_val, this.value), this.max_val);
                pointer.style.left = `${(parseFloat(slider_input.value) / this.max) * slider.clientWidth}px`;
                pointer.children[1].innerHTML = `${slider_input.value}${this.unit}`;
            });

            pointer.style.left = `${(parseFloat(slider_input.value) / this.max) * slider.clientWidth}px`;
            pointer.children[1].innerHTML = `${slider_input.value}${this.unit}`;
        }
        slider_input.onmouseenter = () => {
            this.focused = true;
        }
        slider_input.onmouseleave = () => {
            this.focused = false;
        }
    }

    public set value(to: number) {
        this.input.value = to.toString();

        if (!this.free) {
            this.el.children[1].children[this._index].classList.remove('active');
            this._index = (parseInt(this.input.value) - this.min) / this.step;
            this.el.children[1].children[this._index].classList.add('active');
        } else {
            let pointer = this.el.children[1].children[2] as HTMLDivElement;
            pointer.style.left = `${(parseFloat(this.input.value) / this.max) * this.el.clientWidth}$xp`;
            pointer.children[1].innerHTML = `${this.input.value}${this.unit}`;
        }
    }

    public get value() {
        return parseFloat(this.input.value);
    }

    public set oninput(to: any) {
        this.input.oninput = to;
    }

    public set onchange(to: any) {
        this.input.onchange = to;
    }

    public update() {
        if (this.input.oninput) this.input.oninput(new Event('input'));
        if (this.input.onchange) this.input.onchange(new Event('change'));
    }
}

export default Slider;