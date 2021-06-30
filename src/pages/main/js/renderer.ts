console.log('> [MAIN] hello from renderer :)');

enum sections {
    MAIN,
    NEWS,
    SETTINGS
}

let section: number = sections.MAIN; // Section by default

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
        section = sections.NEWS;
        openSection(sections.NEWS);
    });

    nav_elements[2].addEventListener('click', () => {
        section = sections.SETTINGS;
        openSection(sections.SETTINGS);
    });
} else console.log('> [MAIN]', 'cant find nav');

openSection(section);