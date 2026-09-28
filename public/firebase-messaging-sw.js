importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCOdHf6oDVVZ5Sx8Kr_42ipmAcEVDGJxDs",
  authDomain: "gen-lang-client-0767741295.firebaseapp.com",
  projectId: "gen-lang-client-0767741295",
  storageBucket: "gen-lang-client-0767741295.firebasestorage.app",
  messagingSenderId: "201644367047",
  appId: "1:201644367047:web:a6d1f20a5b3156751472e2"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
