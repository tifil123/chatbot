/**
 * File Service Katmanı
 * Dosya yükleme ve yönetim için merkezi servis
 */

class FileService {
  constructor() {
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    this.allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'pdf', 'doc', 'docx'];
    this.uploadEndpoint = '/api/upload';
    this.chunkSize = 1024 * 1024; // 1MB chunks
    this.maxConcurrentUploads = 3;
    this.activeUploads = new Map();
    this.uploadQueue = [];
    this.isProcessing = false;
  }

  /**
   * Servisi başlat
   * @param {Object} options - Seçenekler
   */
  init(options = {}) {
    console.log('File Service initialized');
    return true;
  }

  /**
   * Dosya yükle
   * @param {File} file - Yüklenecek dosya
   * @param {Object} options - Yükleme seçenekleri
   * @returns {Promise} Yükleme sonucu
   */
  async uploadFile(file, options = {}) {
    const uploadId = this.generateUploadId();
    const defaults = {
      sessionId: null,
      userId: null,
      chunked: true,
      compress: false,
      encrypt: false,
      onProgress: null,
      onComplete: null,
      onError: null
    };

    const config = { ...defaults, ...options };

    try {
      // Dosya doğrulaması
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.map(e => e.message).join(', '));
      }

      // Yükleme bilgisini kaydet
      const uploadInfo = {
        id: uploadId,
        file,
        config,
        startTime: Date.now(),
        status: 'preparing',
        progress: 0,
        bytesUploaded: 0,
        totalBytes: file.size
      };

      this.activeUploads.set(uploadId, uploadInfo);

      // Dosya işlemleri
      let processedFile = file;
      
      if (config.compress && this.isImageFile(file)) {
        processedFile = await this.compressImage(file);
      }

      if (config.encrypt) {
        processedFile = await this.encryptFile(processedFile);
      }

      // Yükleme metodunu seç
      let result;
      if (config.chunked && processedFile.size > this.chunkSize) {
        result = await this.uploadInChunks(uploadId, processedFile, config);
      } else {
        result = await this.uploadSingle(uploadId, processedFile, config);
      }

      // Yükleme tamamlandı
      uploadInfo.status = 'completed';
      uploadInfo.progress = 100;
      uploadInfo.bytesUploaded = uploadInfo.totalBytes;
      uploadInfo.endTime = Date.now();
      uploadInfo.duration = uploadInfo.endTime - uploadInfo.startTime;

      if (config.onComplete) {
        config.onComplete(result);
      }

      return result;

    } catch (error) {
      const uploadInfo = this.activeUploads.get(uploadId);
      if (uploadInfo) {
        uploadInfo.status = 'error';
        uploadInfo.error = error.message;
        uploadInfo.endTime = Date.now();
      }

      if (config.onError) {
        config.onError(error);
      }

      throw error;
    } finally {
      // Temizlik
      setTimeout(() => {
        this.activeUploads.delete(uploadId);
      }, 5000);
    }
  }

  /**
   * Yükleme ID'si oluştur
   * @returns {string} Yükleme ID
   */
  generateUploadId() {
    return 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Dosyayı doğrula
   * @param {File} file - Dosya
   * @returns {Object} Doğrulama sonucu
   */
  validateFile(file) {
    const errors = [];
    const warnings = [];

    // Dosya var mı?
    if (!file) {
      errors.push({
        field: 'file',
        rule: 'required',
        message: 'Dosya seçilmedi'
      });
      return { isValid: false, errors, warnings };
    }

    // Dosya boyutu
    if (file.size > this.maxFileSize) {
      errors.push({
        field: 'file',
        rule: 'fileSize',
        message: `Dosya boyutu ${this.formatFileSize(this.maxFileSize)}'ı geçemez`
      });
    }

    // MIME tipi
    if (!this.allowedTypes.includes(file.type)) {
      errors.push({
        field: 'file',
        rule: 'fileType',
        message: 'İzin verilmeyen dosya türü'
      });
    }

    // Dosya uzantısı
    const extension = file.name.split('.').pop().toLowerCase();
    if (!this.allowedExtensions.includes(extension)) {
      errors.push({
        field: 'file',
        rule: 'fileExtension',
        message: 'İzin verilmeyen dosya uzantısı'
      });
    }

    // Dosya adı
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      warnings.push({
        field: 'file',
        rule: 'fileName',
        message: 'Dosya adı özel karakterler içeriyor'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Resim dosyası mı kontrol et
   * @param {File} file - Dosya
   * @returns {boolean} Resim ise true
   */
  isImageFile(file) {
    return file.type.startsWith('image/');
  }

  /**
   * Resmi sıkıştır
   * @param {File} file - Resim dosyası
   * @returns {Promise<File>} Sıkıştırılmış dosya
   */
  async compressImage(file) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Maksimum boyutlar
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = img.width;
        let height = img.height;

        // Boyutları ayarla
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Resmi çiz ve sıkıştır
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, file.type, 0.8);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Dosyayı şifrele (basit implementasyon)
   * @param {File} file - Dosya
   * @returns {Promise<File>} Şifrelenmiş dosya
   */
  async encryptFile(file) {
    // Gerçek uygulamada daha güçlü şifreleme kullanılmalı
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Basit XOR şifreleme (sadece örnek)
    const key = 123; // Gerçek uygulamada rastgele anahtar kullanılmalı
    for (let i = 0; i < uint8Array.length; i++) {
      uint8Array[i] ^= key;
    }
    
    const encryptedBlob = new Blob([uint8Array], { type: file.type });
    const encryptedFile = new File([encryptedBlob], file.name + '.encrypted', {
      type: file.type,
      lastModified: Date.now()
    });
    
    return encryptedFile;
  }

  /**
   * Dosya boyutunu formatla
   * @param {number} bytes - Bayt cinsinden boyut
   * @returns {string} Formatlanmış boyut
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Aktif yüklemeleri al
   * @returns {Array} Aktif yüklemeler
   */
  getActiveUploads() {
    return Array.from(this.activeUploads.values());
  }

  /**
   * Yüklemeyi iptal et
   * @param {string} uploadId - Yükleme ID
   */
  cancelUpload(uploadId) {
    const uploadInfo = this.activeUploads.get(uploadId);
    if (uploadInfo) {
      uploadInfo.status = 'cancelled';
      uploadInfo.endTime = Date.now();
      
      // Gerçek uygulamada XMLHttpRequest.abort() kullanılmalı
      this.activeUploads.delete(uploadId);
    }
  }

  /**
   * Tüm yüklemeleri iptal et
   */
  cancelAllUploads() {
    for (const uploadId of this.activeUploads.keys()) {
      this.cancelUpload(uploadId);
    }
  }

  /**
   * Servisi temizle
   */
  destroy() {
    this.cancelAllUploads();
    this.uploadQueue = [];
    console.log('File Service destroyed');
  }
}

// Singleton pattern ile export et
const fileService = new FileService();

// Global'e ekle
if (typeof window !== 'undefined') {
  window.fileService = fileService;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FileService, fileService };
}