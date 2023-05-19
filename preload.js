window.addEventListener('DOMContentLoaded', () => {
    if (!!window && !(!!window.$)) {
        window.$ = window.jQuery = require('jquery');
        require ('tooltipster');
        require('mousetrap');
        require('is-in-viewport');
        require('magnific-popup');
        require('pace-js');
        require('./js/app.js');
        require('./js/jquery-ui.min.js')
    }
});