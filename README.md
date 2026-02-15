# 🤖 Chatbot Projesi

Öğrenen AI chatbot sistemi — Supabase veritabanı, admin paneli, kullanıcı widget'ı ve PWA desteği ile.

## 📁 Proje Yapısı

```
chatbot/
├── public/                              # Frontend dosyaları
│   ├── admin-panel-optimized.html         # Admin paneli arayüzü
│   ├── chatbot-widget-optimized.html      # Chatbot widget'ı (kullanıcı arayüzü)
│   ├── manifest.json                      # PWA manifest dosyası
│   ├── sw.js                              # Service Worker (çevrimdışı destek)
│   ├── config/
│   │   └── supabase-config.js               # Supabase bağlantı ayarları
│   └── services/
│       ├── analytics-service.js             # Analitik servisi
│       ├── cache-service.js                 # Önbellek servisi
│       ├── file-service.js                  # Dosya yönetim servisi
│       ├── notification-service.js          # Bildirim servisi
│       ├── rate-limit-service.js            # Rate limit servisi
│       ├── supabase-service.js              # Supabase veritabanı servisi
│       ├── ui-service.js                    # UI yardımcı servisi
│       └── validation-service.js            # Doğrulama servisi
│
├── server/
│   └── db/
│       ├── schema.sql                       # Supabase veritabanı şeması
│       ├── migrate-firebase-to-supabase.js  # Firebase → Supabase göç scripti
│       ├── package.json                     # Node.js bağımlılıkları
│       └── package-lock.json
│
├── docs/                                # Proje dokümantasyonu
│   ├── api.md                             # API dokümantasyonu
│   └── components.md                      # Bileşen dokümantasyonu
│
├── backup-tools/                        # Yedekleme araçları
│   ├── yedekle.bat                        # Manuel yedekleme scripti
│   ├── guncelle.bat                       # Güncelleme scripti
│   ├── kontrol_et.bat                     # Durum kontrol scripti
│   └── yedekleme_sistemi.bat              # Ana yedekleme sistemi
│
├── .github/workflows/
│   └── deploy.yml                         # GitHub Actions deploy workflow
│
├── chatbot_kontrol_merkezi.pyw          # Masaüstü kontrol merkezi uygulaması
├── gorev_zamanlayici_kur.bat            # Görev zamanlayıcı kurulumu
├── LICENSE                              # Lisans dosyası
├── .gitignore                           # Git ignore kuralları
└── README.md                            # Bu dosya
```

## 🚀 Hızlı Başlangıç

### 1. Ana Uygulama Dosyaları
- **Admin Panel:** `public/admin-panel-optimized.html` — Sohbet yönetimi, öğrenme sistemi, ayarlar
- **Widget:** `public/chatbot-widget-optimized.html` — Web sitelerine gömülebilir chatbot arayüzü
- **Kontrol Merkezi:** `chatbot_kontrol_merkezi.pyw` — Masaüstü kontrol uygulaması (Python)

### 2. Veritabanı
- **Supabase** üzerinde çalışır — bağlantı ayarları: `public/config/supabase-config.js`
- Veritabanı şeması: `server/db/schema.sql`
- Firebase'den göç scripti: `server/db/migrate-firebase-to-supabase.js`

### 3. Dokümantasyon
- API referansı: `docs/api.md`
- Bileşen detayları: `docs/components.md`

## � Özellikler

### 🤖 Chatbot
- Öğrenen AI chatbot sistemi
- Bağlam etiketleri ile akıllı yanıt seçimi
- Telefon numarası ile oturum yönetimi
- Medya paylaşım desteği
- Gerçek zamanlı mesajlaşma

### 🎛️ Admin Panel
- Canlı sohbet takibi ve yönetimi
- Sohbet sabitleme ve silme
- Okunmamış mesaj sayacı
- Chatbot'a yeni yanıtlar öğretme (bağlam etiketli)
- Ayarlar ve yapılandırma

### 📱 PWA Desteği
- Service Worker ile çevrimdışı destek
- Bildirim sistemi
- Önbellek yönetimi

### 🛠️ Servisler
| Servis | Açıklama |
|---|---|
| `supabase-service.js` | Veritabanı işlemleri (CRUD, oturum yönetimi) |
| `analytics-service.js` | Kullanım analitiği |
| `cache-service.js` | Önbellek yönetimi |
| `file-service.js` | Dosya yükleme ve yönetim |
| `notification-service.js` | Bildirim gönderimi |
| `rate-limit-service.js` | İstek sınırlama |
| `ui-service.js` | UI yardımcı fonksiyonları |
| `validation-service.js` | Girdi doğrulama |

## 🔄 Yedekleme

### Manuel Yedekleme
```batch
backup-tools\yedekle.bat
```

### Durum Kontrolü
```batch
backup-tools\kontrol_et.bat
```

### Otomatik Yedekleme Kurulumu
1. `gorev_zamanlayici_kur.bat` dosyasını çalıştırın
2. Talimatları izleyin

## 🔧 Kurulum

### Gereksinimler
- Git kurulu olmalı
- GitHub hesabı gerekli
- Windows işletim sistemi
- Supabase projesi (veritabanı için)

### Adımlar
1. Bu depoyu klonlayın
2. `public/config/supabase-config.js` dosyasında Supabase bilgilerinizi ayarlayın
3. `server/db/schema.sql` ile veritabanı tablolarını oluşturun
4. Admin paneli ve widget'ı bir web sunucusunda barındırın

## 🚀 Deploy

GitHub Actions ile otomatik deploy yapılandırılmıştır (`.github/workflows/deploy.yml`).

## 📄 Lisans

Bu proje [Tifil123 Chatbot — Non-Commercial License 1.0](LICENSE) ile lisanslanmıştır.

---

**Son Güncelleme:** 2026-02-15
**Versiyon:** 2.0.0