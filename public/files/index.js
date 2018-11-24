if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
	    swRegistered(registration);
    }, function(err) {
      // registration faiced :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

function swRegistered(registration) {

firebase.initializeApp({
  apiKey: "AIzaSyC10Wuh4ofS8dxV_P1UId9QdpQ-MaYlSU0",
  authDomain: "waspserver-saii.firebaseapp.com",
  databaseURL: "https://waspserver-saii.firebaseio.com",
  projectId: "waspserver-saii",
  storageBucket: "waspserver-saii.appspot.com",
  messagingSenderId: "939965082114"
});

const messaging = firebase.messaging();

// Add the public key generated from the console here.
messaging.usePublicVapidKey("BAUdhPLcR29dq_U6qTBJ4WAf1-83qfycf1Mut3RPtyNOhooMyEF3L0F6LAcVene2unVAi3LBf_Ru0KmeeakH36I");

      messaging.useServiceWorker(registration);



messaging.requestPermission().then(function() {
  console.log('Notification permission granted.');
  messaging.getToken().then(function(currentToken) {
	console.log(currentToken);
    if (currentToken) {
      sendTokenToServer(currentToken);
    } else {
      console.log('No Instance ID token available. Request permission to generate one.');
    }

  }).catch(function(err) {
    console.log('An error occurred while retrieving token. ', err);
  });
}).catch(function(err) {
  console.log('Unable to get permission to notify.', err);
});

function sendTokenToServer(currentToken) {
  var http = new XMLHttpRequest();
  var url = 'https://saikat.app/notify/register';
  var params = 'source=thinkpad&token=' + currentToken;
  http.open('POST', url, true);

  http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

  http.send(params);
  console.log(http);
}

messaging.onTokenRefresh(function() {
  messaging.getToken().then(function(refreshedToken) {
    console.log('Token refreshed.');
    sendTokenToServer(refreshedToken);
  }).catch(function(err) {
    console.log('Unable to retrieve refreshed token ', err);
  });
});

messaging.onMessage(function(payload) {
  console.log('Message received. ', payload);
  // ...
});
}
