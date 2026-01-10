/**
 * Notification Service Katmanı
 * Bildirim yönetimi için merkezi servis
 */

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.notifications = new Map();
    this.maxNotifications = 5;
    this.defaultDuration = 5000; // 5 saniye
    this.position = 'top-right';
    this.soundEnabled = true;
    this.vibrationEnabled = true;
    this.templates = new Map();
    this.queue = [];
    this.isProcessing = false;

    this.init();
  }

  /**
   * Servisi başlat
   */
  async init(options = {}) {
    const defaults = {
      requestPermission: true
    };
    const config = { ...defaults, ...options };

    // Bildirim iznini kontrol et (sadece istenirse)
    if (config.requestPermission) {
      await this.requestPermission();
    } else {
      // İzin durumunu kontrol et ama isteme
      if ('Notification' in window) {
        this.permission = Notification.permission;
      } else {
        this.permission = 'unsupported';
      }
    }

    // Varsayılan şablonları yükle
    this.loadDefaultTemplates();

    // Event listener'ları kur
    this.setupEventListeners();

    console.log('Notification Service initialized');
  }

  /**
   * Bildirim izni iste
   * @returns {Promise<string} İzin durumu
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      this.permission = 'unsupported';
      return this.permission;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return this.permission;
    }

    if (Notification.permission === 'denied') {
      this.permission = 'denied';
      return this.permission;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.error('Notification permission request failed:', error);
      this.permission = 'error';
      return this.permission;
    }
  }

  /**
   * Bildirim göster
   * @param {string} title - Başlık
   * @param {Object} options - Seçenekler
   * @returns {Promise} Bildirim objesi
   */
  async showNotification(title, options = {}) {
    const defaults = {
      body: '',
      icon: '/favicon.ico',
      badge: '/badge.png',
      image: null,
      tag: null,
      data: {},
      requireInteraction: false,
      silent: false,
      duration: this.defaultDuration,
      type: 'info',
      position: this.position,
      showProgress: false,
      progress: 0,
      actions: [],
      onClick: null,
      onClose: null,
      onError: null
    };

    const config = { ...defaults, ...options };
    const notificationId = this.generateNotificationId();

    try {
      // Browser bildirimi
      let browserNotification = null;

      if (this.permission === 'granted' && !config.silent) {
        browserNotification = new Notification(title, {
          body: config.body,
          icon: config.icon,
          badge: config.badge,
          image: config.image,
          tag: config.tag,
          data: { ...config.data, notificationId },
          requireInteraction: config.requireInteraction,
          silent: config.silent,
          actions: config.actions
        });

        // Event listener'ları ekle
        if (config.onClick) {
          browserNotification.onclick = (event) => {
            config.onClick(event, notificationId);
          };
        }

        if (config.onClose) {
          browserNotification.onclose = (event) => {
            config.onClose(event, notificationId);
          };
        }

        if (config.onError) {
          browserNotification.onerror = (event) => {
            config.onError(event, notificationId);
          };
        }
      }

      // İç bildirim (toast)
      const toastNotification = this.createToastNotification(title, config, notificationId);

      // Bildirim bilgisini kaydet
      const notificationInfo = {
        id: notificationId,
        title,
        config,
        browserNotification,
        toastNotification,
        createdAt: Date.now(),
        duration: config.duration,
        isRead: false
      };

      this.notifications.set(notificationId, notificationInfo);

      // Otomatik kapatma
      if (config.duration > 0) {
        setTimeout(() => {
          this.closeNotification(notificationId);
        }, config.duration);
      }

      // Ses ve titreşim
      if (this.soundEnabled && !config.silent) {
        this.playNotificationSound(config.type);
      }

      if (this.vibrationEnabled && !config.silent && 'vibrate' in navigator) {
        this.vibrate(config.type);
      }

      return notificationInfo;

    } catch (error) {
      console.error('Notification display failed:', error);
      throw error;
    }
  }

  /**
   * Toast bildirimi oluştur
   * @param {string} title - Başlık
   * @param {Object} config - Konfigürasyon
   * @param {string} notificationId - Bildirim ID
   * @returns {HTMLElement} Toast elementi
   */
  createToastNotification(title, config, notificationId) {
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${config.type}`;
    toast.setAttribute('data-notification-id', notificationId);

    toast.style.cssText = `
      position: fixed;
      ${this.getPositionStyles(config.position)};
      background: ${this.getNotificationColor(config.type)};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      max-width: 400px;
      min-width: 300px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      cursor: pointer;
    `;

    // İkon
    const icon = document.createElement('div');
    icon.style.cssText = `
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    icon.textContent = this.getNotificationIcon(config.type);

    // İçerik
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      min-width: 0;
    `;

    const titleElement = document.createElement('div');
    titleElement.style.cssText = `
      font-weight: 600;
      margin-bottom: 4px;
      word-wrap: break-word;
    `;
    titleElement.textContent = title;

    const bodyElement = document.createElement('div');
    bodyElement.style.cssText = `
      font-size: 14px;
      opacity: 0.9;
      word-wrap: break-word;
    `;
    bodyElement.textContent = config.body;

    content.appendChild(titleElement);
    content.appendChild(bodyElement);

    // Progress bar
    if (config.showProgress) {
      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        margin-top: 8px;
        overflow: hidden;
      `;

      const progressFill = document.createElement('div');
      progressFill.style.cssText = `
        height: 100%;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 2px;
        transition: width 0.3s ease;
        width: ${config.progress}%;
      `;

      progressBar.appendChild(progressFill);
      content.appendChild(progressBar);
    }

    // Kapat butonu
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s;
    `;
    closeBtn.textContent = '×';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.closeNotification(notificationId);
    };

    closeBtn.onmouseenter = () => {
      closeBtn.style.opacity = '1';
    };

    closeBtn.onmouseleave = () => {
      closeBtn.style.opacity = '0.7';
    };

    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(closeBtn);

    // Tıklama olayı
    toast.onclick = () => {
      if (config.onClick) {
        config.onClick({ target: toast }, notificationId);
      }
      this.closeNotification(notificationId);
    };

    // DOM'a ekle
    document.body.appendChild(toast);

    // Animasyon ile göster
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);

    return toast;
  }

  /**
   * Pozisyon stillerini al
   * @param {string} position - Pozisyon
   * @returns {string} CSS stilleri
   */
  getPositionStyles(position) {
    const positions = {
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-center': 'top: 20px; left: 50%; transform: translateX(-50%);',
      'bottom-center': 'bottom: 20px; left: 50%; transform: translateX(-50%);'
    };

    return positions[position] || positions['top-right'];
  }

  /**
   * Bildirim rengini al
   * @param {string} type - Tip
   * @returns {string} Renk
   */
  getNotificationColor(type) {
    const colors = {
      'success': '#10b981',
      'error': '#ef4444',
      'warning': '#f59e0b',
      'info': '#3b82f6',
      'default': '#6b7280'
    };

    return colors[type] || colors['default'];
  }

  /**
   * Bildirim ikonunu al
   * @param {string} type - Tip
   * @returns {string} İkon
   */
  getNotificationIcon(type) {
    const icons = {
      'success': '✓',
      'error': '✕',
      'warning': '⚠',
      'info': 'ℹ',
      'default': '📢'
    };

    return icons[type] || icons['default'];
  }

  /**
   * Bildirimi kapat
   * @param {string} notificationId - Bildirim ID
   */
  closeNotification(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    // Browser bildirimini kapat
    if (notification.browserNotification) {
      notification.browserNotification.close();
    }

    // Toast bildirimini kapat
    if (notification.toastNotification && notification.toastNotification.parentNode) {
      notification.toastNotification.style.transform = 'translateX(100%)';

      setTimeout(() => {
        if (notification.toastNotification.parentNode) {
          notification.toastNotification.parentNode.removeChild(notification.toastNotification);
        }
      }, 300);
    }

    // Event tetikle
    if (notification.config.onClose) {
      notification.config.onClose({}, notificationId);
    }

    // Bildirim bilgisini sil
    this.notifications.delete(notificationId);
  }

  /**
   * Tüm bildirimleri kapat
   */
  closeAllNotifications() {
    for (const notificationId of this.notifications.keys()) {
      this.closeNotification(notificationId);
    }
  }

  /**
   * Bildirim şablonu oluştur
   * @param {string} name - Şablon adı
   * @param {Function} template - Şablon fonksiyonu
   */
  createTemplate(name, template) {
    this.templates.set(name, template);
  }

  /**
   * Şablonlu bildirim göster
   * @param {string} templateName - Şablon adı
   * @param {Object} data - Veri
   * @param {Object} options - Seçenekler
   */
  async showTemplateNotification(templateName, data, options = {}) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const { title, body, ...templateOptions } = template(data);

    return this.showNotification(title, {
      body,
      ...templateOptions,
      ...options
    });
  }

  /**
   * Bildirim sesi çal
   * @param {string} type - Bildirim tipi
   */
  playNotificationSound(type) {
    try {
      const audio = new Audio();

      // Farklı sesler için URL'ler
      const sounds = {
        'success': '/sounds/success.mp3',
        'error': '/sounds/error.mp3',
        'warning': '/sounds/warning.mp3',
        'info': '/sounds/info.mp3',
        'default': '/sounds/default.mp3'
      };

      audio.src = sounds[type] || sounds['default'];
      audio.volume = 0.3;
      audio.play().catch(error => {
        console.warn('Notification sound play failed:', error);
      });
    } catch (error) {
      console.warn('Notification sound failed:', error);
    }
  }

  /**
   * Titreşim yap
   * @param {string} type - Bildirim tipi
   */
  vibrate(type) {
    if (!('vibrate' in navigator)) return;

    const patterns = {
      'success': [200, 100, 200],
      'error': [100, 50, 100, 50, 100],
      'warning': [200, 100],
      'info': [100],
      'default': [100]
    };

    try {
      navigator.vibrate(patterns[type] || patterns['default']);
    } catch (error) {
      console.warn('Vibration failed:', error);
    }
  }

  /**
   * Bildirim ID'si oluştur
   * @returns {string} Bildirim ID
   */
  generateNotificationId() {
    return 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Varsayılan şablonları yükle
   */
  loadDefaultTemplates() {
    // Yeni mesaj şablonu
    this.createTemplate('new_message', (data) => ({
      title: `Yeni mesaj: ${data.sender}`,
      body: data.message,
      type: 'info',
      icon: '/icons/message.png',
      data: { sessionId: data.sessionId }
    }));

    // Sistem bildirimi şablonu
    this.createTemplate('system', (data) => ({
      title: data.title || 'Sistem Bildirimi',
      body: data.message,
      type: data.type || 'info',
      data: { system: true }
    }));

    // Hata şablonu
    this.createTemplate('error', (data) => ({
      title: 'Hata',
      body: data.message,
      type: 'error',
      requireInteraction: true
    }));
  }

  /**
   * Event listener'ları kur
   */
  setupEventListeners() {
    // Sayfa görünürlük değişimi
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Sayfa görünür olduğunda okunmamış bildirimleri işaretle
        this.markAllAsRead();
      }
    });

    // Sayfa odağı
    window.addEventListener('focus', () => {
      this.markAllAsRead();
    });
  }

  /**
   * Tüm bildirimleri okundu olarak işaretle
   */
  markAllAsRead() {
    for (const notification of this.notifications.values()) {
      notification.isRead = true;
    }
  }

  /**
   * Bildirim sayısını al
   * @returns {number} Bildirim sayısı
   */
  getNotificationCount() {
    return this.notifications.size;
  }

  /**
   * Okunmamış bildirim sayısını al
   * @returns {number} Okunmamış bildirim sayısı
   */
  getUnreadCount() {
    let count = 0;
    for (const notification of this.notifications.values()) {
      if (!notification.isRead) {
        count++;
      }
    }
    return count;
  }

  /**
   * İzin durumunu al
   * @returns {string} İzin durumu
   */
  getPermissionStatus() {
    return this.permission;
  }

  /**
   * Servisi temizle
   */
  destroy() {
    this.closeAllNotifications();
    this.templates.clear();
    console.log('Notification Service destroyed');
  }
}

// Singleton pattern ile export et
const notificationService = new NotificationService();

// Global'e ekle
if (typeof window !== 'undefined') {
  window.notificationService = notificationService;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NotificationService, notificationService };
}