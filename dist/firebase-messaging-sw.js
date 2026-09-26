// Service worker responsável por receber notificações push (FCM) enquanto o
// app está em segundo plano ou fechado. Web config values are public identifiers,
// not secrets, so hardcoding them here (workers can't read Vite env vars) is safe.
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC54xOrsxvzFFcF4RTtq-T1OB_2mf0kPsU',
  authDomain: 'ja-doei-app.firebaseapp.com',
  projectId: 'ja-doei-app',
  storageBucket: 'ja-doei-app.firebasestorage.app',
  messagingSenderId: '99714828186',
  appId: '1:99714828186:web:24bc582f2b02bd450c1c23'
});

const messaging = firebase.messaging();

// App em segundo plano/fechado: exibe a notificação do sistema
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Já Doei';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {}
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Clique na notificação: foca uma aba existente (avisando a rota alvo) ou abre uma nova
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const searchParams = new URLSearchParams(data).toString();
  const targetUrl = self.location.origin + (searchParams ? `/?${searchParams}` : '/');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existingClient = clientsArr.find((client) => 'focus' in client);
      if (existingClient) {
        existingClient.postMessage({ type: 'NOTIFICATION_CLICK', data });
        return existingClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
