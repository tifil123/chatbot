/**
 * Service Worker
 * PWA özellikleri ve offline destek için service worker
 */

const CACHE_NAME = 'chatbot-v2.0.0';
const STATIC_CACHE = 'static-v2.0.0';
const DYNAMIC_CACHE = 'dynamic-v2.0.0';
const RUNTIME_CACHE = 'runtime-v2.0.0';

// Cache stratejileri
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cacheFirst',
  NETWORK_FIRST: 'networkFirst',
  STALE_WHILE_REVALIDATE: 'staleWhileRevalidate',
  NETWORK_ONLY: 'networkOnly',
  CACHE_ONLY: 'cacheOnly'
};

// Cache için URL listeleri
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/admin-panel-optimized.html',
  '/src/chatbot-widget-optimized.html',
  '/styles/variables.css',
  '/styles/components/buttons.css',
  '/styles/components/modals.css',
  '/styles/themes.css',
  '/styles/responsive.css',
  '/config/firebase-config.js',
  '/services/firebase-service.js',
  '/services/ui-service.js',
  '/services/cache-service.js',
  '/services/rate-limit-service.js',
  '/services/validation-service.js',
  '/services/analytics-service.js',
  '/services/file-service.js',
  '/services/notification-service.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.22.0/firebase-app-compat.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.22.0/firebase-database-compat.min.js'
];

const DYNAMIC_ASSETS = [
  '/api/',
  'https://chatbotdb-be1f7-default-rtdb.europe-west1.firebasedatabase.app/'
];

// Service Worker yüklendiğinde
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Service Worker aktifleştiğinde
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== RUNTIME_CACHE
            )
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => {
        console.log('Old caches cleared');
        return self.clients.claim();
      })
      .then(() => {
        console.log('Service Worker activated');
      })
  );
});

// Fetch isteklerini yakala
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Sadece GET isteklerini işle
  if (request.method !== 'GET') {
    return;
  }
  
  // Chrome extension isteklerini ignore et
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Farklı stratejiler için farklı yaklaşımlar
  if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(cacheFirst(request));
  } else if (DYNAMIC_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(networkFirst(request));
  } else if (request.url.includes('firebaseio')) {
    event.respondWith(staleWhileRevalidate(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

// Cache First stratejisi
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log(`Cache hit: ${request.url}`);
      return cachedResponse;
    }
    
    console.log(`Cache miss: ${request.url}`);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network First stratejisi
async function networkFirst(request) {
  try {
    console.log(`Network first: ${request.url}`);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Stale While Revalidate stratejisi
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.error('Network fetch failed:', error);
    return null;
  });
  
  if (cachedResponse) {
    console.log(`Serving stale content: ${request.url}`);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetchPromise;
    return networkResponse || new Response('Network Error', { status: 503 });
  } catch (error) {
    return new Response('Network Error', { status: 503 });
  }
}

// Mesajları dinle
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'CACHE_URLS':
      cacheUrls(payload.urls).then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'GET_STATS':
      getCacheStats().then(stats => {
        event.ports[0].postMessage({ stats });
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Sync event'i
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Push notification
self.addEventListener('push', event => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Yeni mesajınız var',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge.png',
    tag: 'chatbot-notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Aç'
      },
      {
        action: 'dismiss',
        title: 'Kapat'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Chatbot', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'dismiss') {
    // Bildirim kapatıldı
  } else {
    // Bildirimin kendisine tıklandı
    event.waitUntil(
      clients.matchAll().then(clientList => {
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Arka plan senkronizasyonu
async function doBackgroundSync() {
  try {
    // Bekleyen verileri gönder
    const pendingData = await getPendingData();
    
    for (const data of pendingData) {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        await removePendingData(data.id);
      } catch (error) {
        console.error('Sync failed for data:', data, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Bekleyen verileri al
async function getPendingData() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const response = await cache.match('/pending-data');
  
  if (response) {
    return response.json();
  }
  
  return [];
}

// Bekleyen veriyi sil
async function removePendingData(id) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const pendingData = await getPendingData();
  const filteredData = pendingData.filter(data => data.id !== id);
  
  const response = new Response(JSON.stringify(filteredData));
  await cache.put('/pending-data', response);
}

// Tüm cache'leri temizle
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// URL'leri cache'le
async function cacheUrls(urls) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.error(`Failed to cache ${url}:`, error);
    }
  }
}

// Cache istatistiklerini al
async function getCacheStats() {
  const stats = {};
  
  for (const cacheName of [STATIC_CACHE, DYNAMIC_CACHE, RUNTIME_CACHE]) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      const requests = await Promise.all(keys.map(key => cache.match(key)));
      
      let totalSize = 0;
      for (const request of requests) {
        if (request) {
          const blob = await request.blob();
          totalSize += blob.size;
        }
      }
      
      stats[cacheName] = {
        entries: keys.length,
        size: totalSize,
        sizeFormatted: formatBytes(totalSize)
      };
    } catch (error) {
      stats[cacheName] = { error: error.message };
    }
  }
  
  return stats;
}

// Byte'ları formatla
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Cache bakımı
self.addEventListener('message', event => {
  if (event.data.type === 'CACHE_CLEANUP') {
    event.waitUntil(
      cleanupCache().then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

// Cache temizleme
async function cleanupCache() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 saat
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const date = response.headers.get('date');
      if (date) {
        const responseDate = new Date(date).getTime();
        if (now - responseDate > maxAge) {
          await cache.delete(request);
          console.log(`Cache entry expired and removed: ${request.url}`);
        }
      }
    }
  }
}

// Periyodik cache temizleme
setInterval(() => {
  cleanupCache();
}, 60 * 60 * 1000); // Her saat

console.log('Service Worker loaded');