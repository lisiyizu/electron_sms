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
let history = {};
let mainWindow;
let ignoreNext = false;

let socket = new WebSocket(`wss://stream.pushbullet.com/subscribe/${config['access_token']}`);
socket.onmessage = (message) => {
    let data = JSON.parse(message.data);
    if (data.type === 'push' && data.push.type === 'sms_changed') {
        if (data.push.notifications.length == 0) {
            if(ignoreNext) {
                ignoreNext = false;
                return;
            }
            return request({
                uri: `${api_url}/v2/permanents/${config.device_iden}_threads`,
                headers: { 'Access-Token': config.access_token },
                json: true
            })
                .then((threads) => {
                    threads.threads.forEach((thread) => {
                        if(history[thread.id] && history[thread.id] < thread.latest.timestamp){
                            updateThread(thread.id, history[thread.id]);
                            history[thread.id] = thread.latest.timestamp;
                        } else if(!history[thread.id]) {
                            updateThread(thread.id, 0);
                            history[thread.id] = thread.latest.timestamp;
                        }
                    });
                })
                .catch((err) => {
                    console.log(err);
                });
        } else {
            updateThread(
                data.push.notifications[0].thread_id,
                data.push.notifications[0].timestamp,
                true
            );
            history[data.push.notifications[0].thread_id] = data.push.notifications[0].timestamp;
        }
    }
};

ipcMain.on('ignore_next', (event, ignore) => {
    ignoreNext = true;
    console.log('ignore');
})

app.on('ready', () => {
    mainWindow = new BrowserWindow({});
    mainWindow.maximize();
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'ui', 'html', 'index.html'),
        protocol: 'file:',
        slashes: true
    }));
    mainWindow.on('close', () => {
        app.quit();
    });

    if (process.env.NODE_ENV === 'production')
        mainWindow.setMenu(null); //For No menu

    //On startup update/find all texts
    updateMessages()
        .then((threads) => {
            return Thread.find({})
                .sort({ last_updated: -1 })
                .lean();
        })
        .then((threads) => {
            mainWindow.webContents.send('init:threads', threads);
            threads.forEach((thread) => {
                history[thread.pb_id] = thread.last_updated;
            })
        });
});

let updateMessages = () => {
    return request({
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
        .then((added) => {
            return added;
        });
};

let updateThread = (pb_id, timestamp, ignoreIncoming) => {
    let thread = {
        pb_id,
        last_updated: timestamp,
        messages: []
    };
    request({
        uri: `${api_url}/v2/permanents/${config.device_iden}_thread_${pb_id}`,
        headers: { 'Access-Token': config.access_token },
        json: true
    })
        .then((res) => {
            res.thread.every((message, index) => {
                if (message.timestamp >= timestamp) {
                    if (!message.recipient_index) {
                        message.recipient_index = 0;
                    }
                    if ((ignoreIncoming && message.direction == 'incoming') || !ignoreIncoming) {
                        thread.messages.push(message);
                        return false;
                    }
                }
            });
            return Thread.find({ pb_id: pb_id })
        })
        .then((threads) => {
            if (threads.length) {
                return { threads: threads };
            } else {
                return request({
                    uri: `${api_url}/v2/permanents/${config.device_iden}_threads`,
                    headers: { 'Access-Token': config.access_token },
                    json: true
                });
            }
        })
        .then((threads) => {
            threads.threads.every((conv, index) => {
                if (conv.id == pb_id || conv.pb_id == pb_id) {
                    thread.recipients = conv.recipients;
                    return false;
                }
            })
            mainWindow.webContents.send('sms_update', JSON.stringify(thread));
        })
        .catch((err) => {
            console.log(err);
        });
}