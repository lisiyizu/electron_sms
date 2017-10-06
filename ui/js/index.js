const electron = require('electron');
const { ipcRenderer } = electron;
const $ = require('jquery');
const Mustache = require('mustache');
const moment = require('moment');

const userImage = '../images/user.png';
const usersImage = '../images/group.png';

var lastSelected, mainWindow, allThreads = {};
var mainContainer = $('.main-container');
var isLoading = true;

ipcRenderer.on('init:threads', function (event, threads) {
    threads.forEach(addConversation);
    setLoading(false);
    resetListeners();
    $('.conversation:first-child').click();
});

ipcRenderer.on('sms_update', function(event, thread) {
    thread = JSON.parse(thread);
    if(allThreads[thread.pb_id]) {
        var storedThread = allThreads[thread.pb_id];
        fillMessages(
            storedThread.recipients,
            thread.messages,
            $('.messages__container', storedThread.conversationContainer)
        );
    } else {
        addConversation(thread);
        resetListeners();
    }
    var from = thread.recipients[thread.messages[0].recipient_index].name;
    var preview = formatMessage(thread.messages[0]);
    var image = thread.recipients[thread.messages[0].recipient_index].image_url;
    
    createNotification({
        from: from,
        preview: preview,
        image: image ? image : userImage
    });
});

var addConversation = function(thread) {
    var conversationContainer = initConversation(thread);
    mainContainer.append(conversationContainer);
    allThreads[thread.pb_id] = {
        pb_id: thread.pb_id,
        recipients: thread.recipients,
        last_updated: thread.last_updated,
        conversationContainer: conversationContainer
    };
}

var setLoading = function (loading) {
    if (loading) {
        $('.loading').attr('hidden', false);
        $('.main-container').attr('hidden', true);
    } else {
        $('.loading').attr('hidden', true);
        $('.main-container').attr('hidden', false);
    }
    isLoading = loading;
}

var resetListeners = function () {
    $('.conversation').click(function () {
        if (lastSelected) {
            $(lastSelected).toggleClass('selected');
            $('#' + $(lastSelected).data('conversation')).attr('hidden', true);
        }
        lastSelected = this;
        $(this).toggleClass('selected');
        $(this).find('i').removeClass('fa-circle');
        var conversation = $('#' + $(this).data('conversation'));
        conversation.attr('hidden', false);
        $('.messages__container', conversation)
            .scrollTop($('.messages__container', conversation)[0].scrollHeight);
    });

    $('.sms__form').on('submit', function(event) {
        event.preventDefault();
        var sendingSMS = $('.sending__sms');
        var messageInput = $(this).find('[name=message]');
        sendingSMS.show();
        var messageText = messageInput.val();
        var pb_id = getCurrentPBID();
        if(pb_id) {
            $('.fa-exclamation-circle', allThreads[pb_id].conversationContainer).hide();                    
            var container = $('.messages__container',allThreads[pb_id].conversationContainer);            
            sendText(allThreads[pb_id].recipients, messageText)
                .then((res) => {
                    sendingSMS.hide();
                    messageInput.val('');
                    ipcRenderer.send('ignore_next', true);
                    var message = {
                        body: messageText,
                        timestamp: Date.now() / 1000
                    };
                    var toAdd = createOutgoingMessage(message);
                    addMessageToContainer(container, message.timestamp, toAdd);
                    updatePreview(message, container.parent().attr('id'));
                    autoScroll(container);
                })
                .catch((err) => {
                    sendingSMS.hide();
                    $('.fa-exclamation-circle', allThreads[pb_id].conversationContainer).show();
                })
        } else {
            ;
        }
    })
}

var getCurrentPBID = function() {
    if(lastSelected) {
        var idx = $(lastSelected).data('conversation').indexOf('_');
        return idx == -1 ? undefined : $(lastSelected).data('conversation').substr(0, idx);
    } else {
        return undefined;
    }
};

var initConversation = function (thread) {
    addConversationSelector(thread);
    return createConversationContainer(thread);
};

var createConversationContainer = function (thread) {
    var conversationContainer = $('#thread__template').html();
    mainContainer.append(Mustache.render(conversationContainer, { pb_id: thread.pb_id }));
    conversationContainer = $('#' + thread.pb_id + '__conversation');

    $('.recipients__container', conversationContainer).html(makeRecipientsList(thread.recipients));

    var messagesContainer = $('.messages__container', conversationContainer);
    fillMessages(thread.recipients, thread.messages, messagesContainer);

    return conversationContainer;
}

var fillMessages = function (recipients, messages, container, move) {
    messages.forEach(function (message) {
        if (message.direction === "incoming") {
            if (message.image_urls) {
                message.image_urls.forEach(function (url) {
                    var toAdd = createIncomingImage(url, recipients, message);
                    if(addMessageToContainer(container, message.timestamp, toAdd)) {
                        updatePreview(message, container.parent().attr('id'));
                        autoScroll(container);                        
                    }
                });
            }
            if (message.body) {
                var toAdd = createIncomingMessage(recipients, message);
                if(addMessageToContainer(container, message.timestamp, toAdd)) {
                    updatePreview(message, container.parent().attr('id'));
                    autoScroll(container);                    
                }
            }
        } else {
            if (message.image_urls) {
                message.image_urls.forEach(function (url) {
                    var toAdd = createOutgoingImage(url, message);
                    if(addMessageToContainer(container, message.timestamp, toAdd)) {
                        updatePreview(message, container.parent().attr('id'));
                        autoScroll(container);
                    }
                });
            }
            if (message.body) {
                var toAdd = createOutgoingMessage(message);
                if(addMessageToContainer(container, message.timestamp, toAdd)) {
                    updatePreview(message, container.parent().attr('id'));
                    autoScroll(container);
                }
            }
        }
    });
};

var formatTime = function(seconds) { 
    if ((Date.now() / 1000) - seconds < 86400) {
        return moment.unix(seconds).format('LT');
    } else {
        return moment.unix(seconds).format('M/D/YY');
    }
};

var formatMessage = function(message) {
    if (message.body) {
        return twemoji.parse(escapeHTML(message.body));
    } else if (message.image_urls && message.image_urls.length) {
        if (message.direction == 'incoming')
            return 'You recieved a picture';
        else
            return 'You sent a picture';
    } else {
        return '';
    }
};

var escapeHTML = function (string) {
    var entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
};

var updatePreview = function(message, id) {
    var preview = $("[data-conversation="+id+"]");
    $('.time', preview).text(formatTime(message.timestamp));
    $('.message__preview', preview).html(formatMessage(message));
    if(!isLoading && !preview.is(':first-child')) {
        var container = preview.parent();
        preview.hide().prependTo(container).show('slow');   
    }
    if(!isLoading && !preview.hasClass('selected')) {
        preview.find('i').addClass('fa-circle');
    }
};

var addMessageToContainer = function (container, timestamp, element) {
    var currentMessages = $('.text__container', container);
    var added = false;
    currentMessages.each(function () {
        if ($(this).data('timestamp') > timestamp) {
            $(element).insertBefore($(this));
            added = true;
            return false; //break
        }
    });
    if (!added) {
        container.append(element)
    }
    return !added;
}

var createIncomingImage = function (url, recipients, message) {
    var mmsTemplate = $('#image__from').html();

    return Mustache.render(mmsTemplate, {
        image_src: url,
        sender: recipients.length > 1 ? recipients[message.recipient_index].name : "",
        timestamp: message.timestamp
    });
};

var createOutgoingImage = function (url, message) {
    var mmsTemplate = $('#image__to').html();
    return Mustache.render(mmsTemplate, { image_src: url, timestamp: message.timestamp });
};

var makeRecipientsList = function (recipients) {
    var recipientNames = "";
    var index = 1;
    recipients.forEach(function (recipient) {
        var image = (recipient.image_url) ? recipient.image_url : userImage;
        var iconTemplate = $('#recipient__image__template').html();
        var icon = Mustache.render(iconTemplate, { image_src: image });
        recipientNames += icon + recipient.name;
        if (index++ < recipients.length) { recipientNames += ', '; }
    });
    return recipientNames;
}

var createOutgoingMessage = function (message) {
    var messageTemplate = $('#message__to').html();
    return twemoji.parse(Mustache.render(messageTemplate, {
        message: message.body,
        timestamp: message.timestamp
    }));
}

var createIncomingMessage = function (recipients, message) {
    var messageTemplate = $('#message__from').html();
    return twemoji.parse(Mustache.render(messageTemplate, {
        message: message.body,
        sender: (recipients.length > 1) ? recipients[message.recipient_index].name : "",
        timestamp: message.timestamp
    }));
};

var addConversationSelector = function (thread) {
    var selectorTemplate = $('#conversation__template').html();

    if (thread.recipients.length > 1) {
        var image = usersImage;
    } else if (thread.recipients[0].image_url) {
        var image = thread.recipients[0].image_url;
    } else {
        var image = userImage;
    }

    var message = thread.messages[thread.messages.length - 1];

    var selector = Mustache.render(selectorTemplate, {
        pb_id: thread.pb_id,
        image: image,
        last_updated: formatTime(thread.last_updated),
        names: joinRecipients(thread.recipients),
        message: formatMessage(message)
    });

    $('.conversations__list').append(selector);
}

var joinRecipients = function (recipients, char) {
    if (!char) { char = ', '; }
    if (recipients.length == 0) { return ""; }

    var string = recipients[0].name;

    for (var idx = 1; idx < recipients.length; idx++) {
        string += char + recipients[idx].name;
    }

    return string;
};

var autoScroll = function(container) {
    if(isLoading) { return; }
    var newMessage = container.last();

    var clientHeight = container.prop('clientHeight');
    var scrollTop = container.prop('scrollTop');
    var scrollHeight = container.prop('scrollHeight');
    var newMessageHeight = newMessage.innerHeight();
    var lastMessageHeight = newMessage.prev().innerHeight();

    if(clientHeight + scrollTop + newMessageHeight + lastMessageHeight >= scrollHeight) {
        container.animate({scrollTop:scrollHeight});
    }
};