/**
 * Rate Limiting Service Katmanı
 * İstek sınırlama ve güvenlik için merkezi servis
 */

class RateLimitService {
  constructor() {
    this.requests = new Map();
    this.bannedIPs = new Set();
    this.suspiciousIPs = new Map();
    this.globalLimits = {
      requests: 1000,
      windowMs: 60000 // 1 dakika
    };
    this.userLimits = {
      requests: 100,
      windowMs: 60000 // 1 dakika
    };
    this.messageLimits = {
      requests: 10,
      windowMs: 60000 // 1 dakika
    };
    this.cleanupInterval = 300000; // 5 dakika
    this.initCleanup();
  }

  /**
   * IP adresine göre istek limitini kontrol et
   * @param {string} ip - IP adresi
   * @param {number} limit - İstek limiti
   * @param {number} windowMs - Zaman penceresi (milisaniye)
   * @returns {Object} Sonuç objesi
   */
  checkLimit(ip, limit = this.userLimits.requests, windowMs = this.userLimits.windowMs) {
    // Banned IP kontrolü
    if (this.bannedIPs.has(ip)) {
      return {
        allowed: false,
        reason: 'IP_BANNED',
        retryAfter: this.getBannedRetryAfter(ip),
        remainingRequests: 0,
        resetTime: Date.now() + windowMs
      };
    }

    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }
    
    const ipRequests = this.requests.get(ip);
    const recentRequests = ipRequests.filter(time => time > windowStart);
    
    // Şüpheli aktivite kontrolü
    this.checkSuspiciousActivity(ip, recentRequests.length, windowMs);
    
    if (recentRequests.length >= limit) {
      // Limit aşımı - ban kontrolü
      if (recentRequests.length > limit * 2) {
        this.banIP(ip, 300000); // 5 dakika ban
      }
      
      const oldestRequest = Math.min(...recentRequests);
      const resetTime = oldestRequest + windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      
      return {
        allowed: false,
        reason: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
        remainingRequests: 0,
        resetTime
      };
    }
    
    // İsteği ekle
    recentRequests.push(now);
    this.requests.set(ip, recentRequests);
    
    return {
      allowed: true,
      reason: 'OK',
      retryAfter: 0,
      remainingRequests: limit - recentRequests.length,
      resetTime: now + windowMs
    };
  }

  /**
   * Mesaj gönderimi için özel limit kontrolü
   * @param {string} ip - IP adresi
   * @param {string} sessionId - Session ID
   * @returns {Object} Sonuç objesi
   */
  checkMessageLimit(ip, sessionId) {
    // IP bazlı kontrol
    const ipResult = this.checkLimit(ip, this.messageLimits.requests, this.messageLimits.windowMs);
    if (!ipResult.allowed) {
      return ipResult;
    }

    // Session bazlı kontrol
    const sessionKey = `session_${sessionId}`;
    const sessionResult = this.checkLimit(sessionKey, this.messageLimits.requests, this.messageLimits.windowMs);
    
    return sessionResult;
  }

  /**
   * Global limit kontrolü
   * @returns {Object} Sonuç objesi
   */
  checkGlobalLimit() {
    const now = Date.now();
    const windowStart = now - this.globalLimits.windowMs;
    
    let totalRequests = 0;
    for (const requests of this.requests.values()) {
      totalRequests += requests.filter(time => time > windowStart).length;
    }
    
    if (totalRequests >= this.globalLimits.requests) {
      return {
        allowed: false,
        reason: 'GLOBAL_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(this.globalLimits.windowMs / 1000),
        remainingRequests: 0,
        resetTime: now + this.globalLimits.windowMs
      };
    }
    
    return {
      allowed: true,
      reason: 'OK',
      retryAfter: 0,
      remainingRequests: this.globalLimits.requests - totalRequests,
      resetTime: now + this.globalLimits.windowMs
    };
  }

  /**
   * Şüpheli aktiviteyi kontrol et
   * @param {string} ip - IP adresi
   * @param {number} requestCount - İstek sayısı
   * @param {number} windowMs - Zaman penceresi
   */
  checkSuspiciousActivity(ip, requestCount, windowMs) {
    const suspiciousThreshold = 50; // 1 dakikada 50 istek
    const verySuspiciousThreshold = 100; // 1 dakikada 100 istek
    
    if (requestCount > verySuspiciousThreshold) {
      this.flagSuspiciousIP(ip, 'VERY_HIGH_FREQUENCY', requestCount);
    } else if (requestCount > suspiciousThreshold) {
      this.flagSuspiciousIP(ip, 'HIGH_FREQUENCY', requestCount);
    }
  }

  /**
   * Şüpheli IP olarak işaretle
   * @param {string} ip - IP adresi
   * @param {string} reason - Sebep
   * @param {number} count - İstek sayısı
   */
  flagSuspiciousIP(ip, reason, count) {
    if (!this.suspiciousIPs.has(ip)) {
      this.suspiciousIPs.set(ip, []);
    }
    
    const flags = this.suspiciousIPs.get(ip);
    flags.push({
      reason,
      count,
      timestamp: Date.now()
    });
    
    // Çok fazla flag varsa banla
    if (flags.length > 5) {
      this.banIP(ip, 3600000); // 1 saat ban
    }
    
    console.warn(`Suspicious activity detected from ${ip}: ${reason} (${count} requests)`);
  }

  /**
   * IP adresini banla
   * @param {string} ip - IP adresi
   * @param {number} durationMs - Ban süresi (milisaniye)
   */
  banIP(ip, durationMs = 3600000) { // Varsayılan 1 saat
    this.bannedIPs.add(ip);
    const unbanTime = Date.now() + durationMs;
    
    // Otomatik unban zamanlayıcı
    setTimeout(() => {
      this.unbanIP(ip);
    }, durationMs);
    
    console.warn(`IP ${ip} banned for ${durationMs}ms until ${new Date(unbanTime).toISOString()}`);
  }

  /**
   * IP adresinin banını kaldır
   * @param {string} ip - IP adresi
   */
  unbanIP(ip) {
    this.bannedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    console.log(`IP ${ip} unbanned`);
  }

  /**
   * Banlı IP'nin ne zaman açılacağını al
   * @param {string} ip - IP adresi
   * @returns {number} Kalan süre (saniye)
   */
  getBannedRetryAfter(ip) {
    // Bu metodun doğru çalışması için ban zamanlarını saklamamız gerekir
    // Şimdilik varsayılan değer döndürüyoruz
    return 3600; // 1 saat
  }

  /**
   * IP'nin durumunu al
   * @param {string} ip - IP adresi
   * @returns {Object} Durum bilgisi
   */
  getIPStatus(ip) {
    const isBanned = this.bannedIPs.has(ip);
    const suspiciousFlags = this.suspiciousIPs.get(ip) || [];
    const requests = this.requests.get(ip) || [];
    
    const now = Date.now();
    const recentRequests = requests.filter(time => now - time < 60000).length;
    
    return {
      ip,
      isBanned,
      suspiciousFlags,
      recentRequests,
      totalRequests: requests.length,
      reputation: this.calculateReputation(ip)
    };
  }

  /**
   * IP itibarını hesapla
   * @param {string} ip - IP adresi
   * @returns {number} İtibar skoru (0-100)
   */
  calculateReputation(ip) {
    let score = 100;
    
    if (this.bannedIPs.has(ip)) {
      score = 0;
    } else {
      const flags = this.suspiciousIPs.get(ip) || [];
      score -= flags.length * 10;
      
      const requests = this.requests.get(ip) || [];
      const recentRequests = requests.filter(time => Date.now() - time < 60000).length;
      score -= Math.min(recentRequests, 20); // Maksimum 20 puan düşüş
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * İstatistikleri al
   * @returns {Object} İstatistikler
   */
  getStats() {
    const now = Date.now();
    let totalRequests = 0;
    let activeIPs = 0;
    
    for (const [ip, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => now - time < 60000);
      if (recentRequests.length > 0) {
        activeIPs++;
        totalRequests += recentRequests.length;
      }
    }
    
    return {
      totalIPs: this.requests.size,
      activeIPs,
      bannedIPs: this.bannedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      totalRequests,
      averageRequestsPerIP: activeIPs > 0 ? Math.round(totalRequests / activeIPs) : 0
    };
  }

  /**
   * Eski kayıtları temizle
   */
  cleanup() {
    const now = Date.now();
    const cutoffTime = now - this.cleanupInterval;
    
    let cleanedIPs = 0;
    for (const [ip, requests] of this.requests.entries()) {
      const filteredRequests = requests.filter(time => time > cutoffTime);
      
      if (filteredRequests.length === 0) {
        this.requests.delete(ip);
        cleanedIPs++;
      } else {
        this.requests.set(ip, filteredRequests);
      }
    }
    
    // Şüpheli IP kayıtlarını temizle
    for (const [ip, flags] of this.suspiciousIPs.entries()) {
      const recentFlags = flags.filter(flag => flag.timestamp > cutoffTime);
      if (recentFlags.length === 0) {
        this.suspiciousIPs.delete(ip);
      } else {
        this.suspiciousIPs.set(ip, recentFlags);
      }
    }
    
    console.debug(`Rate limit cleanup: ${cleanedIPs} IPs removed`);
    return cleanedIPs;
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
   * Tüm verileri sıfırla
   */
  reset() {
    this.requests.clear();
    this.bannedIPs.clear();
    this.suspiciousIPs.clear();
    console.log('Rate limit service reset');
  }

  /**
   * Servisi temizle
   */
  destroy() {
    this.reset();
    console.log('Rate Limit Service destroyed');
  }
}

// Singleton pattern ile export et
const rateLimitService = new RateLimitService();

// Global'e ekle
if (typeof window !== 'undefined') {
  window.rateLimitService = rateLimitService;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RateLimitService, rateLimitService };
}