/**
 * Cache Service Katmanı
 * Tüm önbellek işlemleri için merkezi servis
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
    this.defaultTTL = 300000; // 5 dakika
    this.maxSize = 1000; // Maksimum cache boyutu
    this.cleanupInterval = 60000; // 1 dakika
    this.initCleanup();
  }

  /**
   * Cache'e veri ekle
   * @param {string} key - Cache anahtarı
   * @param {any} value - Değer
   * @param {number} ttlMs - TTL (milisaniye)
   */
  set(key, value, ttlMs = this.defaultTTL) {
    // Cache boyutu kontrolü
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const expiryTime = Date.now() + ttlMs;
    this.cache.set(key, value);
    this.ttl.set(key, expiryTime);
    
    console.debug(`Cache set: ${key} (TTL: ${ttlMs}ms)`);
  }

  /**
   * Cache'ten veri al
   * @param {string} key - Cache anahtarı
   * @returns {any} Cache değeri veya null
   */
  get(key) {
    if (this.isExpired(key)) {
      this.delete(key);
      return null;
    }
    
    const value = this.cache.get(key);
    console.debug(`Cache hit: ${key}`);
    return value;
  }

  /**
   * Cache'ten veri al veya yoksa callback ile oluştur
   * @param {string} key - Cache anahtarı
   * @param {Function} callback - Veri oluşturma callback'i
   * @param {number} ttlMs - TTL (milisaniye)
   * @returns {any} Cache değeri
   */
  async getOrSet(key, callback, ttlMs = this.defaultTTL) {
    let value = this.get(key);
    
    if (value === null) {
      console.debug(`Cache miss: ${key}, executing callback`);
      value = await callback();
      this.set(key, value, ttlMs);
    }
    
    return value;
  }

  /**
   * Cache anahtarının süresi dolmuş mı kontrol et
   * @param {string} key - Cache anahtarı
   * @returns {boolean} Süre dolmuş ise true
   */
  isExpired(key) {
    const expiryTime = this.ttl.get(key);
    if (!expiryTime) return true;
    
    return Date.now() > expiryTime;
  }

  /**
   * Cache anahtarını sil
   * @param {string} key - Cache anahtarı
   */
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
    console.debug(`Cache deleted: ${key}`);
  }

  /**
   * Tüm cache'i temizle
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.ttl.clear();
    console.debug(`Cache cleared: ${size} items removed`);
  }

  /**
   * Süresi dolmuş tüm cache'leri temizle
   */
  cleanup() {
    let cleanedCount = 0;
    
    for (const key of this.ttl.keys()) {
      if (this.isExpired(key)) {
        this.delete(key);
        cleanedCount++;
      }
    }
    
    console.debug(`Cache cleanup: ${cleanedCount} items removed`);
    return cleanedCount;
  }

  /**
   * En eski cache öğesini sil
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, time] of this.ttl.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      console.debug(`Cache evicted oldest: ${oldestKey}`);
    }
  }

  /**
   * Cache istatistiklerini al
   * @returns {Object} İstatistikler
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, time] of this.ttl.entries()) {
      if (now > time) {
        expiredCount++;
      }
    }
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expiredCount,
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Cache hit oranını hesapla
   * @returns {number} Hit yüzdesi
   */
  calculateHitRate() {
    // Basit bir hesaplama - gerçek implementasyon için hit/miss sayacı gerekir
    return Math.random() * 100; // Placeholder
  }

  /**
   * Bellek kullanımını tahmin et
   * @returns {number} Tahmini bellek kullanımı (bytes)
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, value] of this.cache.entries()) {
      totalSize += this.getObjectSize(key) + this.getObjectSize(value);
    }
    
    return totalSize;
  }

  /**
   * Nesne boyutunu hesapla
   * @param {any} obj - Nesne
   * @returns {number} Boyut (bytes)
   */
  getObjectSize(obj) {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Otomatik temizlik başlat
   */
  initCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Cache anahtarlarını pattern'e göre al
   * @param {RegExp} pattern - Arama pattern'i
   * @returns {Array} Eşleşen anahtarlar
   */
  getKeysByPattern(pattern) {
    const keys = [];
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Pattern'e göre cache'leri sil
   * @param {RegExp} pattern - Arama pattern'i
   * @returns {number} Silinen öğe sayısı
   */
  deleteByPattern(pattern) {
    const keysToDelete = this.getKeysByPattern(pattern);
    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }

  /**
   * Cache'i JSON olarak export et
   * @returns {Object} Export verisi
   */
  export() {
    const data = {};
    const now = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      const expiryTime = this.ttl.get(key);
      if (expiryTime && expiryTime > now) {
        data[key] = {
          value,
          expiryTime,
          ttl: expiryTime - now
        };
      }
    }
    
    return data;
  }

  /**
   * JSON'dan cache'i import et
   * @param {Object} data - Import verisi
   */
  import(data) {
    for (const [key, item] of Object.entries(data)) {
      if (item.value && item.ttl > 0) {
        this.set(key, item.value, item.ttl);
      }
    }
  }

  /**
   * Servisi temizle
   */
  destroy() {
    this.clear();
    console.log('Cache Service destroyed');
  }
}

// Singleton pattern ile export et
const cacheService = new CacheService();

// Global'e ekle
if (typeof window !== 'undefined') {
  window.cacheService = cacheService;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CacheService, cacheService };
}