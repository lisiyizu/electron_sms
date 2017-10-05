if('Notification' in window) {
    if(Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

var focused = true;

window.onfocus = function() {
    focused = true;
};

window.onblur = function() {
    focused = false;
};

var createNotification = function(message) {
    if(
        'Notification' in window && 
        Notification.permission === 'granted' &&
        !focused
    ) {
        var n = new Notification(message.from, {
            body: message.preview,
            icon: message.image
        });
        setTimeout(n.close.bind(n), 3000);
    }
};