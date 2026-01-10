# Chatbot API Dokümantasyonu

## Genel Bakış

Bu API dokümantasyonu, Chatbot projesindeki tüm servislerin ve bileşenlerin kullanımını açıklar. API'ler modern JavaScript standartlarına göre tasarlanmıştır ve hem browser hem de Node.js ortamlarında çalışabilir.

## 📚 İçerik

- [Firebase Service](#firebase-service) - Veritabanı işlemleri
- [Cache Service](#cache-service) - Önbellek yönetimi
- [Rate Limit Service](#rate-limit-service) - İstek sınırlama
- [Validation Service](#validation-service) - Input doğrulama
- [Analytics Service](#analytics-service) - Analitik ve takip
- [File Service](#file-service) - Dosya yükleme
- [Notification Service](#notification-service) - Bildirim yönetimi
- [UI Service](#ui-service) - UI bileşenleri

---

## 🔥 Firebase Service

Firebase Realtime Database ile iletişim için merkezi servis.

### 🚀 Kurulum

```javascript
// Servisi import et
import { firebaseService } from './services/firebase-service.js';

// Veya script tag ile yükle
<script src="services/firebase-service.js"></script>
```

### 📋 Metotlar

#### `connect(config?)`
Firebase'e bağlanır.

```javascript
const db = await firebaseService.connect({
  databaseURL: 'https://your-project.firebaseio.com'
});
```

**Parametreler:**
- `config` (object, isteğe bağlı): Firebase konfigürasyonu
  - `databaseURL` (string): Veritabanı URL'i
  - `projectId` (string): Proje ID'si

**Döner:** `Promise<Object>` - Database referansı

#### `read(path)`
Belirtilen yoldaki veriyi okur.

```javascript
const data = await firebaseService.read('users/user1');
```

**Parametreler:**
- `path` (string): Veritabanı yolu

**Döner:** `Promise<any>` - Okunan veri

#### `write(path, data)`
Belirtilen yola veri yazar.

```javascript
await firebaseService.write('users/user1', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

**Parametreler:**
- `path` (string): Veritabanı yolu
- `data` (object): Yazılacak veri

**Döner:** `Promise<void>`

#### `update(path, data)`
Belirtilen yoldaki veriyi günceller.

```javascript
await firebaseService.update('users/user1', {
  lastSeen: Date.now()
});
```

**Parametreler:**
- `path` (string): Veritabanı yolu
- `data` (object): Güncellenecek veri

**Döner:** `Promise<void>`

#### `remove(path)`
Belirtilen yoldaki veriyi siler.

```javascript
await firebaseService.remove('users/user1');
```

**Parametreler:**
- `path` (string): Veritabanı yolu

**Döner:** `Promise<void>`

#### `subscribe(path, callback, eventType?)`
Belirtilen yoldaki değişiklikleri dinler.

```javascript
const unsubscribe = firebaseService.subscribe('messages', (snapshot) => {
  const data = snapshot.val();
  console.log('New message:', data);
}, 'child_added');
```

**Parametreler:**
- `path` (string): Veritabanı yolu
- `callback` (function): Callback fonksiyonu
- `eventType` (string): Event tipi ('value', 'child_added', vb.)

**Döner:** `Function` - Unsubscribe fonksiyonu

#### `getDatabase()`
Aktif database referansını döndürür.

```javascript
const db = firebaseService.getDatabase();
```

**Döner:** `Object` - Database referansı

---

## 💾 Cache Service

Veri önbellekleme için merkezi servis.

### 🚀 Kurulum

```javascript
import { cacheService } from './services/cache-service.js';
```

### 📋 Metotlar

#### `set(key, value, ttlMs?)`
Önbelleğe veri ekler.

```javascript
cacheService.set('user:123', { name: 'John' }, 300000); // 5 dakika
```

**Parametreler:**
- `key` (string): Cache anahtarı
- `value` (any): Değer
- `ttlMs` (number): TTL (milisaniye, varsayılan: 300000)

#### `get(key)`
Önbellekten veri alır.

```javascript
const userData = cacheService.get('user:123');
```

**Parametreler:**
- `key` (string): Cache anahtarı

**Döner:** `any` - Değer veya null

#### `getOrSet(key, callback, ttlMs?)`
Veriyi al veya yoksa callback ile oluşturur.

```javascript
const user = await cacheService.getOrSet('user:123', async () => {
  return await fetchUserFromAPI(123);
}, 600000); // 10 dakika
```

#### `delete(key)`
Önbellekten veri siler.

```javascript
cacheService.delete('user:123');
```

#### `clear()`
Tüm önbelleği temizler.

```javascript
cacheService.clear();
```

#### `getStats()`
Önbellek istatistiklerini alır.

```javascript
const stats = cacheService.getStats();
console.log('Cache size:', stats.size);
console.log('Hit rate:', stats.hitRate);
```

---

## 🚦 Rate Limit Service

İstek sınırlama ve güvenlik için servis.

### 🚀 Kurulum

```javascript
import { rateLimitService } from './services/rate-limit-service.js';
```

### 📋 Metotlar

#### `checkLimit(ip, limit?, windowMs?)`
IP adresinin limitini kontrol eder.

```javascript
const result = rateLimitService.checkLimit('192.168.1.1', 100, 60000);

if (result.allowed) {
  console.log('Request allowed');
} else {
  console.log('Request blocked:', result.reason);
  console.log('Retry after:', result.retryAfter, 'seconds');
}
```

**Parametreler:**
- `ip` (string): IP adresi
- `limit` (number): İstek limiti (varsayılan: 100)
- `windowMs` (number): Zaman penceresi (varsayılan: 60000)

**Döner:** `Object` - `{ allowed, reason, retryAfter, remainingRequests, resetTime }`

#### `checkMessageLimit(ip, sessionId)`
Mesaj gönderimi için özel limit kontrolü.

```javascript
const result = rateLimitService.checkMessageLimit('192.168.1.1', 'session123');
```

#### `getIPStatus(ip)`
IP adresinin durumunu alır.

```javascript
const status = rateLimitService.getIPStatus('192.168.1.1');
console.log('Reputation:', status.reputation);
console.log('Banned:', status.isBanned);
```

---

## ✅ Validation Service

Input doğrulama ve sanitizasyon için servis.

### 🚀 Kurulum

```javascript
import { validationService } from './services/validation-service.js';
```

### 📋 Metotlar

#### `sanitizeInput(input, options?)`
Input'u temizler.

```javascript
const cleanInput = validationService.sanitizeInput('<script>alert("xss")</script>', {
  removeHTML: true,
  maxLength: 100
});
```

#### `validateField(fieldName, value, rules, params?)`
Alanı doğrular.

```javascript
const result = validationService.validateField('email', 'test@example.com', [
  'required',
  'email'
]);

if (result.isValid) {
  console.log('Email is valid');
} else {
  console.log('Errors:', result.errors);
}
```

#### `validateMessage(message, options?)`
Mesajı doğrular.

```javascript
const result = validationService.validateMessage('Hello world!', {
  checkSpam: true,
  checkProfanity: true
});
```

#### `validateFile(file, options?)`
Dosyayı doğrular.

```javascript
const result = validationService.validateFile(file, {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png']
});
```

#### `validateForm(formData, schema)`
Formu doğrular.

```javascript
const result = validationService.validateForm({
  name: 'John',
  email: 'john@example.com',
  message: 'Hello!'
}, {
  name: ['required', 'minLength'],
  email: ['required', 'email'],
  message: ['required', 'maxLength']
});
```

---

## 📊 Analytics Service

Kullanıcı davranışlarını takip ve analiz için servis.

### 🚀 Kurulum

```javascript
import { analyticsService } from './services/analytics-service.js';
```

### 📋 Metotlar

#### `trackEvent(eventName, data?, options?)`
Event takibi yapar.

```javascript
analyticsService.trackEvent('button_click', {
  buttonId: 'submit',
  page: 'contact'
});
```

#### `trackPageView(page?, data?)`
Sayfa görüntüleme takibi.

```javascript
analyticsService.trackPageView('contact', {
  referrer: 'homepage'
});
```

#### `trackInteraction(action, element, data?)`
Kullanıcı etkileşimini takip eder.

```javascript
analyticsService.trackInteraction('click', 'submit_button', {
  form: 'contact'
});
```

#### `trackMessage(messageType, messageLength, responseTime, data?)`
Mesaj gönderimini takip eder.

```javascript
analyticsService.trackMessage('user', 25, 1500, {
  sessionId: 'session123'
});
```

#### `trackError(error, context?)`
Hata takibi yapar.

```javascript
analyticsService.trackError(new Error('Something went wrong'), {
  component: 'contact_form',
  action: 'submit'
});
```

#### `setUserId(userId)`
Kullanıcı ID'sini ayarlar.

```javascript
analyticsService.setUserId('user123');
```

---

## 📁 File Service

Dosya yükleme ve yönetim için servis.

### 🚀 Kurulum

```javascript
import { fileService } from './services/file-service.js';
```

### 📋 Metotlar

#### `uploadFile(file, options?)`
Dosya yükler.

```javascript
const result = await fileService.uploadFile(file, {
  sessionId: 'session123',
  onProgress: (progress) => {
    console.log('Upload progress:', progress + '%');
  },
  onComplete: (response) => {
    console.log('Upload completed:', response);
  },
  onError: (error) => {
    console.error('Upload failed:', error);
  }
});
```

#### `validateFile(file)`
Dosyayı doğrular.

```javascript
const validation = fileService.validateFile(file);
if (validation.isValid) {
  console.log('File is valid');
} else {
  console.log('Errors:', validation.errors);
}
```

#### `cancelUpload(uploadId)`
Yüklemeyi iptal eder.

```javascript
fileService.cancelUpload('upload_123');
```

---

## 🔔 Notification Service

Bildirim yönetimi için servis.

### 🚀 Kurulum

```javascript
import { notificationService } from './services/notification-service.js';
```

### 📋 Metotlar

#### `showNotification(title, options?)`
Bildirim gösterir.

```javascript
const notification = await notificationService.showNotification('New Message', {
  body: 'You have a new message',
  icon: '/icons/message.png',
  onClick: () => {
    console.log('Notification clicked');
  }
});
```

#### `requestPermission()`
Bildirim izni ister.

```javascript
const permission = await notificationService.requestPermission();
if (permission === 'granted') {
  console.log('Notification permission granted');
}
```

#### `showTemplateNotification(templateName, data, options?)`

Şablonlu bildirim gösterir.

```javascript
await notificationService.showTemplateNotification('new_message', {
  sender: 'John',
  message: 'Hello there!'
});
```

---

## 🎨 UI Service

UI bileşenleri için servis.

### 🚀 Kurulum

```javascript
import { uiService } from './services/ui-service.js';
```

### 📋 Metotlar

#### `showModal(options)`
Modal gösterir.

```javascript
const modalId = uiService.showModal({
  title: 'Confirm Action',
  message: 'Are you sure you want to proceed?',
  type: 'warning',
  confirmText: 'Yes',
  cancelText: 'No',
  onConfirm: () => {
    console.log('Confirmed');
  }
});
```

#### `showToast(message, type?, options?)`
Toast bildirimi gösterir.

```javascript
uiService.showToast('Operation completed successfully', 'success', {
  duration: 3000
});
```

#### `confirm(message, title?, onConfirm?, onCancel?)`

Onay dialog'u gösterir.

```javascript
uiService.confirm('Delete this item?', 'Confirm Delete', () => {
  console.log('Item deleted');
});
```

---

## 🔧 Konfigürasyon

### Firebase Konfigürasyonu

```javascript
// config/firebase-config.js
const FIREBASE_CONFIG = {
  databaseURL: 'https://your-project.firebaseio.com',
  projectId: 'your-project-id',
  environments: {
    development: {
      databaseURL: 'https://dev-project.firebaseio.com',
      debug: true
    },
    production: {
      databaseURL: 'https://prod-project.firebaseio.com',
      debug: false
    }
  }
};
```

### CSS Değişkenleri

```css
/* styles/variables.css */
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #10b981;
  --danger-color: #ef4444;
  --warning-color: #f59e0b;
  /* ... daha fazla değişken */
}
```

---

## 🌐 Tarayıcı Desteği

- **Chrome** 88+
- **Firefox** 85+
- **Safari** 14+
- **Edge** 88+

---

## 📱 Mobil Desteği

Tüm servisler mobil cihazlarda optimize edilmiştir:

- Responsive tasarım
- Touch gesture desteği
- Mobil performans optimizasyonu
- PWA desteği

---

## 🔒 Güvenlik

- Input sanitizasyon ve XSS koruması
- Rate limiting ve DDoS koruması
- CSRF koruması
- Veri validasyonu
- Güvenli dosya yükleme

---

## 🚀 Performans

- Lazy loading
- Code splitting
- Tree shaking
- Minification
- Caching stratejileri
- Optimized bundle boyutu

---

## 🧪 Test

Tüm servisler için birim testleri mevcuttur:

```bash
# Testleri çalıştır
npm test
# Veya browser'da
window.runFirebaseTests();
window.runValidationTests();
```

---

## 📝 Hata Ayıklama

Debug paneli kullanarak hata ayıklama yapabilirsiniz:

```javascript
// Debug panel'i aç
window.open('/src/debug-panel.html');
```

---

## 🔗 İlişkili Belgeler

- [Component Dokümantasyonu](components.md)
- [Kurulum Kılavuzu](../README.md)
- [Örnek Projeler](../examples/)

---

## 📄 Lisans

Bu proje MIT Lisansı altında dağıtılmaktadır. Detaylar için [LICENSE](../LICENSE) dosyasına bakın.

---

## 🤝 Katkıda Bulunma

Katkıda bulunmak için:

1. Projeyi forklayın
2. Yeni bir branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişiklikleri yapın (`git commit -am 'Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Bir Pull Request oluşturun

---

## 📞 Destek

Sorularınız veya önerileriniz için:

- 📧 Email: dev@chatbot.com
- 🐛 Issues: [GitHub Issues](https://github.com/chatbot-team/chatbot/issues)
- 📖 Dokümantasyon: [docs](https://docs.chatbot.com)

---

## 📈 Sürüm Geçmişi

### v2.0.0 (2025-12-11)
- 🆕 Yeni servisler eklendi
- 🎨 UI/UX iyileştirmeleri
- 📱 Mobil optimizasyonları
- 🔒 Güvenlik güçlendirmeleri
- 🚀 Performans iyileştirmeleri

### v1.0.0 (2025-11-01)
- 🎉 İlk sürüm
- 🔥 Firebase entegrasyonu
- 💬 Temel chatbot özellikleri
- 📊 Admin paneli

---

*Son güncelleme: 2025-12-11*