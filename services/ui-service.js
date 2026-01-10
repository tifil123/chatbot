/**
 * UI Service Katmanı
 * Tüm UI işlemleri için merkezi servis
 */

class UIService {
  constructor() {
    this.modals = new Map();
    this.toasts = new Map();
    this.activeModal = null;
    this.toastContainer = null;
    this.defaultOptions = {
      toastDuration: 3000,
      toastPosition: 'bottom-right',
      modalCloseOnEscape: true,
      modalCloseOnOverlay: true
    };
    this.init();
  }

  /**
   * Servisi başlat
   */
  init() {
    this.createToastContainer();
    this.setupGlobalEventListeners();
    console.log('UI Service initialized');
  }

  /**
   * Toast container oluştur
   */
  createToastContainer() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'toast-container';
    this.toastContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: var(--z-toast);
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(this.toastContainer);
  }

  /**
   * Global event listener'ları kur
   */
  setupGlobalEventListeners() {
    // ESC tuşu ile modal kapatma
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.defaultOptions.modalCloseOnEscape) {
        this.closeTopModal();
      }
    });

    // Overlay tıklayınca modal kapatma
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay') && this.defaultOptions.modalCloseOnOverlay) {
        this.closeModal(this.activeModal);
      }
    });
  }

  /**
   * Universal toast sistemi
   * @param {string} message - Mesaj
   * @param {string} type - Tip (success, error, warning, info)
   * @param {Object} options - Ek seçenekler
   */
  showToast(message, type = 'success', options = {}) {
    const config = { ...this.defaultOptions, ...options };
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      background: ${this.getToastColor(type)};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 250px;
      max-width: 400px;
      font-size: 14px;
      line-height: 1.4;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      margin-bottom: 8px;
    `;

    // Icon ekle
    const icon = document.createElement('span');
    icon.textContent = this.getToastIcon(type);
    icon.style.cssText = `
      font-size: 16px;
      flex-shrink: 0;
    `;
    toast.appendChild(icon);

    // Mesaj ekle
    const messageElement = document.createElement('span');
    messageElement.textContent = message;
    messageElement.style.cssText = `
      flex: 1;
      word-wrap: break-word;
    `;
    toast.appendChild(messageElement);

    // Kapat butonu ekle
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      margin-left: 8px;
      opacity: 0.8;
      transition: opacity 0.2s;
    `;
    closeBtn.addEventListener('click', () => this.removeToast(toastId));
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.8');
    toast.appendChild(closeBtn);

    // Toast'ı container'a ekle
    this.toastContainer.appendChild(toast);
    this.toasts.set(toastId, { element: toast, type, message });

    // Animasyon ile göster
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);

    // Otomatik kapatma
    if (config.toastDuration > 0) {
      setTimeout(() => {
        this.removeToast(toastId);
      }, config.toastDuration);
    }

    return toastId;
  }

  /**
   * Toast kaldır
   * @param {string} toastId - Toast ID
   */
  removeToast(toastId) {
    const toastData = this.toasts.get(toastId);
    if (!toastData) return;

    const { element } = toastData;
    element.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.toasts.delete(toastId);
    }, 300);
  }

  /**
   * Tüm toast'ları temizle
   */
  clearAllToasts() {
    this.toasts.forEach((_, toastId) => {
      this.removeToast(toastId);
    });
  }

  /**
   * Universal modal sistemi
   * @param {Object} options - Modal seçenekleri
   */
  showModal(options) {
    const config = {
      title: 'Modal',
      message: '',
      type: 'info',
      size: 'medium',
      confirmText: 'Tamam',
      cancelText: null,
      onConfirm: null,
      onCancel: null,
      content: null,
      closeOnEscape: true,
      closeOnOverlay: true,
      showCloseButton: true,
      ...options
    };

    const modalId = `modal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const modal = this.createModal(modalId, config);
    
    document.body.appendChild(modal);
    this.modals.set(modalId, { element: modal, config });
    this.activeModal = modalId;
    
    // Body scroll'u engelle
    document.body.style.overflow = 'hidden';
    
    // Animasyon ile göster
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    return modalId;
  }

  /**
   * Modal element'i oluştur
   * @param {string} modalId - Modal ID
   * @param {Object} config - Modal konfigürasyonu
   */
  createModal(modalId, config) {
    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal-backdrop);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      backdrop-filter: blur(4px);
    `;

    const modal = document.createElement('div');
    modal.className = `modal modal-${config.size} modal-${config.type}`;
    modal.style.cssText = `
      background: var(--bg-card);
      border-radius: 16px;
      max-width: ${this.getModalWidth(config.size)};
      width: 90%;
      max-height: 90vh;
      border: 1px solid var(--border-color);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s ease;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // Modal içeriği oluştur
    modal.innerHTML = this.getModalContent(config);

    overlay.appendChild(modal);

    // Event listener'ları ekle
    this.setupModalEventListeners(overlay, modalId, config);

    return overlay;
  }

  /**
   * Modal içeriğini oluştur
   * @param {Object} config - Modal konfigürasyonu
   */
  getModalContent(config) {
    let content = '';

    // Header
    if (config.title || config.showCloseButton) {
      content += `
        <div class="modal-header" style="
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        ">
          <h3 class="modal-title" style="
            margin: 0;
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-primary);
          ">${config.title}</h3>
          ${config.showCloseButton ? `
            <button class="modal-close" data-action="close" style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: none;
              background: rgba(255, 255, 255, 0.1);
              color: var(--text-secondary);
              cursor: pointer;
              font-size: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: background 0.2s;
            ">×</button>
          ` : ''}
        </div>
      `;
    }

    // Body
    content += `
      <div class="modal-body" style="
        padding: 20px;
        flex: 1;
        overflow-y: auto;
        color: var(--text-secondary);
        line-height: 1.6;
      ">
        ${config.message ? `<p style="margin: 0 0 16px 0;">${config.message}</p>` : ''}
        ${config.content || ''}
      </div>
    `;

    // Footer
    if (config.confirmText || config.cancelText) {
      content += `
        <div class="modal-footer" style="
          padding: 20px;
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          flex-shrink: 0;
        ">
          ${config.cancelText ? `
            <button class="btn btn-ghost" data-action="cancel">${config.cancelText}</button>
          ` : ''}
          ${config.confirmText ? `
            <button class="btn btn-${config.type === 'danger' ? 'danger' : 'primary'}" data-action="confirm">${config.confirmText}</button>
          ` : ''}
        </div>
      `;
    }

    return content;
  }

  /**
   * Modal event listener'larını kur
   * @param {HTMLElement} overlay - Modal overlay
   * @param {string} modalId - Modal ID
   * @param {Object} config - Modal konfigürasyonu
   */
  setupModalEventListeners(overlay, modalId, config) {
    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      
      if (action === 'confirm' && config.onConfirm) {
        config.onConfirm();
        this.closeModal(modalId);
      } else if (action === 'cancel' && config.onCancel) {
        config.onCancel();
        this.closeModal(modalId);
      } else if (action === 'close') {
        this.closeModal(modalId);
      }
    });

    // ESC tuşu
    if (config.closeOnEscape) {
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          this.closeModal(modalId);
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
    }

    // Overlay tıklama
    if (config.closeOnOverlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(modalId);
        }
      });
    }
  }

  /**
   * Modal kapat
   * @param {string} modalId - Modal ID
   */
  closeModal(modalId) {
    const modalData = this.modals.get(modalId);
    if (!modalData) return;

    const { element } = modalData;
    element.classList.remove('show');

    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.modals.delete(modalId);
      
      if (this.activeModal === modalId) {
        this.activeModal = null;
        document.body.style.overflow = '';
      }
    }, 300);
  }

  /**
   * En üstteki modal'ı kapat
   */
  closeTopModal() {
    if (this.activeModal) {
      this.closeModal(this.activeModal);
    }
  }

  /**
   * Tüm modalları kapat
   */
  closeAllModals() {
    this.modals.forEach((_, modalId) => {
      this.closeModal(modalId);
    });
  }

  /**
   * Badge güncelleme
   * @param {string} elementId - Element ID
   * @param {number} count - Sayı
   */
  updateBadge(elementId, count) {
    const badge = document.getElementById(elementId);
    if (!badge) return;

    badge.textContent = count;
    badge.classList.toggle('show', count > 0);
  }

  /**
   * Loading spinner göster
   * @param {string} containerId - Container ID
   * @param {Object} options - Seçenekler
   */
  showLoading(containerId, options = {}) {
    const config = {
      size: 'medium',
      text: 'Yükleniyor...',
      overlay: true,
      ...options
    };

    const container = document.getElementById(containerId);
    if (!container) return;

    const loadingId = `loading-${Date.now()}`;
    const loading = document.createElement('div');
    loading.id = loadingId;
    loading.className = 'loading-overlay';
    loading.style.cssText = `
      position: absolute;
      inset: 0;
      background: ${config.overlay ? 'rgba(0, 0, 0, 0.5)' : 'transparent'};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal);
      gap: 12px;
    `;

    // Spinner
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.style.cssText = `
      width: ${this.getSpinnerSize(config.size)};
      height: ${this.getSpinnerSize(config.size)};
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;
    loading.appendChild(spinner);

    // Text
    if (config.text) {
      const text = document.createElement('div');
      text.textContent = config.text;
      text.style.cssText = `
        color: white;
        font-size: 14px;
        font-weight: 500;
      `;
      loading.appendChild(text);
    }

    container.style.position = 'relative';
    container.appendChild(loading);

    return loadingId;
  }

  /**
   * Loading spinner gizle
   * @param {string} loadingId - Loading ID
   */
  hideLoading(loadingId) {
    const loading = document.getElementById(loadingId);
    if (loading && loading.parentNode) {
      loading.parentNode.removeChild(loading);
    }
  }

  /**
   * Toast rengini al
   * @param {string} type - Tip
   */
  getToastColor(type) {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    return colors[type] || colors.info;
  }

  /**
   * Toast icon'unu al
   * @param {string} type - Tip
   */
  getToastIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  /**
   * Modal genişliğini al
   * @param {string} size - Boyut
   */
  getModalWidth(size) {
    const widths = {
      small: '400px',
      medium: '550px',
      large: '800px',
      fullscreen: '100vw'
    };
    return widths[size] || widths.medium;
  }

  /**
   * Spinner boyutunu al
   * @param {string} size - Boyut
   */
  getSpinnerSize(size) {
    const sizes = {
      small: '24px',
      medium: '32px',
      large: '48px'
    };
    return sizes[size] || sizes.medium;
  }

  /**
   * Confirm dialog göster
   * @param {string} message - Mesaj
   * @param {string} title - Başlık
   * @param {Function} onConfirm - Onay callback
   * @param {Function} onCancel - İptal callback
   */
  confirm(message, title = 'Emin misiniz?', onConfirm, onCancel) {
    return this.showModal({
      title,
      message,
      type: 'warning',
      confirmText: 'Evet',
      cancelText: 'İptal',
      onConfirm,
      onCancel
    });
  }

  /**
   * Alert dialog göster
   * @param {string} message - Mesaj
   * @param {string} title - Başlık
   * @param {string} type - Tip
   */
  alert(message, title = 'Bilgi', type = 'info') {
    return this.showModal({
      title,
      message,
      type,
      confirmText: 'Tamam'
    });
  }

  /**
   * Servisi temizle
   */
  destroy() {
    this.closeAllModals();
    this.clearAllToasts();
    
    if (this.toastContainer && this.toastContainer.parentNode) {
      this.toastContainer.parentNode.removeChild(this.toastContainer);
    }
  }
}

// Singleton pattern ile export et
const uiService = new UIService();

// Global'e ekle
if (typeof window !== 'undefined') {
  window.uiService = uiService;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UIService, uiService };
}