const electron = require('electron');
const { ipcRenderer } = electron;
const $ = require('jquery');
const Mustache = require('mustache');
const moment = require('moment');

const userImage = '../images/user.png';
const usersImage = '../images/users.png';

var lastSelected, mainWindow, allThreads = {};
var mainContainer = $('.main-container');


ipcRenderer.on('init:threads', function (event, threads) {
    threads.forEach(function (thread) {
        var conversationContainer = initConversation(thread);
        mainContainer.append(conversationContainer);
        allThreads[thread.pb_id] = {
            pb_id: thread.pb_id,
            recipients: thread.recipients,
            last_updated: thread.last_updated,
            conversationContainer: conversationContainer
        };
    })
    setLoading(false);
    resetListeners();
    $('.conversation:first-child').click();
});

var setLoading = function (isLoading) {
    if (isLoading) {
        $('.loading').attr('hidden', false);
        $('.main-container').attr('hidden', true);
    } else {
        $('.loading').attr('hidden', true);
        $('.main-container').attr('hidden', false);
    }
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
}

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
    messagesContainer.scrollTop(messagesContainer[0].scrollHeight);
    return conversationContainer;
}

var fillMessages = function (recipients, messages, container) {
    messages.forEach(function (message) {
        if (message.direction === "incoming") {
            container.append(createIncomingMessage(recipients, message));
        } else {
            container.append(createOutgoingMessage(message));
        }
    });
}

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
    return Mustache.render(messageTemplate, { message: message.body });
}

var createIncomingMessage = function (recipients, message) {
    var messageTemplate = $('#message__from').html();
    return Mustache.render(messageTemplate, {
        message: message.body,
        sender: (recipients.length > 1) ? recipients[message.recipient_index].name : ""
    });
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

    if((Date.now() / 1000) - thread.last_updated < 86400) {
        var last_updated = moment.unix(thread.last_updated).format('LT');
    } else {
        var last_updated = moment.unix(thread.last_updated).format('M/D/YY');
    }

    var selector = Mustache.render(selectorTemplate, {
        pb_id: thread.pb_id,
        image: image,
        last_updated: last_updated,
        names: joinRecipients(thread.recipients),
        message: thread.messages[thread.messages.length - 1].body
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
} 