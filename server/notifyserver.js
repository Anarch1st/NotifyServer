const express = require('express');
const jsonfile = require('jsonfile');
const path = require('path');
const admin = require('firebase-admin');
const http = require('http');
const app = express();
const httpServer = http.createServer(app);
const request = require('request');
const serviceAccount = require('../private/waspserver-firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://waspserver-saii.firebaseio.com"
});

const tokens = path.resolve(__dirname, "../private/tokens.json");

app.use(express.json());
app.use('/', express.static(path.join(__dirname, '../public/files')));

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/files/index.html'));
});

app.post('/register', function(req, res) {
  jsonfile.readFile(tokens, function(err, obj) {
    const source = req.body.source;
    const token = req.body.token;

    var temp = null;
    if (obj.length > 0) {
      for (var item of obj) {
        if (item.source === source) {
          temp = item;
          break;
        }
      }
    }
    if (temp) {
      temp.token = token;
			res.status(200);
    } else {
      obj.push({
        source: source,
        token: token
      });
			res.status(201);
    }

		res.end();
    jsonfile.writeFile(tokens, obj, function(err) {
      if (err) {
        console.trace(err);
      }
    });
  });
});

app.post('/*', function(req, res) {
  const target = decodeURI(req.url.substring(1));

  jsonfile.readFile(tokens, function(err, obj) {
    var token;
    for (var item of obj) {
      if (item.source === target) {
        token = item.token;
      }
    }

    if (token) {
      const message = {
        notification: {
          title: req.body.title,
          body: req.body.body
        },
        token: token
      };

      admin.messaging().send(message)
        .then((response) => {
          res.send("Success");
        })
        .catch((error) => {
          res.status(500);
          res.send({
            error: error
          })
        });
    }
  });
});

function registerSelf() {
  const postData = {
    path: 'notify',
    ip: 'http://localhost:8020',
    name: 'notify'
  }

  request.post('http://localhost:8000/register', {
    form: postData
  }, function(err, res, body) {
    if (res && res.statusCode && (res.statusCode === 200 || res.statusCode === 204)) {
      console.log("Successfully registered");
    } else {
      console.log("Will retry");
      setTimeout(registerSelf, 2000);
    }
  });
}

httpServer.listen(process.env.PORT || 8020, function() {
  registerSelf();
  console.log("Server started on port: " + httpServer.address().port);
});
