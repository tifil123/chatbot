/**
 * Firebase Konfigürasyon Dosyası
 * Tüm Firebase bağlantıları için merkezi konfigürasyon
 */

const FIREBASE_CONFIG = {
  // Production URL
  databaseURL: 'https://chatbotdb-be1f7-default-rtdb.europe-west1.firebasedatabase.app',

  // Proje bilgileri
  projectId: 'chatbotdb-be1f7',

  // Ortam bazlı konfigürasyonlar
  environments: {
    development: {
      databaseURL: 'https://chatbotdb-be1f7-default-rtdb.europe-west1.firebasedatabase.app',
      debug: true
    },
    production: {
      databaseURL: 'https://chatbotdb-be1f7-default-rtdb.europe-west1.firebasedatabase.app',
      debug: false
    }
  },

  // Varsayılan ayarlar
  settings: {
    autoConnect: true,
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 10000
  }
};

// Mevcut ortamı tespit et
const getCurrentEnvironment = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  }
  return 'production';
};

// Aktif konfigürasyonu al
const getActiveConfig = () => {
  const env = getCurrentEnvironment();
  return {
    ...FIREBASE_CONFIG,
    ...FIREBASE_CONFIG.environments[env],
    currentEnvironment: env
  };
};

// Export et
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIREBASE_CONFIG, getActiveConfig, getCurrentEnvironment };
} else {
  window.FirebaseConfig = { FIREBASE_CONFIG, getActiveConfig, getCurrentEnvironment };
}