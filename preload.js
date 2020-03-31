window.addEventListener('DOMContentLoaded', () => {
    if (!!window && !(!!window.$)) {
        window.$ = window.jQuery = require('./js/jquery-3.4.1.min.js');
        require('./js/indigenous.js')
    }
});