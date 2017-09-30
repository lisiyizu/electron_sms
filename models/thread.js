const mongoose = require('mongoose');

let Thread = mongoose.model('Thread', {
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
        recipient_index: {
            type: Number,
            required: true
        },
        body: {
            type: String,
            required: true
        },
        image_urls: []
    }]
})