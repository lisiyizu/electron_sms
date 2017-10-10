const mongoose = require('mongoose');

let contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true,
        unique: true
    },
    image_url: {
        type: String,
        required: false
    }
});

let Contact = mongoose.model('Contact', contactSchema);

module.exports = {
    Contact
};