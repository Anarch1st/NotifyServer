let Resources = (function() {
  var reg = null;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./sw.js').then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        reg = registration;
      }, function(err) {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }

  function setupFireBase(cb) {
    if (reg === null) {
      return;
    }

    firebase.initializeApp({
      apiKey: "AIzaSyC10Wuh4ofS8dxV_P1UId9QdpQ-MaYlSU0",
      authDomain: "waspserver-saii.firebaseapp.com",
      databaseURL: "https://waspserver-saii.firebaseio.com",
      projectId: "waspserver-saii",
      storageBucket: "waspserver-saii.appspot.com",
      messagingSenderId: "939965082114"
    });

    var messaging = firebase.messaging();
    // Add the public key generated from the console here.
    messaging.usePublicVapidKey("BAUdhPLcR29dq_U6qTBJ4WAf1-83qfycf1Mut3RPtyNOhooMyEF3L0F6LAcVene2unVAi3LBf_Ru0KmeeakH36I");

    messaging.useServiceWorker(reg);

    messaging.requestPermission().then(function() {
      console.log('Notification permission granted.');
      cb();
    }).catch(function(err) {
      console.log('Unable to get permission to notify.', err);
    });

  }

  return {
    setupFireBase: setupFireBase,
  }
})();