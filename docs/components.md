# Chatbot Component Dokümantasyonu

Bu dokümantasyon, Chatbot projesindeki tüm UI bileşenlerinin kullanımını açıklar. Her component, modern web standartlarına göre tasarlanmıştır ve kolayca özelleştirilebilir.

## 📋 İçerik

- [🎨 Tema Sistemi](#tema-sistemi)
- [🔘 Modal Bileşenleri](#modal-bilesenleri)
- [🔘 Button Bileşenleri](#button-bilesenleri)
- [🔘 Toast Bildirimleri](#toast-bildirimleri)
- [📊 Analytics Dashboard](#analytics-dashboard)
- [📱 Chat Widget](#chat-widget)
- [🎛️ Admin Panel](#admin-panel)
- [🔧 Debug Panel](#debug-panel)

---

## 🎨 Tema Sistemi

### Kullanım

```html
<!-- Tema CSS'ini dahil et -->
<link rel="stylesheet" href="styles/themes.css">

<!-- Tema seçici -->
<div class="theme-selector">
  <button onclick="setTheme('light')">Açık</button>
  <button onclick="setTheme('dark')">Koyu</button>
  <button onclick="setTheme('blue')">Mavi</button>
  <button onclick="setTheme('green')">Yeşil</button>
</div>
```

```javascript
// Tema değiştirme fonksiyonu
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('selected-theme', theme);
}

// Otomatik tema
function setAutoTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = prefersDark ? 'dark' : 'light';
  setTheme(theme);
}
```

### Mevcut Temalar

- **light**: Açık tema
- **dark**: Koyu tema
- **blue**: Mavi tema
- **green**: Yeşil tema
- **purple**: Mor tema
- **auto**: Sistem tercihine göre otomatik

### CSS Değişkenleri

```css
:root {
  --theme-bg-primary: #ffffff;
  --theme-bg-secondary: #f8f9fa;
  --theme-text-primary: #212529;
  --theme-primary-color: #667eea;
}

[data-theme="dark"] {
  --theme-bg-primary: #1a1a2e;
  --theme-bg-secondary: #16213e;
  --theme-text-primary: #e2e8f0;
}
```

---

## 🔘 Modal Bileşenleri

### Kullanım

```javascript
import { uiService } from './services/ui-service.js';

// Basit modal
uiService.showModal({
  title: 'Başlık',
  message: 'Mesaj içeriği',
  type: 'info',
  confirmText: 'Tamam'
});

// Onay modalı
uiService.confirm(
  'Emin misiniz?',
  'Bu işlemi geri alamazsınız.',
  () => console.log('Onaylandı'),
  () => console.log('İptal edildi')
);

// Özel içerikli modal
uiService.showModal({
  title: 'Özel Modal',
  content: `
    <div class="form-group">
      <label>Adınız:</label>
      <input type="text" id="name-input">
    </div>
  `,
  confirmText: 'Kaydet',
  onConfirm: () => {
    const name = document.getElementById('name-input').value;
    console.log('Kaydedilen isim:', name);
  }
});
```

### Modal Tipleri

- **info**: Bilgi modalı
- **success**: Başarı modalı
- **warning**: Uyarı modalı
- **danger**: Hata modalı
- **custom**: Özel modal

### Modal Seçenekleri

```javascript
const options = {
  title: 'Modal Başlığı',
  message: 'Modal mesajı',
  type: 'info', // info, success, warning, danger
  size: 'medium', // small, medium, large, fullscreen
  confirmText: 'Tamam',
  cancelText: 'İptal',
  showCloseButton: true,
  closeOnEscape: true,
  closeOnOverlay: true,
  onConfirm: () => {},
  onCancel: () => {},
  content: '<div>Özel içerik</div>'
};
```

---

## 🔘 Button Bileşenleri

### Kullanım

```html
<!-- Temel buton -->
<button class="btn btn-primary">Tıkla</button>

<!-- Boyutlar -->
<button class="btn btn-sm">Küçük</button>
<button class="btn btn-lg">Büyük</button>

<!-- Tipler -->
<button class="btn btn-success">Başarı</button>
<button class="btn btn-danger">Sil</button>
<button class="btn btn-warning">Uyarı</button>

<!-- Icon buton -->
<button class="btn-icon">
  <i class="icon-plus"></i>
</button>

<!-- Grup buton -->
<div class="btn-group">
  <button class="btn">1</button>
  <button class="btn">2</button>
  <button class="btn">3</button>
</div>
```

### Button Sınıfları

- **btn**: Temel buton stili
- **btn-sm**: Küçük buton
- **btn-lg**: Büyük buton
- **btn-primary**: Ana buton
- **btn-success**: Başarı butonu
- **btn-danger**: Tehlike butonu
- **btn-warning**: Uyarı butonu
- **btn-ghost**: Hayalet butonu
- **btn-outline**: Çerçeveli buton
- **btn-icon**: İkonlu buton
- **btn-full**: Tam genişlik butonu

### Button Durumları

```javascript
const button = document.querySelector('.btn');

// Loading durumu
button.classList.add('btn-loading');
button.disabled = true;

// Normal duruma döndür
button.classList.remove('btn-loading');
button.disabled = false;
```

---

## 🔘 Toast Bildirimleri

### Kullanım

```javascript
import { uiService } from './services/ui-service.js';

// Basit toast
uiService.showToast('İşlem başarılı!', 'success');

// Seçenekli toast
uiService.showToast('Hata oluştu', 'error', {
  duration: 5000,
  position: 'top-right'
});

// Kalıcı toast
uiService.showToast('Önemik bildirim', 'warning', {
  duration: 0 // Kapanmaz
});
```

### Toast Tipleri

- **success**: Başarı bildirimi
- **error**: Hata bildirimi
- **warning**: Uyarı bildirimi
- **info**: Bilgi bildirimi

### Toast Seçenekleri

```javascript
const options = {
  duration: 3000, // Gösterim süresi (ms)
  position: 'top-right', // top-left, top-right, bottom-left, bottom-right
  showCloseButton: true,
  onClick: () => {},
  onClose: () => {}
};
```

---

## 📊 Analytics Dashboard

### Kullanım

```javascript
import { analyticsService } from './services/analytics-service.js';

// Event takibi
analyticsService.trackEvent('button_click', {
  buttonId: 'submit',
  page: 'contact'
});

// Sayfa görüntüleme
analyticsService.trackPageView('dashboard', {
  referrer: 'homepage'
});

// Kullanıcı etkileşimi
analyticsService.trackInteraction('form_submit', 'contact_form', {
  formType: 'contact'
});
```

### Analytics Metrikleri

- **pageViews**: Sayfa görüntüleme sayısı
- **events**: Toplam event sayısı
- **sessions**: Oturum sayısı
- **users**: Aktif kullanıcı sayısı
- **bounceRate**: Çıkma oranı
- **avgSessionDuration**: Ortalama oturum süresi

### Analytics Dashboard Bileşenleri

```html
<!-- Metrik kartları -->
<div class="metric-card">
  <div class="metric-value">1,234</div>
  <div class="metric-label">Toplam Ziyaretçi</div>
</div>

<!-- Grafikler -->
<div class="analytics-chart" id="visitor-chart"></div>
<div class="analytics-chart" id="message-chart"></div>
```

---

## 📱 Chat Widget

### Kullanım

```html
<!-- Widget'i dahil et -->
<link rel="stylesheet" href="src/chatbot-widget-optimized.html">

<!-- Widget butonu -->
<button class="chat-widget-btn" onclick="toggleWidget()">
  💬
</button>

<!-- Widget (genellikle gizli) -->
<div class="chat-widget" id="chat-widget">
  <!-- Widget içeriği -->
</div>
```

```javascript
// Widget'ı aç/kapat
function toggleWidget() {
  const widget = document.getElementById('chat-widget');
  widget.classList.toggle('open');
}

// Mesaj gönderme
function sendMessage(message) {
  const widget = window.chatbotWidget;
  if (widget) {
    widget.sendMessage(message);
  }
}
```

### Widget Bileşenleri

- **chat-widget-btn**: Widget açma butonu
- **chat-widget**: Ana widget konteyneri
- **chat-widget-header**: Widget başlığı
- **chat-messages**: Mesajlar alanı
- **chat-input-area**: Girdi alanı
- **typing-indicator**: Yazma göstergesi

### Widget Özelleştirme

```javascript
// Widget konfigürasyonu
const widgetConfig = {
  position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
  width: 380,
  height: 550,
  theme: 'light', // light, dark, auto
  welcomeMessage: 'Merhaba! Size nasıl yardımcı olabilirim?',
  placeholder: 'Mesajınızı yazın...'
};

// Widget'ı başlat
const widget = new ChatbotWidget(widgetConfig);
```

---

## 🎛️ Admin Panel

### Kullanım

```html
<!-- Admin panel'i dahil et -->
<link rel="stylesheet" href="src/admin-panel-optimized.html">

<!-- Ana yapı -->
<div class="app">
  <aside class="sidebar">
    <!-- Kenar çubuğu -->
  </aside>
  
  <div class="chat-area">
    <!-- Sohbet alanı -->
  </div>
  
  <main class="main">
    <!-- Ana içerik -->
  </main>
</div>
```

### Admin Panel Bileşenleri

- **sidebar**: Kenar çubuğu (kullanıcı listesi)
- **chat-area**: Sohbet alanı (mesajlar, girdi)
- **main**: Ana içerik alanı (ayarlar, analytics)
- **tabs**: Sekme navigasyonu
- **user-list**: Kullanıcı listesi
- **messages**: Mesaj listesi
- **reply-box**: Yanıt kutusu

### Admin Panel Fonksiyonları

```javascript
// Kullanıcı seçimi
function selectUser(userId) {
  const adminPanel = window.adminPanel;
  if (adminPanel) {
    adminPanel.selectUser(userId);
  }
}

// Manuel yanıt
function sendManualReply(message) {
  const adminPanel = window.adminPanel;
  if (adminPanel) {
    adminPanel.sendManualReply(message);
  }
}

// Otomatiği devret
function releaseControl() {
  const adminPanel = window.adminPanel;
  if (adminPanel) {
    adminPanel.releaseControl();
  }
}
```

---

## 🔧 Debug Panel

### Kullanım

```html
<!-- Debug panel'i aç -->
<a href="/src/debug-panel.html" target="_blank">Debug Paneli Aç</a>

<!-- Veya iframe içinde -->
<iframe src="/src/debug-panel.html" width="100%" height="600px"></iframe>
```

### Debug Panel Özellikleri

- **Sistem Durumu**: Firebase, Cache, Analytics durumu
- **Performans Metrikleri**: Sayfa yükleme süresi, cache hit oranı
- **Log Görüntüleme**: Sistem loglarını gösterme
- **Test Araçları**: Servis testleri
- **Tema Ayarları**: Anlık tema değiştirme

### Debug Panel Fonksiyonları

```javascript
// Cache temizleme
function clearCache() {
  if (window.cacheService) {
    window.cacheService.clear();
  }
}

// Logları dışa aktar
function exportLogs() {
  const debugPanel = window.debugPanel;
  if (debugPanel) {
    debugPanel.exportLogs();
  }
}

// Stres testi
function runStressTest() {
  const debugPanel = window.debugPanel;
  if (debugPanel) {
    debugPanel.stressTest();
  }
}
```

---

## 🎨 Component Stilleri

### CSS Değişkenleri

```css
:root {
  /* Component boyutları */
  --component-padding: 16px;
  --component-border-radius: 8px;
  --component-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  /* Animasyonlar */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

### Responsive Kurallar

```css
@media (max-width: 768px) {
  .component {
    /* Mobil stilleri */
  }
}

@media (max-width: 480px) {
  .component {
    /* Küçük ekran stilleri */
  }
}
```

### Tema Entegrasyonu

```css
.component {
  background: var(--theme-bg-primary);
  color: var(--theme-text-primary);
  border: 1px solid var(--theme-border-color);
}

.component:hover {
  background: var(--theme-bg-secondary);
}
```

---

## 🔧 JavaScript Entegrasyonu

### Component Başlatma

```javascript
// Component'leri başlat
document.addEventListener('DOMContentLoaded', () => {
  // Tema yükle
  const savedTheme = localStorage.getItem('selected-theme') || 'light';
  setTheme(savedTheme);
  
  // Servisleri başlat
  if (window.firebaseService) {
    firebaseService.connect();
  }
  
  // Event listener'ları kur
  setupEventListeners();
});
```

### Event Listener'lar

```javascript
function setupEventListeners() {
  // Tema değişimi
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 't') {
      toggleTheme();
    }
  });
  
  // PWA kurulumu
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}
```

---

## 📱 Mobil Optimizasyon

### Touch Destek

```css
.component {
  min-height: 44px; /* Minimum dokunma alanı */
  touch-action: manipulation; /* Dokunma optimizasyonu */
}
```

### Performans

```javascript
// Lazy loading
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadComponent(entry.target);
    }
  });
});

// Debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

---

## 🔒 Güvenlik

### XSS Koruması

```javascript
// Güvenli HTML oluşturma
function createSafeHTML(html) {
  const div = document.createElement('div');
  div.textContent = html; // XSS koruması
  return div.innerHTML;
}
```

### Input Validasyonu

```javascript
// Component input validasyonu
function validateInput(input, rules) {
  if (typeof validationService !== 'undefined') {
    return validationService.validateField('input', input, rules);
  }
  return { isValid: true };
}
```

---

## 🧪 Test

### Component Testleri

```javascript
// Component testi
describe('Button Component', () => {
  it('should render correctly', () => {
    const button = createButton({ text: 'Click me' });
    expect(button.textContent).toBe('Click me');
  });
  
  it('should handle click events', () => {
    const button = createButton({ onClick: jest.fn() });
    button.click();
    expect(button.onClick).toHaveBeenCalled();
  });
});
```

---

## 📚 Örnekler

### Temel Kullanım

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles/variables.css">
  <link rel="stylesheet" href="styles/components/buttons.css">
  <link rel="stylesheet" href="styles/components/modals.css">
  <link rel="stylesheet" href="styles/themes.css">
</head>
<body>
  <div class="app">
    <h1>Chatbot Uygulaması</h1>
    
    <button class="btn btn-primary" onclick="showModal()">
      Modal Aç
    </button>
    
    <button class="btn btn-secondary" onclick="showToast()">
      Bildirim Göster
    </button>
  </div>
  
  <script src="services/ui-service.js"></script>
  <script>
    function showModal() {
      uiService.showModal({
        title: 'Örnek Modal',
        message: 'Bu bir örnek modaldır.'
      });
    }
    
    function showToast() {
      uiService.showToast('Örnek bildirim!', 'success');
    }
  </script>
</body>
</html>
```

---

## 🔗 Bağımlılıklar

### Gerekli Kütüphaneler

- Modern browser (ES6+)
- CSS Grid ve Flexbox desteği
- LocalStorage desteği

### İsteğe Bağlı Servisler

- **Firebase Service**: Veritabanı işlemleri için
- **Analytics Service**: Kullanıcı davranış takibi için
- **Cache Service**: Performans optimizasyonu için

---

## 🐛 Hata Ayıklama

### Common Issues

1. **Component yüklenmiyor**: Script'lerin doğru sırayla yüklendiğinden emin olun
2. **Stiller uygulanmıyor**: CSS dosyalarının doğru yollandığını kontrol edin
3. **Event çalışmıyor**: Event listener'ların doğru elementlere eklendiğini kontrol edin

### Debug Modu

```javascript
// Debug modu aktifleştir
window.DEBUG = true;

// Debug logları
function debugLog(message) {
  if (window.DEBUG) {
    console.log('[DEBUG]', message);
  }
}
```

---

*Son güncelleme: 2025-12-11*