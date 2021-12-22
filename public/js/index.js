'use strict';
var notify = $.notify('<strong>Loading</strong> page Do not close this page...', {
    type: 'theme',
    allow_dismiss: true,
    delay: 2000,
    // showProgressbar: true,
    timer: 300
});

setTimeout(function() {
    notify.update('message', '<strong>Loading</strong> Inner Data.');
}, 1000);

window.alert("dffffff")