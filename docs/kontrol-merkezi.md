# Kontrol Merkezi Teknik Dokümantasyonu

`chatbot_kontrol_merkezi.pyw` — Tüm komut satırı işlemlerini tek bir masaüstü arayüzde birleştiren Python/Tkinter uygulaması.

## Genel Bakış

Kontrol Merkezi, projenin yedekleme, deploy, sunucu yönetimi, Git işlemleri ve sistem bakım komutlarını görsel bir arayüzden çalıştırmayı sağlar. `.pyw` uzantısı sayesinde Windows'ta konsol penceresi açılmadan çalışır.

### Teknik Özellikler

| Özellik | Değer |
|---|---|
| Dil | Python 3 (Tkinter) |
| Dosya Uzantısı | `.pyw` (pencereli uygulama) |
| Minimum Pencere | 800×600 |
| Varsayılan Boyut | 900×700 |
| HTTP Sunucu Portu | 8787 |
| Tema | Koyu (Catppuccin Mocha benzeri) |
| Thread Safety | `threading.Lock` ile sağlanır |

---

## 📋 İçerik

- [Mimari](#mimari)
- [Arayüz Yapısı](#arayüz-yapısı)
- [Kategoriler ve Komutlar](#kategoriler-ve-komutlar)
- [CommandCenter Sınıfı](#commandcenter-sınıfı)
- [Konfigürasyon](#konfigürasyon)

---

## Mimari

```
┌─────────────────────────────────────────────┐
│              CommandCenter (Tk)              │
├─────────┬───────────────────────────────────┤
│ Sidebar │ Header (kategori başlık + açıklama)│
│         ├───────────────────────────────────┤
│ backup  │ Butonlar Alanı (Grid 2xN)        │
│ supabase│   ┌──────────┐  ┌──────────┐     │
│ server  │   │ Action 1 │  │ Action 2 │     │
│ git     │   └──────────┘  └──────────┘     │
│ links   ├───────────────────────────────────┤
│ system  │ Terminal (ScrolledText)            │
│         │   macOS-style başlık çubuğu       │
│         │   Monospace çıktı alanı           │
│         ├───────────────────────────────────┤
│         │ Status Bar + Durdur Butonu         │
└─────────┴───────────────────────────────────┘
```

### Thread Modeli

- UI ana thread'de çalışır
- Komutlar daemon thread'lerde çalıştırılır
- `process_lock` (threading.Lock) ile eşzamanlı komut çalıştırma engellenir
- `root.after(0, ...)` ile thread-safe UI güncellemesi yapılır
- HTTP sunucu ayrı bir process olarak takip edilir (`server_process`)

---

## Arayüz Yapısı

### Renk Paleti

| Anahtar | Hex | Kullanım |
|---|---|---|
| `bg` | `#0f0f1a` | Ana arka plan |
| `sidebar` | `#1a1a2e` | Kenar çubuğu |
| `card` | `#16213e` | Kart arka planı |
| `accent` | `#0f3460` | Aktif/hover durumu |
| `primary` | `#667eea` | Ana buton rengi |
| `success` | `#10b981` | Başarı |
| `warning` | `#f59e0b` | Uyarı |
| `danger` | `#ef4444` | Tehlike |
| `text` | `#ffffff` | Ana metin |
| `text_secondary` | `#94a3b8` | İkincil metin |
| `text_muted` | `#64748b` | Soluk metin |

### Terminal Bileşeni

- **Font tercih sırası:** JetBrains Mono → Cascadia Code → Consolas
- **Arka plan:** `#11111b` (Catppuccin Mocha crust)
- **Metin rengi:** `#a6e3a1` (Catppuccin green)
- **macOS-style kontrol noktaları:** 🔴🟡🟢
- **Salt okunur** (`state='disabled'`), yazma sırasında geçici olarak `normal` yapılır

---

## Kategoriler ve Komutlar

### 💾 Yedekleme (`backup`)

| Buton | Açıklama | Komut |
|---|---|---|
| 💾 Yedekle | Değişiklikleri GitHub'a yükle | Sadece `main` dalında: değişiklik varsa `Yedekleme - {tarih}` commit, gönderilmemiş commit varsa push |
| 🔄 Güncelle | GitHub'dan güncel dosyaları çek | `git pull origin main` |
| ⚙️ Yedekleme Sistemi | Otomatik yedekleme sistemini çalıştır | `backup-tools/yedekleme_sistemi.bat` (yeni pencerede) |

### 🚀 Supabase (`supabase`)

| Buton | Açıklama | Aksiyon |
|---|---|---|
| 🚀 Deploy | GitHub Pages'e yayınla ve sonucu bekle | Sadece `main` dalında: değişiklik varsa commit, gönderilmemiş commit varsa push, son deploy başarısızsa yeniden başlatma. GitHub CLI (`gh`) gerekir. |
| 📊 Dashboard | Supabase Dashboard'u aç | Tarayıcı: `supabase.com/dashboard/project/ydhlveimkpkncyizdjjy` |
| 📝 SQL Editor | Supabase SQL Editor'ü aç | Tarayıcı: `supabase.com/dashboard/project/ydhlveimkpkncyizdjjy/sql/new` |

### 🌐 Sunucu (`server`)

| Buton | Açıklama | Aksiyon |
|---|---|---|
| ▶️ Sunucu Başlat | `localhost:8787` sunucusunu başlat | `python -m http.server 8787` (public/ dizininde) |
| ⏹️ Sunucu Durdur | Çalışan sunucuyu durdur | Process terminate + port temizleme + orphan process tarama |
| 🌐 Admin Aç | Admin paneli tarayıcıda aç | `http://localhost:8787/admin-panel-optimized.html` |
| 🤖 Widget Aç | Widget'ı tarayıcıda aç | `http://localhost:8787/chatbot-widget-optimized.html` |

**Sunucu Durdurma Stratejisi (3 katmanlı):**
1. Kayıtlı `server_process`'i terminate et
2. Port 8787 ve 8080'deki LISTENING process'leri `netstat` + `taskkill` ile temizle
3. `wmic` ile `http.server` komut satırı içeren tüm orphan process'leri bul ve sonlandır

### 📦 Git (`git`)

| Buton | Açıklama | Komut |
|---|---|---|
| 📥 Pull | Uzak depodan çek | `git pull origin main` |
| 📤 Push | Uzak depoya gönder | `git push origin main` |

### 🔗 Linkler (`links`)

| Buton | Açıklama | URL |
|---|---|---|
| 🎛️ Admin Panel | Canlı yönetim paneli | `https://tifil123.github.io/chatbot/admin-panel-optimized.html` |
| 💬 Widget Demo | Canlı widget sayfası | `https://tifil123.github.io/chatbot/chatbot-widget-optimized.html` |

### ⚙️ Sistem (`system`)

| Buton | Açıklama | Aksiyon |
|---|---|---|
| 💻 VS Code | Projeyi VS Code'da aç | `code "{proje_klasörü}"` |
| 🧹 Cache Temizle | Geçici dosyaları temizle | `__pycache__`, `.pyc`, `.cache`, `tmp`, `temp_*` dosyalarını siler |

---

## CommandCenter Sınıfı

### Constructor

```python
CommandCenter(root: tk.Tk)
```

**Başlatma sırası:**
1. Tema renkleri tanımlanır
2. Proje klasörü `__file__` konumundan otomatik belirlenir
3. Widget'lar oluşturulur (`create_widgets()`)
4. Varsayılan kategori gösterilir (`show_category('backup')`)

### Özellikler

| Özellik | Tip | Açıklama |
|---|---|---|
| `project_folder` | `str` | Proje kök dizini (otomatik tespit) |
| `backup_tools` | `str` | `backup-tools/` klasör yolu |
| `active_category` | `str\|None` | Aktif kategori kimliği |
| `running_process` | `Popen\|None` | Çalışan komut process'i |
| `server_process` | `Popen\|None` | HTTP sunucu process'i |
| `process_lock` | `threading.Lock` | Thread güvenliği kilidi |
| `is_running` | `bool` | Komut çalışıyor mu |

### Temel Metodlar

#### UI Metodları

| Metod | Parametreler | Açıklama |
|---|---|---|
| `create_widgets()` | — | Tüm UI bileşenlerini oluşturur |
| `show_category(category)` | `str` | Kategori görünümünü değiştirir |
| `create_action_button(...)` | parent, text, desc, color, cmd, row, col | Aksiyon kartı oluşturur (hover efektli) |
| `update_button_style(btn, cat_id)` | Button, str | Sidebar buton stilini aktif/pasif günceller |
| `check_font(font_name)` | `str` | Sistemde font yüklü mü kontrol eder |

#### Terminal Metodları

| Metod | Parametreler | Açıklama |
|---|---|---|
| `log(message, color?)` | str, str | Terminal çıktısına zaman damgalı mesaj yazar |
| `clear_output()` | — | Terminal çıktısını temizler |
| `run_command(command, cwd?, show_window?)` | str, str, bool | Thread-safe komut çalıştırır |
| `stop_process()` | — | Çalışan process'i sonlandırır |

#### `run_command()` Davranışı

```python
def run_command(self, command, cwd=None, show_window=False):
```

- **`show_window=False` (varsayılan):** Çıktıyı terminal bileşenine yönlendirir. `stdout` ve `stderr` birleştirilir. Process tamamlanana kadar satır satır okunur.
- **`show_window=True`:** `start cmd /k` ile yeni CMD penceresi açar. Çıktı yakalanmaz.
- **Thread-safe:** `process_lock` ile aynı anda tek komut çalışır. İkinci komut reddedilir.
- **Encoding:** `utf-8` + `errors='replace'` ile güvenli karakter çözümleme.

#### Cache Temizleme

`clear_cache()` şu hedefleri temizler:

1. `__pycache__/` dizinleri (recursive, `.git` hariç)
2. `*.pyc` dosyaları
3. `.cache/` ve `tmp/` dizinleri
4. `temp_*` ile başlayan dosya ve klasörler
5. `*.log` dosyaları korunur (sadece sayısı raporlanır)

---

## Konfigürasyon

### Proje Klasörü

Proje klasörü otomatik tespit edilir:

```python
self.project_folder = os.path.dirname(os.path.abspath(__file__))
```

Uygulamayı farklı bir konuma taşıdığınızda yol otomatik güncellenir.

### Sunucu Portu

```python
SERVER_PORT = 8787
```

Dosyanın başındaki global sabit ile değiştirilebilir.

### Canlı Site URL'leri

| Hedef | URL |
|---|---|
| Admin Panel | `https://tifil123.github.io/chatbot/admin-panel-optimized.html` |
| Widget Demo | `https://tifil123.github.io/chatbot/chatbot-widget-optimized.html` |
| Supabase Dashboard | `https://supabase.com/dashboard/project/ydhlveimkpkncyizdjjy` |
| Supabase SQL Editor | `https://supabase.com/dashboard/project/ydhlveimkpkncyizdjjy/sql/new` |

---

## Çalıştırma

```bash
# Doğrudan çalıştırma (Windows — konsolsuz)
python chatbot_kontrol_merkezi.pyw

# Veya çift tıklama ile
# .pyw uzantısı Windows'ta pythonw.exe ile ilişkilendirilmiştir
```

### Gereksinimler

- Python 3.x (Tkinter dahil)
- Git (yedekleme ve deploy komutları için)
- VS Code (opsiyonel — VS Code açma komutu için)

---

*Son güncelleme: 2026-07-10*
