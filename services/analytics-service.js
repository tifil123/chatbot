/**
 * Analytics Service Katmanı
 * Kullanıcı davranışlarını takip ve analiz için merkezi servis
 */

class AnalyticsService {
  constructor() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.startTime = Date.now();
    this.pageViews = 0;
    this.eventsQueue = [];
    this.maxEvents = 1000;
    this.flushInterval = 30000; // 30 saniye
    this.endpoint = '/api/analytics';
    this.isOnline = navigator.onLine;
    
    // Performans metrikleri
    this.performanceMetrics = {
      pageLoadTime: 0,
      domContentLoaded: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0
    };
    
    this.init();
  }

  /**
   * Servisi başlat
   */
  init() {
    // Session ID oluştur
    this.sessionId = this.getSessionId();
    
    // Performans metriklerini topla
    this.collectPerformanceMetrics();
    
    // Event listener'ları kur
    this.setupEventListeners();
    
    // Periyodik veri gönderimi
    this.startPeriodicFlush();
    
    // Sayfa kapanışında veri gönder
    this.setupPageUnloadHandler();
    
    console.log('Analytics Service initialized');
  }

  /**
   * Session ID oluştur veya al
   * @returns {string} Session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    
    return sessionId;
  }

  /**
   * Rastgele session ID oluştur
   * @returns {string} Session ID
   */
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Event gönder
   * @param {string} eventName - Event adı
   * @param {Object} data - Event verisi
   * @param {Object} options - Seçenekler
   */
  trackEvent(eventName, data = {}, options = {}) {
    const event = {
      id: this.generateEventId(),
      name: eventName,
      data: this.sanitizeData(data),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      ...options
    };

    this.events.push(event);
    this.eventsQueue.push(event);
    
    // Bellek yönetimi
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    console.debug(`Event tracked: ${eventName}`, event);
    
    // Anlık gönderim seçeneği
    if (options.immediate) {
      this.flushEvents();
    }
  }

  /**
   * Sayfa görüntüleme takibi
   * @param {string} page - Sayfa adı
   * @param {Object} data - Ek veriler
   */
  trackPageView(page, data = {}) {
    this.pageViews++;
    
    this.trackEvent('page_view', {
      page: page || window.location.pathname,
      title: document.title,
      pageViews: this.pageViews,
      ...data
    });
  }

  /**
   * Kullanıcı etkileşimini takip
   * @param {string} action - Aksiyon
   * @param {string} element - Element
   * @param {Object} data - Ek veriler
   */
  trackInteraction(action, element, data = {}) {
    this.trackEvent('user_interaction', {
      action,
      element,
      ...data
    });
  }

  /**
   * Mesaj gönderimini takip
   * @param {string} messageType - Mesaj tipi
   * @param {number} messageLength - Mesaj uzunluğu
   * @param {number} responseTime - Yanıt süresi
   * @param {Object} data - Ek veriler
   */
  trackMessage(messageType, messageLength, responseTime, data = {}) {
    this.trackEvent('message_sent', {
      messageType,
      messageLength,
      responseTime,
      ...data
    });
  }

  /**
   * Hata takibi
   * @param {Error|string} error - Hata
   * @param {Object} context - Hata context'i
   */
  trackError(error, context = {}) {
    const errorData = {
      message: error.message || error,
      stack: error.stack,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.trackEvent('error', errorData, { immediate: true });
  }

  /**
   * Performans metriklerini takip
   * @param {string} metric - Metrik adı
   * @param {number} value - Değer
   * @param {Object} data - Ek veriler
   */
  trackPerformance(metric, value, data = {}) {
    this.trackEvent('performance', {
      metric,
      value,
      ...data
    });
  }

  /**
   * Kullanıcı oturumunu bitir
   * @param {Object} data - Oturum verileri
   */
  trackSessionEnd(data = {}) {
    const sessionDuration = Date.now() - this.startTime;
    
    this.trackEvent('session_end', {
      duration: sessionDuration,
      pageViews: this.pageViews,
      events: this.events.length,
      ...data
    }, { immediate: true });
  }

  /**
   * Chatbot özel metrikleri
   * @param {Object} metrics - Metrikler
   */
  trackChatbotMetrics(metrics) {
    this.trackEvent('chatbot_metrics', {
      totalMessages: metrics.totalMessages || 0,
      successfulResponses: metrics.successfulResponses || 0,
      failedResponses: metrics.failedResponses || 0,
      averageResponseTime: metrics.averageResponseTime || 0,
      learnedResponses: metrics.learnedResponses || 0,
      pendingQuestions: metrics.pendingQuestions || 0,
      ...metrics
    });
  }

  /**
   * Event ID oluştur
   * @returns {string} Event ID
   */
  generateEventId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * Veriyi temizle
   * @param {Object} data - Temizlenecek veri
   * @returns {Object} Temizlenmiş veri
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return {};
    }
    
    const sanitized = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    
    Object.keys(data).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof data[key] === 'string') {
        sanitized[key] = data[key].substring(0, 500); // Maksimum 500 karakter
      } else {
        sanitized[key] = data[key];
      }
    });
    
    return sanitized;
  }

  /**
   * Performans metriklerini topla
   */
  collectPerformanceMetrics() {
    if ('performance' in window) {
      // Sayfa yükleme süresi
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          this.performanceMetrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          this.performanceMetrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        }
      });

      // First Contentful Paint
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.performanceMetrics.firstContentfulPaint = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              this.performanceMetrics.largestContentfulPaint = entry.startTime;
            }
          });
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      }
    }
  }

  /**
   * Event listener'ları kur
   */
  setupEventListeners() {
    // Sayfa görüntüleme
    this.trackPageView();
    
    // Tıklama olayları
    document.addEventListener('click', (e) => {
      const element = e.target;
      const tagName = element.tagName.toLowerCase();
      const className = element.className;
      const id = element.id;
      
      this.trackInteraction('click', `${tagName}${id ? '#' + id : ''}${className ? '.' + className.split(' ').join('.') : ''}`);
    });

    // Form gönderimleri
    document.addEventListener('submit', (e) => {
      const form = e.target;
      const formName = form.name || form.id || 'unnamed_form';
      
      this.trackInteraction('form_submit', `form#${formName}`);
    });

    // Hata yakalama
    window.addEventListener('error', (e) => {
      this.trackError(e.error || e.message, {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
      });
    });

    // Promise hataları
    window.addEventListener('unhandledrejection', (e) => {
      this.trackError(e.reason, {
        type: 'unhandled_promise_rejection'
      });
    });

    // Online/offline durumu
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.trackEvent('connection_status', { status: 'online' });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.trackEvent('connection_status', { status: 'offline' });
    });
  }

  /**
   * Periyodik veri gönderimi başlat
   */
  startPeriodicFlush() {
    setInterval(() => {
      if (this.isOnline && this.eventsQueue.length > 0) {
        this.flushEvents();
      }
    }, this.flushInterval);
  }

  /**
   * Sayfa kapanışında veri gönder
   */
  setupPageUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      this.trackSessionEnd();
      this.flushEvents();
    });

    // Sayfa visibility değişimi
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden');
      } else {
        this.trackEvent('page_visible');
      }
    });
  }

  /**
   * Event'leri sunucuya gönder
   */
  async flushEvents() {
    if (this.eventsQueue.length === 0) return;
    
    const eventsToSend = [...this.eventsQueue];
    this.eventsQueue = [];
    
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToSend,
          sessionId: this.sessionId,
          userId: this.userId,
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.debug(`Analytics: ${eventsToSend.length} events sent successfully`);
      
    } catch (error) {
      console.error('Analytics flush failed:', error);
      
      // Hata durumunda event'leri geri queue'ya ekle
      this.eventsQueue.unshift(...eventsToSend);
      
      // Local storage'a yedekle
      this.backupToLocalStorage();
    }
  }

  /**
   * Local storage'a yedekle
   */
  backupToLocalStorage() {
    try {
      const backup = {
        events: this.eventsQueue,
        timestamp: Date.now()
      };
      
      localStorage.setItem('analytics_backup', JSON.stringify(backup));
    } catch (error) {
      console.error('Analytics backup failed:', error);
    }
  }

  /**
   * Local storage'dan geri yükle
   */
  restoreFromLocalStorage() {
    try {
      const backup = localStorage.getItem('analytics_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        
        // 24 saatten eskise ignore et
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          this.eventsQueue.unshift(...parsed.events);
          console.debug(`Analytics: ${parsed.events.length} events restored from backup`);
        }
        
        localStorage.removeItem('analytics_backup');
      }
    } catch (error) {
      console.error('Analytics restore failed:', error);
    }
  }

  /**
   * Kullanıcı ID'sini ayarla
   * @param {string} userId - Kullanıcı ID
   */
  setUserId(userId) {
    this.userId = userId;
    this.trackEvent('user_identified', { userId });
  }

  /**
   * Kullanıcı özelliklerini ayarla
   * @param {Object} properties - Kullanıcı özellikleri
   */
  setUserProperties(properties) {
    this.trackEvent('user_properties', properties);
  }

  /**
   * İstatistikleri al
   * @returns {Object} İstatistikler
   */
  getStats() {
    const now = Date.now();
    const sessionDuration = now - this.startTime;
    
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.startTime,
      sessionDuration,
      pageViews: this.pageViews,
      totalEvents: this.events.length,
      queuedEvents: this.eventsQueue.length,
      isOnline: this.isOnline,
      performanceMetrics: this.performanceMetrics
    };
  }

  /**
   * Event'leri dışa aktar
   * @returns {Array} Event listesi
   */
  exportEvents() {
    return [...this.events];
  }

  /**
   * Servisi temizle
   */
  destroy() {
    this.trackSessionEnd();
    this.flushEvents();
    
    this.events = [];
    this.eventsQueue = [];
    
    console.log('Analytics Service destroyed');
  }
}

// Singleton pattern ile export et
const analyticsService = new AnalyticsService();

// Global'e ekle
if (typeof window !== 'undefined') {
  window.analyticsService = analyticsService;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AnalyticsService, analyticsService };
}