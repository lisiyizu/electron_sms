const request = require('request-promise');
//const $ = require('jquery');

const config = require('./../../config/config.json');

const api_url = 'https://api.pushbullet.com';

var sendText = function(recipients, message) {
    var addresses = [];
    recipients.forEach(function(recipient) {
        addresses.push(recipient.address);
    });
    return request({
        uri: api_url + '/v3/create-text',
        headers: {'Authorization': "Basic " + config.api_key_base64},
        method: 'POST',
        body: {
            data: {
                addresses: addresses,
                target_device_iden: config.device_iden,
                message: message
            }
        },
        json: true
    });
}