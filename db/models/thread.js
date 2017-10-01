const mongoose = require('mongoose');
const _ = require('lodash');

let threadSchema = new mongoose.Schema({
    pb_id: {
        type: String,
        required: true,
        unique: true
    },
    last_updated: {
        type: Number,
        required: true
    },
    recipients: [
        {
            name: {
                type: String,
                required: true
            },
            address: {
                type: String,
                required: true
            },
            number: {
                type: String,
                required: true
            },
            image_url: {
                type: String,
                required: false
            }
        }
    ],
    messages: [{
        timestamp: {
            type: Number,
            required: true
        },
        direction: {
            type: String,
            required: true
        },
        recipient_index: {
            type: Number,
            required: true
        },
        body: {
            type: String
        },
        image_urls: []
    }]
});

let sortMessages = (a, b) => {
    return a.timestamp - b.timestamp;
};

threadSchema.methods.updateMessages = function(messages){
    let thread = this;
    let last_updated = thread.last_updated;
    let toAdd = [];
    messages = messages.sort(sortMessages);
    messages.forEach((message) => {
        if(message.timestamp > last_updated)
            last_updated = message.timestamp;
        let newMessage = {
            timestamp: message.timestamp,
            recipient_index: message.recipient_index ? message.recipient_index : 0,
            body: message.body,
            image_urls: message.image_urls ? message.image_urls : [],
            direction: message.direction
        };
        if(_.findIndex(thread.messages, newMessage) == -1)
            toAdd.push(newMessage);
    });
    thread.last_updated = last_updated;
    thread.messages = thread.messages.concat(toAdd);
    return thread.save()
        .then(() => {
            return {
                id: thread.pb_id,
                messages: toAdd,
                recipients: thread.recipients.toObject(),
                last_updated: thread.last_updated
            };
        });
};

threadSchema.statics.findOutdated = function(threads){
    let Thread = this;
    let promises = [];
    let finds = []
    threads.forEach((thread) => {
        finds.push(Thread.find({
            pb_id: thread.id
        })); 
    });
    return Promise.all(finds)
        .then((foundThreads) => {
            for(let idx = 0; idx < foundThreads.length; idx++) {
                let foundThread = foundThreads[idx];
                if (foundThread.length > 0) {
                    if(foundThread[0].last_updated < threads[idx].latest.timestamp)
                        promises.push(foundThread[0]);
                } else {
                    let foundThread = new Thread({
                        pb_id: threads[idx].id,
                        recipients: threads[idx].recipients,
                        last_updated: threads[idx].latest.timestamp
                    });
                    promises.push(foundThread.save());
                }
            }
            return Promise.all(promises);
        });
}

let Thread = mongoose.model('Thread', threadSchema);

module.exports = {
    Thread
};