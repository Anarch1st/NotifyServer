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
    if (device) {
      notificationService.saveNotification(title, body, source, target).then(notification => {
        const message = {
          token: device.token,
          notification: {
            title: title,
            body: body
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
          res.send(notification);

          notificationService.updateNotification(notification).catch(err => {
            debug('Error updating notification %O', err);
          });
        }).catch(error => {
          notification.response = error.code;
          res.send(notification);

          notificationService.updateNotification(notification).catch(err => {
            debug('Error updating notification %O', err);
          });
        });
      }).catch(err => {
        debug('Error saving notification: %O', err);
        res.status(500);
        res.end();
      });
    } else {
      res.status(404);
      res.send('Device not found');
    }
  }).catch(err => {
    debug('Error retriving device: %O', err);
    res.status(500);
    res.end();
  });
};

httpServer.listen(process.env.PORT || 8020, function () {
  console.log("Server started on port: " + httpServer.address().port);
});