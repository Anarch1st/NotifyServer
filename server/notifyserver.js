const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const http = require('http');
const app = express();
const httpServer = http.createServer(app);
const request = require('request');
const WebSocket = require('ws');
const debug = require('debug')('notify:server');
const NotificationService = require('./notification/NotificationService');
const DeviceService = require('./device/DeviceService');
const SocketClientService = require('./sockets/SocketClientService');
const serviceAccount = require('../private/waspserver-firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://waspserver-saii.firebaseio.com"
});

const notificationService = new NotificationService();
const deviceService = new DeviceService();
const socketClientService = new SocketClientService();

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

if (process.env.NODE_ENV === 'production') {
  app.use('/', express.static(path.join(__dirname, '../public/build/default')));
} else {
  app.use('/', express.static(path.join(__dirname, '../public/build/dev')));
}
app.get('/register', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../public/build/default/index.html'));
  } else {
    res.sendFile(path.join(__dirname, '../public/build/dev/index.html'));
  }
});

app.post('/register', function (req, res) {
  const source = req.body.source;
  const token = req.body.token;

  deviceService.addOrUpdateDevice(source, token).then(device => {
    if (device) {
      res.status(200);
      res.send(device);
    } else {
      res.status(500);
    }
    res.end();
  }).catch(err => {
    debug('Registration error %O', err);
    res.status(500);
    res.end();
  });
});

app.get('/list', (req, res) => {
  if (req.headers.user && req.headers.user !== "false") {
    deviceService.getAllDeviceNames().then(devices => {
      res.send(devices);
    }).catch(err => {
      debug('Error populating all devices %O', err);
      res.status(500);
      res.end();
    });
  } else {
    res.status(401);
    res.end();
  }
});

app.post('/*', function (req, res) {
  const target = decodeURI(req.url.substring(1));

  const {
    title,
    body,
    source
  } = req.body;

  sendNotificationToDevice(title, body, source, target, res);
});

app.get('/*', (req, res) => {
  const target = decodeURI(req.path.substring(1));

  const {
    title,
    body,
    source
  } = req.query;

  sendNotificationToDevice(title, body, source, target, res);
})

function sendNotificationToDevice(title, body, source, target, res) {
  deviceService.getDeviceWithName(target).then(device => {
    notificationService.saveNotification(title, body, source, target).then(notification => {
      let socketClient = socketClientService.findSocketClient(device.name);
      if (socketClient) {
        sendNotificationViaWebsocket(socketClient, notification, res);
      } else if (device.token) {
        sendNotificationViaFCM(device, notification, res);
      } else {
        res.send('No fcm token or websocket present');
      }
    }).catch(err => {
      debug('Error saving notification: %O', err);
      res.status(500);
      res.end();
    });
  }).catch(err => {
    debug('Error retriving device: %O', err);
    res.status(500);
    res.end();
  });
};

function sendNotificationViaFCM(device, notification, res) {
  const message = {
    token: device.token,
    notification: {
      title: notification.title,
      body: notification.message
    },
    android: {
      ttl: 60 * 1000 //1 min
    },
    webpush: {
      headers: {
        TTL: '60'
      }
    }
  };

  admin.messaging().send(message).then(response => {
    notification.response = response;
  }).catch(error => {
    notification.response = error.code;
  }).finally(() => {
    res.send(notification);
    notificationService.updateNotification(notification).catch(err => {
      debug('Error updating notification %O', err);
    });
  });
}

function sendNotificationViaWebsocket(socketClient, notification, res) {
  let message = {
    type: 'Notification',
    payload: notification
  }
  socketClient.socket.send(JSON.stringify(message), (err) => {
    if (err) {
      debug('Socket send error %s', err);
      notification.response = err;
    } else {
      notification.response = 'Notification sent via websocket';
      debug(notification.response);
    }

    res.send(notification);
    notificationService.updateNotification(notification).catch(err => {
      debug('Error updating notification %s', err);
    });
  });
}

httpServer.listen(process.env.PORT || 8020, function () {
  console.log("Server started on port: " + httpServer.address().port);
});


// WebSocket Connection
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