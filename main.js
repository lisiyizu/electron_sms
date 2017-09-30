const electron = require('electron')
const WebSocket = require('ws');
const config = require('./config/config.json');

const {app, BrowswerWindow, Main, ipcMain} = electron;

let socket = new WebSocket(`wss://stream.pushbullet.com/websocket/${config['access-token']}`);
socket.onmessage = (message) => {
    console.log(message.data);
};