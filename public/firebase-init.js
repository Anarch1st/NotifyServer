if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);

      firebase.initializeApp({
        apiKey: "AIzaSyC10Wuh4ofS8dxV_P1UId9QdpQ-MaYlSU0",
        authDomain: "waspserver-saii.firebaseapp.com",
        databaseURL: "https://waspserver-saii.firebaseio.com",
        projectId: "waspserver-saii",
        storageBucket: "waspserver-saii.appspot.com",
        messagingSenderId: "939965082114"
      });

      let messaging = firebase.messaging();
      // Add the public key generated from the console here.
      messaging.usePublicVapidKey("BAUdhPLcR29dq_U6qTBJ4WAf1-83qfycf1Mut3RPtyNOhooMyEF3L0F6LAcVene2unVAi3LBf_Ru0KmeeakH36I");

      messaging.useServiceWorker(registration);

      let event = new Event('firebase-init');
      window.dispatchEvent(event);

    }, function (err) {
      console.log('ServiceWorker registration failed: ', err);

      let event = new Event('firebase-error');
      window.dispatchEvent(event);
    });
  });
}