const request = require('request-promise');
//const $ = require('jquery');
const base64 = require('base-64');
const utf8 = require('utf8');

const config = require('./../../config/config.json');

const api_url = 'https://api.pushbullet.com';

var sendText = function(recipients, message, fileURL) {
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
};

var uploadLocalImage = function(file) {
    requestUpload(file.name, file.type)
        .then((uploadData) => {
            return uploadFile(uploadData, file);
        })
        .then((res) => {
            console.log(res);
        })
        .catch((err) => {
            console.log(err);
        });
};

var uploadImageURL = function(url) {
    request({
        uri: url,
        resolveWithFullResponse: true,
    })
        .then((res) => {
            console.log(res);
            console.log(res.body);
            //console.log(base64.encode(utf8.encode(res.body)));
            // $('.main-container').append(img)
            // let file = new File([res], "test.jpg");
            // console.log(file);
        });

};

var requestUpload = function(name, type) {
    return request({
        uri: api_url + '/v2/upload-request',
        headers: {'Access-Token': config.access_token},
        body: {
            file_name: name,
            file_type: type
        },
        method: 'POST',
        json: true
    });
};

var uploadFile = function(requestData, file) {
    requestData.data.file = file;
    return request({
        method: 'POST',
        uri: requestData.upload_url,
        formData: requestData.data
    });
};