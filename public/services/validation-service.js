/**
 * Validation Service Katmanı
 * Input doğrulama ve sanitizasyon için merkezi servis
 */

class ValidationService {
  constructor() {
    this.rules = {
      // Genel kurallar
      required: (value) => value && value.trim().length > 0,
      minLength: (value, min) => value && value.length >= min,
      maxLength: (value, max) => value && value.length <= max,
      email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      phone: (value) => /^(\+90|0)?[0-9]{10}$/.test(value.replace(/\s/g, '')),
      url: (value) => /^https?:\/\/.+\..+/.test(value),
      number: (value) => !isNaN(parseFloat(value)) && isFinite(value),
      integer: (value) => Number.isInteger(Number(value)),
      
      // Özel kurallar
      turkishText: (value) => /^[\s\u00C0-\u017Fa-zA-Z0-9.,!?;:'"()\-]+$/.test(value),
      username: (value) => /^[a-zA-Z0-9_]{3,20}$/.test(value),
      password: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(value),
      
      // Mesaj kuralları
      message: (value) => {
        const cleanValue = this.sanitizeInput(value);
        return cleanValue && cleanValue.length >= 1 && cleanValue.length <= 1000;
      },
      
      // Dosya kuralları
      fileName: (value) => /^[a-zA-Z0-9._-]+$/.test(value),
      fileSize: (size, maxSize) => size <= maxSize,
      fileExtension: (filename, allowedExtensions) => {
        const ext = filename.split('.').pop().toLowerCase();
        return allowedExtensions.includes(ext);
      }
    };
    
    this.errorMessages = {
      required: 'Bu alan zorunludur',
      minLength: 'En az {min} karakter olmalıdır',
      maxLength: 'En fazla {max} karakter olabilir',
      email: 'Geçerli bir e-posta adresi giriniz',
      phone: 'Geçerli bir telefon numarası giriniz',
      url: 'Geçerli bir URL giriniz',
      number: 'Geçerli bir sayı giriniz',
      integer: 'Tam sayı giriniz',
      turkishText: 'Sadece Türkçe karakterler giriniz',
      username: 'Kullanıcı adı 3-20 karakter arasında olmalı ve sadece harf, rakam, _ içerebilir',
      password: 'Şifre en az 8 karakter olmalı ve 1 büyük harf, 1 küçük harf, 1 rakam içermelidir',
      message: 'Mesaj 1-1000 karakter arasında olmalıdır',
      fileName: 'Dosya adı sadece harf, rakam, ., _, - içerebilir',
      fileSize: 'Dosya boyutu {maxSize} bayt\'ı geçemez',
      fileExtension: 'İzin verilmeyen dosya türü'
    };
    
    this.sanitizePatterns = [
      { pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, replacement: '' },
      { pattern: /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, replacement: '' },
      { pattern: /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, replacement: '' },
      { pattern: /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, replacement: '' },
      { pattern: /javascript:/gi, replacement: '' },
      { pattern: /on\w+\s*=/gi, replacement: '' },
      { pattern: /eval\s*\(/gi, replacement: '' },
      { pattern: /expression\s*\(/gi, replacement: '' }
    ];
  }

  /**
   * Servisi başlat
   * @param {Object} options - Seçenekler
   */
  init(options = {}) {
    console.log('Validation Service initialized');
    return true;
  }

  /**
   * Input'u sanitize et
   * @param {string} input - Temizlenecek input
   * @param {Object} options - Seçenekler
   * @returns {string} Temizlenmiş input
   */
  sanitizeInput(input, options = {}) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const defaults = {
      removeHTML: true,
      trim: true,
      maxLength: 1000,
      allowLineBreaks: false,
      preserveCase: true
    };

    const config = { ...defaults, ...options };
    let cleaned = input;

    // HTML etiketlerini kaldır
    if (config.removeHTML) {
      this.sanitizePatterns.forEach(({ pattern, replacement }) => {
        cleaned = cleaned.replace(pattern, replacement);
      });
      
      // Genel HTML etiketlerini kaldır
      cleaned = cleaned.replace(/<[^>]*>/g, '');
    }

    // Boşlukları temizle
    if (config.trim) {
      cleaned = cleaned.trim();
    }

    // Satır sonlarını işle
    if (!config.allowLineBreaks) {
      cleaned = cleaned.replace(/[\r\n]+/g, ' ');
    }

    // Fazla boşlukları temizle
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Maksimum uzunluk
    if (config.maxLength && cleaned.length > config.maxLength) {
      cleaned = cleaned.substring(0, config.maxLength);
    }

    // Case koruma
    if (!config.preserveCase) {
      cleaned = cleaned.toLowerCase();
    }

    return cleaned;
  }

  /**
   * Alanı doğrula
   * @param {string} fieldName - Alan adı
   * @param {any} value - Değer
   * @param {Array} rules - Kural listesi
   * @param {Object} params - Parametreler
   * @returns {Object} Doğrulama sonucu
   */
  validateField(fieldName, value, rules, params = {}) {
    const errors = [];
    const warnings = [];

    for (const rule of rules) {
      let ruleName = rule;
      let ruleParams = {};

      if (typeof rule === 'object') {
        ruleName = rule.name;
        ruleParams = rule.params || {};
      }

      const validator = this.rules[ruleName];
      if (!validator) {
        warnings.push(`Bilinmeyen kural: ${ruleName}`);
        continue;
      }

      const ruleValue = ruleParams.value !== undefined ? ruleParams.value : value;
      const isValid = validator(ruleValue, ruleParams.min || ruleParams.max || ruleParams.length, ruleParams);

      if (!isValid) {
        const message = ruleParams.message || this.getErrorMessage(ruleName, ruleParams);
        errors.push({
          field: fieldName,
          rule: ruleName,
          message,
          value: ruleValue
        });
      }
    }

    return {
      field: fieldName,
      value,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Mesajı doğrula
   * @param {string} message - Mesaj
   * @param {Object} options - Seçenekler
   * @returns {Object} Doğrulama sonucu
   */
  validateMessage(message, options = {}) {
    const defaults = {
      minLength: 1,
      maxLength: 1000,
      allowHTML: false,
      allowLineBreaks: true,
      checkSpam: true,
      checkProfanity: false
    };

    const config = { ...defaults, ...options };
    
    // Önce sanitize et
    const sanitizedMessage = this.sanitizeInput(message, {
      removeHTML: !config.allowHTML,
      allowLineBreaks: config.allowLineBreaks,
      maxLength: config.maxLength
    });

    const rules = [
      'required',
      { name: 'minLength', params: { min: config.minLength } },
      { name: 'maxLength', params: { max: config.maxLength } },
      'message'
    ];

    const result = this.validateField('message', sanitizedMessage, rules);

    // Spam kontrolü
    if (config.checkSpam) {
      const spamResult = this.checkSpam(sanitizedMessage);
      if (spamResult.isSpam) {
        result.errors.push({
          field: 'message',
          rule: 'spam',
          message: 'Mesaj spam olarak algılandı',
          details: spamResult.reasons
        });
        result.isValid = false;
      }
    }

    // Küfür kontrolü
    if (config.checkProfanity) {
      const profanityResult = this.checkProfanity(sanitizedMessage);
      if (profanityResult.hasProfanity) {
        result.warnings.push({
          field: 'message',
          rule: 'profanity',
          message: 'Mesaj uygunsuz içerik içerebilir',
          words: profanityResult.words
        });
      }
    }

    return {
      ...result,
      sanitizedMessage,
      originalMessage: message
    };
  }

  /**
   * Dosyayı doğrula
   * @param {File} file - Dosya objesi
   * @param {Object} options - Seçenekler
   * @returns {Object} Doğrulama sonucu
   */
  validateFile(file, options = {}) {
    const defaults = {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain'],
      allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'txt'],
      requireName: true
    };

    const config = { ...defaults, ...options };
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

    // Dosya adı kontrolü
    if (config.requireName && !file.name) {
      errors.push({
        field: 'file',
        rule: 'fileName',
        message: 'Dosya adı gerekli'
      });
    }

    // Dosya adı formatı
    if (file.name && !this.rules.fileName(file.name)) {
      errors.push({
        field: 'file',
        rule: 'fileName',
        message: 'Geçersiz dosya adı formatı'
      });
    }

    // Dosya boyutu
    if (!this.rules.fileSize(file.size, config.maxSize)) {
      errors.push({
        field: 'file',
        rule: 'fileSize',
        message: this.errorMessages.fileSize.replace('{maxSize}', this.formatFileSize(config.maxSize))
      });
    }

    // MIME tipi kontrolü
    if (config.allowedTypes && !config.allowedTypes.includes(file.type)) {
      errors.push({
        field: 'file',
        rule: 'fileType',
        message: 'İzin verilmeyen dosya türü'
      });
    }

    // Dosya uzantısı kontrolü
    if (config.allowedExtensions && !this.rules.fileExtension(file.name, config.allowedExtensions)) {
      errors.push({
        field: 'file',
        rule: 'fileExtension',
        message: 'İzin verilmeyen dosya uzantısı'
      });
    }

    return {
      field: 'file',
      value: file,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Spam kontrolü
   * @param {string} text - Kontrol edilecek metin
   * @returns {Object} Spam kontrol sonucu
   */
  checkSpam(text) {
    const spamIndicators = [
      /click here/gi,
      /free money/gi,
      /win prize/gi,
      /limited offer/gi,
      /act now/gi,
      /buy now/gi,
      /https?:\/\/(?!localhost|127\.0\.0\.1)/gi,
      /\d{3}-\d{3}-\d{4}/g, // Telefon numarası
      /\b[A-Z]{2,}\b/g // Tüm büyük harfli kelimeler
    ];

    const reasons = [];
    let score = 0;

    spamIndicators.forEach((pattern, index) => {
      if (pattern.test(text)) {
        reasons.push(`Spam indicator ${index + 1} detected`);
        score += 10;
      }
    });

    // Tekrarlayan karakterler kontrolü
    if (/(.)\1{3,}/.test(text)) {
      reasons.push('Repeating characters detected');
      score += 5;
    }

    // Çok fazla büyük harf kontrolü
    const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (upperCaseRatio > 0.5) {
      reasons.push('Too many uppercase letters');
      score += 5;
    }

    return {
      isSpam: score >= 15,
      score,
      reasons
    };
  }

  /**
   * Küfür kontrolü
   * @param {string} text - Kontrol edilecek metin
   * @returns {Object} Küfür kontrol sonucu
   */
  checkProfanity(text) {
    const profanityList = [
      'küfür1', 'küfür2', 'küfür3', // Gerçek projede gerçek küfür listesi olmalı
      'badword1', 'badword2', 'badword3'
    ];

    const words = text.toLowerCase().split(/\s+/);
    const foundWords = [];

    words.forEach(word => {
      if (profanityList.includes(word)) {
        foundWords.push(word);
      }
    });

    return {
      hasProfanity: foundWords.length > 0,
      words: foundWords,
      count: foundWords.length
    };
  }

  /**
   * Hata mesajını al
   * @param {string} ruleName - Kural adı
   * @param {Object} params - Parametreler
   * @returns {string} Hata mesajı
   */
  getErrorMessage(ruleName, params = {}) {
    let message = this.errorMessages[ruleName] || 'Geçersiz değer';
    
    // Parametreleri yerine koy
    Object.keys(params).forEach(key => {
      message = message.replace(`{${key}}`, params[key]);
    });

    return message;
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
   * Formu doğrula
   * @param {Object} formData - Form verileri
   * @param {Object} schema - Doğrulama şeması
   * @returns {Object} Doğrulama sonucu
   */
  validateForm(formData, schema) {
    const results = {};
    let isValid = true;

    Object.keys(schema).forEach(fieldName => {
      const fieldRules = schema[fieldName];
      const fieldValue = formData[fieldName];
      
      const result = this.validateField(fieldName, fieldValue, fieldRules);
      results[fieldName] = result;
      
      if (!result.isValid) {
        isValid = false;
      }
    });

    return {
      isValid,
      results,
      errors: Object.values(results).flatMap(r => r.errors),
      warnings: Object.values(results).flatMap(r => r.warnings)
    };
  }

  /**
   * Yeni kural ekle
   * @param {string} name - Kural adı
   * @param {Function} validator - Doğrulama fonksiyonu
   * @param {string} errorMessage - Hata mesajı
   */
  addRule(name, validator, errorMessage) {
    this.rules[name] = validator;
    this.errorMessages[name] = errorMessage;
  }

  /**
   * Servisi temizle
   */
  destroy() {
    this.rules = {};
    this.errorMessages = {};
    console.log('Validation Service destroyed');
  }
}

// Singleton pattern ile export et
const validationService = new ValidationService();

// Global'e ekle
if (typeof window !== 'undefined') {
  window.validationService = validationService;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ValidationService, validationService };
}