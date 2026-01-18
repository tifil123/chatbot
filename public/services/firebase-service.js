/**
 * Firebase Service Katmanı
 * Tüm Firebase işlemleri için merkezi servis
 */

// Firebase SDK'yı kontrol et - zaten yüklenmiş mi?
if (typeof firebase === 'undefined') {
  console.log('📦 Firebase SDK yükleniyor...');
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.22.0/firebase-app-compat.min.js';
  script.onload = () => {
    console.log('✅ Firebase App SDK yüklendi');

    // Auth SDK yükle
    const authScript = document.createElement('script');
    authScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.22.0/firebase-auth-compat.min.js';
    authScript.onload = () => {
      console.log('✅ Firebase Auth SDK yüklendi');

      // Database SDK yükle
      const databaseScript = document.createElement('script');
      databaseScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/firebase/9.22.0/firebase-database-compat.min.js';
      databaseScript.onload = () => {
        console.log('✅ Firebase Database SDK yüklendi');
      };
      document.head.appendChild(databaseScript);
    };
    document.head.appendChild(authScript);
  };
  document.head.appendChild(script);
} else {
  console.log('✅ Firebase SDK zaten yüklü');
}

class FirebaseService {
  constructor() {
    this.db = null;
    this.isConnected = false;
    this.config = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.listeners = new Map();
    this.currentUser = null;
  }

  /**
   * Firebase'e bağlan
   * @param {Object} config - Firebase konfigürasyonu
   * @returns {Promise<Object>} Database reference
   */
  async connect(config = null) {
    if (this.isConnected && this.db) {
      return this.db;
    }

    try {
      // Konfigürasyonu al
      this.config = config || window.FirebaseConfig?.getActiveConfig?.();

      if (!this.config || !this.config.databaseURL) {
        throw new Error('Firebase konfigürasyonu bulunamadı! Lütfen config/firebase-config.js dosyasını kontrol edin.');
      }

      // Firebase'i başlat - gelişmiş kontrol mekanizması ile
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(this.config);
          console.log('🆕 Firebase uygulaması oluşturuldu:', this.config.databaseURL);
          console.log('🔥 Firebase apps count (sonra):', firebase.apps.length);
        } else {
          console.log('🔄 Mevcut Firebase uygulaması kullanılıyor');
          console.log('🔥 Firebase apps count (mevcut):', firebase.apps.length);

          // Mevcut uygulamanın config'ini kontrol et
          const currentApp = firebase.app();
          const currentURL = currentApp.options.databaseURL;
          const newURL = this.config.databaseURL;

          if (currentURL !== newURL) {
            console.warn('⚠️ Farklı Firebase URL tespit edildi:');
            console.warn('📱 Mevcut URL:', currentURL);
            console.warn('🆕 Yeni URL:', newURL);
            console.warn('❌ Bu durum veri çakışmasına neden olabilir!');

            // Farklı URL ise mevcut uygulamayı sonlandır ve yeniden başlat
            console.log('🔄 Farklı URL tespit edildi, mevcut uygulama sonlandırılıyor...');
            await firebase.app().delete();
            console.log('🗑️ Mevcut uygulama sonlandırıldı');

            // Yeni uygulama başlat
            firebase.initializeApp(this.config);
            console.log('🆕 Yeni Firebase uygulaması oluşturuldu:', this.config.databaseURL);
            console.log('🔥 Firebase apps count (yeni):', firebase.apps.length);
          }
        }
      } catch (error) {
        console.error('❌ Firebase başlatma hatası:', error);

        // Hata durumunda mevcut uygulamaları temizle ve yeniden dene
        try {
          if (firebase.apps.length > 0) {
            console.log('🔄 Hata durumunda mevcut uygulamalar temizleniyor...');
            await firebase.app().delete();
          }

          // Yeniden başlatmayı dene
          firebase.initializeApp(this.config);
          console.log('🆕 Firebase yeniden başlatıldı:', this.config.databaseURL);
        } catch (retryError) {
          console.error('❌ Firebase yeniden başlatma da başarısız:', retryError);
          throw retryError;
        }
      }

      this.db = firebase.database();
      this.isConnected = true;
      this.retryCount = 0;

      // Anonim giriş yap (başarısız olursa bile devam et)
      try {
        await this.signInAnonymously();
      } catch (authError) {
        console.warn('⚠️ Auth başarısız oldu, database bağlantısı devam ediyor:', authError.message);
      }

      // Gerçek zamanlı bağlantı durumunu dinle
      this.setupConnectionMonitoring();

      console.log('Firebase connected successfully');
      return this.db;

    } catch (error) {
      console.error('Firebase connection error:', error);

      // Retry mekanizması
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying connection (${this.retryCount}/${this.maxRetries})...`);
        await this.delay(this.config.settings?.retryDelay || 1000);
        return this.connect(this.config);
      }

      throw new Error(`Firebase connection failed after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Anonim giriş yap
   * @returns {Promise<Object>} User credential
   */
  async signInAnonymously() {
    try {
      // Zaten giriş yapılmış mı kontrol et
      if (firebase.auth().currentUser) {
        this.currentUser = firebase.auth().currentUser;
        console.log('✅ Mevcut anonim kullanıcı:', this.currentUser.uid);
        return this.currentUser;
      }

      // Anonim giriş yap
      const userCredential = await firebase.auth().signInAnonymously();
      this.currentUser = userCredential.user;
      console.log('✅ Anonim giriş başarılı:', this.currentUser.uid);

      // Auth state değişikliklerini dinle
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          this.currentUser = user;
          console.log('🔄 Auth state değişti - kullanıcı:', user.uid);
        } else {
          this.currentUser = null;
          console.log('🔄 Auth state değişti - kullanıcı çıkış yaptı');
        }
      });

      return this.currentUser;
    } catch (error) {
      console.error('❌ Anonim giriş hatası:', error);
      // Hata olsa bile devam et, bazı işlemler çalışabilir
      return null;
    }
  }

  /**
   * Mevcut kullanıcıyı al
   * @returns {Object|null} Current user
   */
  getCurrentUser() {
    return this.currentUser || firebase.auth()?.currentUser || null;
  }

  /**
   * Database reference'ini al
   * @returns {Object} Database reference
   */
  getDatabase() {
    if (!this.db) {
      throw new Error('Firebase not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Reference oluştur
   * @param {string} path - Database path
   * @returns {Object} Database reference
   */
  ref(path) {
    return this.getDatabase().ref(path);
  }

  /**
   * Veri oku
   * @param {string} path - Database path
   * @returns {Promise<Object>} Data snapshot
   */
  async read(path) {
    try {
      const snapshot = await this.ref(path).once('value');
      return snapshot.val();
    } catch (error) {
      console.error(`Error reading data from ${path}:`, error);
      throw error;
    }
  }

  /**
   * Veri yaz
   * @param {string} path - Database path
   * @param {Object} data - Yazılacak veri
   * @returns {Promise} Write operation
   */
  async write(path, data) {
    try {
      console.log('🔥 Firebase write çağrıldı - path:', path);
      console.log('🔥 Firebase write çağrıldı - data:', data);
      console.log('🔥 Firebase write çağrıldı - ref:', this.ref(path));

      const result = await this.ref(path).set(data);
      console.log('✅ Firebase write başarılı - path:', path);
      return result;
    } catch (error) {
      console.error(`❌ Error writing data to ${path}:`, error);
      throw error;
    }
  }

  /**
   * Veri ekle (push)
   * @param {string} path - Database path
   * @param {Object} data - Eklenecek veri
   * @returns {Promise} Push operation
   */
  async push(path, data) {
    try {
      console.log('🔥 Firebase push çağrıldı - path:', path);
      console.log('🔥 Firebase push çağrıldı - data:', data);
      console.log('🔥 Firebase push çağrıldı - ref:', this.ref(path));

      const result = await this.ref(path).push(data);
      console.log('✅ Firebase push başarılı - path:', path);
      console.log('✅ Yeni kayıt ID:', result.key);
      return result;
    } catch (error) {
      console.error(`❌ Error pushing data to ${path}:`, error);
      throw error;
    }
  }

  /**
   * Veri güncelle
   * @param {string} path - Database path
   * @param {Object} data - Güncellenecek veri
   * @returns {Promise} Update operation
   */
  async update(path, data) {
    try {
      return await this.ref(path).update(data);
    } catch (error) {
      console.error(`Error updating data at ${path}:`, error);
      throw error;
    }
  }

  /**
   * Veri sil
   * @param {string} path - Database path
   * @returns {Promise} Delete operation
   */
  async remove(path) {
    try {
      return await this.ref(path).remove();
    } catch (error) {
      console.error(`Error deleting data at ${path}:`, error);
      throw error;
    }
  }

  /**
   * Real-time listener ekle
   * @param {string} path - Database path
   * @param {Function} callback - Callback function
   * @param {string} eventType - Event type ('value', 'child_added', etc.)
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback, eventType = 'value') {
    try {
      console.log(`🔗 Firebase listener kuruluyor: ${path} (${eventType})`);

      const listener = this.ref(path).on(eventType, (snapshot) => {
        console.log(`🔥 Firebase tetiklendi: ${path} (${eventType})`);
        console.log(`🔥 Snapshot:`, snapshot);
        console.log(`🔥 Snapshot val():`, snapshot.val());
        console.log(`🔥 Snapshot numChildren():`, snapshot.numChildren());
        callback(snapshot);
      });

      // Listener'ı kaydet
      const listenerKey = `${path}_${eventType}`;
      this.listeners.set(listenerKey, { path, callback, eventType, listener });

      console.log(`✅ Firebase listener kuruldu: ${listenerKey}`);

      // Unsubscribe fonksiyonu döndür
      return () => {
        this.ref(path).off(eventType, callback);
        this.listeners.delete(listenerKey);
        console.log(`❌ Firebase listener kaldırıldı: ${listenerKey}`);
      };
    } catch (error) {
      console.error(`❌ Error subscribing to ${path}:`, error);
      throw error;
    }
  }

  /**
   * Tüm listener'ları temizle
   */
  unsubscribeAll() {
    this.listeners.forEach(({ path, callback, eventType }) => {
      this.ref(path).off(eventType, callback);
    });
    this.listeners.clear();
  }

  /**
   * Bağlantı durumunu kontrol et
   * @returns {boolean} Connection status
   */
  isConnectionActive() {
    return this.isConnected && this.db && firebase.apps.length > 0;
  }

  /**
   * Gerçek zamanlı bağlantı izleme
   */
  setupConnectionMonitoring() {
    if (!this.db) return;

    const connectedRef = this.db.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
      const connected = snapshot.val();
      this.isConnected = connected;

      if (connected) {
        console.log('🟢 Firebase bağlantısı aktif');
      } else {
        console.log('🔴 Firebase bağlantısı pasif');
      }
    });
  }

  /**
   * Bağlantıyı kapat
   */
  disconnect() {
    this.unsubscribeAll();
    this.db = null;
    this.isConnected = false;
    console.log('Firebase disconnected');
  }

  /**
   * Gecikme fonksiyonu
   * @param {number} ms - Milisaniye
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Güçlü Oturum ID'si oluştur
   * @returns {string} Benzersiz oturum ID'si
   */
  generateSessionId() {
    // UUID kütüphanesi varsa kullan, yoksa kendi çözümümüzü kullan
    if (typeof uuidv4 !== 'undefined') {
      return 'session_' + uuidv4();
    }

    // Fallback: 3 katmanlı güvenlikli ID
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substring(2, 15); // 13 karakter
    const random2 = Math.random().toString(36).substring(2, 15); // 13 karakter
    const random3 = Math.random().toString(36).substring(2, 10); // 8 karakter

    return 'session_' + timestamp + '_' + random1 + '_' + random2 + '_' + random3;
  }

  /**
   * Benzersiz oturum ID'si oluştur ve kontrol et
   * @returns {Promise<string>} Benzersiz oturum ID'si
   */
  async createUniqueSessionId() {
    let sessionId;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      sessionId = this.generateSessionId();

      try {
        // Firebase'de bu ID var mı kontrol et
        const exists = await this.read('sessions/' + sessionId);
        if (!exists) {
          console.log('✅ Benzersiz session ID oluşturuldu:', sessionId);
          return sessionId;
        }

        console.warn(`⚠️ Session ID çakışması tespit edildi: ${sessionId}, yeniden deneniyor...`);
        attempts++;

        // Çakışma olursa biraz bekle ve tekrar dene
        await this.delay(100);
      } catch (error) {
        // Firebase okuma hatası olursa yine de devam et
        console.warn('Firebase kontrolü sırasında hata:', error);
        return sessionId;
      }
    }

    // Maksimum deneme sayısına ulaşıldı, son ID'yi kullan
    console.warn('⚠️ Maksimum deneme sayısına ulaşıldı, son ID kullanılıyor:', sessionId);
    return sessionId;
  }

  /**
   * Hata yönetimi
   * @param {Error} error - Hata objesi
   * @param {string} context - Hata context'i
   */
  handleError(error, context = 'Unknown') {
    console.error(`Firebase Service Error [${context}]:`, error);

    // Hata loglama (isteğe bağlı)
    if (window.uiService) {
      window.uiService.showToast(`Firebase hatası: ${error.message}`, 'error');
    }
  }
}

// Singleton pattern ile export et
const firebaseService = new FirebaseService();

// Global'e ekle
if (typeof window !== 'undefined') {
  window.firebaseService = firebaseService;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FirebaseService, firebaseService };
}