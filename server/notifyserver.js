const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const http = require('http');
const app = express();
const httpServer = http.createServer(app);
const request = require('request');
const debug = require('debug')('notify:server');
const NotificationService = require('./notification/NotificationService');
const DeviceService = require('./device/DeviceService');
const serviceAccount = require('../private/waspserver-firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://waspserver-saii.firebaseio.com"
});

const notificationService = new NotificationService();
const deviceService = new DeviceService();
const WebsocketServer = require('./websocketServer.js')(deviceService);

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

app.post('/socket/*', (req, res) => {
  const target = decodeURI(req.url.substring(8));
  const {
    type,
    payload
  } = req.body;

  if (!(type && payload)) {
    res.status(500);
    res.send("'type' and 'payload' must be set");
    res.end();
    return;
  }

  deviceService.getDeviceWithName(target).then(device => {
    sendViaWebsocket(device, type, payload).then(() => {
      debug('Successfully sent %s to %s', type, device.name);
      res.status(200);
      res.end();
    }).catch(e => {
      debug('Error occured while sending via websocket');
      debug('%O', e);
      res.status(500);
      res.send('Error while sending via websocket');
    });
  }).catch(err => {
    debug('Error retriving device: %O', err);
    res.status(500);
    res.end();
  });
});

app.post('/*', function (req, res) {
  const target = decodeURI(req.url.substring(1));

  const {
    title,
    body,
    source
  } = req.body;

  sendNotificationToDevice(title, body, source, target).then(notification => {
    res.send(notification);
  }).catch(err => {
    debug('Internal error while sending notification');
    debug('%O', err)
    res.status(500);
    res.send();
  });
});

app.get('/*', (req, res) => {
  const target = decodeURI(req.path.substring(1));

  const {
    title,
    body,
    source
  } = req.query;

  sendNotificationToDevice(title, body, source, target).then(notification => {
    res.send(notification);
  }).catch(err => {
    debug('Internal error while sending notification');
    debug('%O', err);
    res.status(500);
    res.send();
  });
})

async function sendNotificationToDevice(title, body, source, target) {

  let device = await deviceService.getDeviceWithName(target);
  let notification = await notificationService.saveNotification(title, body, source, target);

  let resp = await sendViaWebsocket(device, 'Notification', notification);
  debug('Sending via websocket status: %s', resp.success);

  if (resp.success === false) {
    resp = await sendNotificationViaFCM(device, notification);
    debug('Sending via FCM status: %s', resp.success);
  }

  notification.response = resp.response;

  await notificationService.updateNotification(notification);

  if (resp.success === false) {
    throw new Error('Unable to send notification');
  }
};

function sendNotificationViaFCM(device, notification) {
  return new Promise((resolve, reject) => {
    if (device.token) {
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

      admin.messaging().send(message).then(resp => {
        resolve({
          success: true,
          response: resp
        });
      }).catch(err => {
        resolve({
          success: false,
          response: err.code
        })
      });
    } else {
      resolve({
        success: false,
        response: 'No device token present'
      });
    }
  });
}

function sendViaWebsocket(device, type, payload) {
  return new Promise((resolve, reject) => {
    if (WebsocketServer.isDeviceConnectedViaWebsocket(device)) {
      WebsocketServer.sendToDeviceViaWebsocket(device, type, payload, (err) => {
        if (err) {
          resolve({
            success: false,
            response: err
          });
        } else {
          resolve({
            success: true,
            response: null
          });
        }
      });
    } else {
      resolve({
        success: false,
        response: 'No such device connected via websocket'
      });
    }
  });
}

httpServer.listen(process.env.PORT || 8020, function () {
  console.log("Server started on port: " + httpServer.address().port);
});


// WebSocket Connection