const WebSocket = require('ws');
const debug = require('debug')('notify:socket');
const SocketClientService = require('./sockets/SocketClientService');

let deviceService;
const socketClientService = new SocketClientService();

const websocketServer = new WebSocket.Server({
  port: 9000,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
  }
});

websocketServer.on('connection', (websocket, req) => {
  websocket.retryCount = 0;
  let deviceName = decodeURI(req.url.substring(8)); // /socket/*

  if (deviceName && deviceName.length > 1) {
    deviceService.getDeviceWithName(deviceName).then(device => {
      socketClientService.addSocketClient(device, websocket);
      debug('Device %o connected via socket', device);
    }).catch(err => {
      debug('Error retriving device : %s', err);
      websocket.terminate();
    });
  } else {
    websocket.terminate();
  }

  websocket.on('pong', () => {
    websocket.retryCount = 0;

    let device = socketClientService.findDevice(websocket);
    if (device) {
      debug('pong from %s', device.name);
    } else {
      debug('pong from <<Unknown>>');
    }
  });

  websocket.on('message', (message) => {
    debug('received: %s', message);

    // let response = JSON.parse(message);
  });

  websocket.on('close', () => {
    let socketClient = socketClientService.deleteSocketClient(websocket);
    if (socketClient) {
      debug("Socket connection to %s closed", socketClient.device.name);
    } else {
      debug('null socketClient closed');
    }
  });
});

//Check socket connetion every 30 seconds. Terminate after 3 successive ping failure
const checkSocketConnection = setInterval(() => {
  socketClientService.getListOfSockets().forEach(socket => {
    if (socket.retryCount === 3) {
      return socket.terminate();
    }

    socket.retryCount = socket.retryCount + 1;
    socket.ping(() => {});
  });
}, 30 * 1000);


// callback: cb(err)
// if error is null, message sent to device
function sendToDeviceViaWebsocket(device, type, payload, cb) {

  if (!type) cb(new Error("'type' is required"));
  if (!payload) cb(new Error("'payload' is required"));

  let message = {
    type: type,
    payload: payload
  }

  let socketClient = socketClientService.findSocketClient(device.name);

  if (socketClient) {
    socketClient.socket.send(JSON.stringify(message), cb);
  } else {
    cb(new Error('No such device connected via websocket'));
  }
}

function isDeviceConnectedViaWebsocket(device) {
  let socketClient = socketClientService.findSocketClient(device.name);
  return socketClient ? true : false;
}

module.exports = (service) => {
  deviceService = service;

  return {
    sendToDeviceViaWebsocket: sendToDeviceViaWebsocket,
    isDeviceConnectedViaWebsocket: isDeviceConnectedViaWebsocket
  }
};