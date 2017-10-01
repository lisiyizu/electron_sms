const electron = require('electron')
const WebSocket = require('ws');
const request = require('request-promise');
const url = require('url');
const path = require('path');

const config = require('./config/config.json');
const { app, BrowserWindow, Main, ipcMain } = electron;
const { mongoose } = require('./db/mongoose');
const { Thread } = require('./db/models/thread');

const api_url = 'https://api.pushbullet.com';
/*
let socket = new WebSocket(`wss://stream.pushbullet.com/websocket/${config['access_token']}`);
socket.onmessage = (message) => {
    let data = JSON.parse(message.data);
    if(data.type === 'push' && data.push.type === 'sms_changed') {
        let thread_id = data.push.notifications[0].thread_id;
        request({
            url: api_url + `/v2/permanents/${config.device_iden}_thread_${thread_id}`,
            headers: {'Access-Token': config.access_token}
        }, (err, res, body) => {
            if(!err) {
                Thread.find({pb_id: thread_id})
                    .then((thread) => {
                        if(thread) {
                            return thread.updateMessages(JSON.parse(body));
                        }
                    })
                    .then((thread_data) => {
                        if(thread_data){
                            console.log(thread_data);
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                    })
            }
        });
    }
};*/

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({});
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));
    mainWindow.on('close', () => {
        app.quit();
    });

    mainWindow.setMenu(null); //For No menu

    //On startup update/find all texts
    request({
        uri: `${api_url}/v2/permanents/${config.device_iden}_threads`,
        headers: { 'Access-Token': config.access_token },
        json: true
    })
        .then((res) => {
            return Thread.findOutdated(res.threads);
        })
        .then((threads) => {
            let promises = [];
            threads.forEach((thread) => {
                promises.push(request({
                    uri: api_url + `/v2/permanents/${config.device_iden}_thread_${thread.pb_id}`,
                    headers: { 'Access-Token': config.access_token },
                    json: true
                }).then((messages) => {
                    return thread.updateMessages(messages.thread);
                }));
            });
            return Promise.all(promises)
        })
        .then(() => {
            return Thread.find({});
        })
        .then((threads) => {
            console.log(threads);
        })
});