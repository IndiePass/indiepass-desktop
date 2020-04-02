window.addEventListener('DOMContentLoaded', () => {
    if (!!window && !(!!window.$)) {
        window.$ = window.jQuery = require('jquery');
        require ('tooltipster');
        require('./js/indigenous.js')
    }
});