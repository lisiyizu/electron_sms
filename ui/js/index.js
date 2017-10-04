const electron = require('electron');
const {ipcRenderer} = electron;
const $ = require('jquery');

ipcRenderer.on('init:threads', function(event, threads){
    let mainContents = $('.main-container');
    setLoading(false);
});

let setLoading = function(isLoading) {
    if(isLoading) {
        $('.loading').attr('hidden', false);
        $('.main-container').attr('hidden', true);
    } else {
        $('.loading').attr('hidden', true);
        $('.main-container').attr('hidden', false);
    }
}

let lastSelected;

$('.conversation').click(function() {
    if(lastSelected) { $(lastSelected).toggleClass('selected'); }
    lastSelected = this;
    $(this).toggleClass('selected');
})