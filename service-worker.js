// Disabled for recovery build. index.html unregisters prior workers and does not register this file.
self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.registration.unregister()));
