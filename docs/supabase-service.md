# Supabase Service Teknik Dokümantasyonu

`public/services/supabase-service.js` — Firebase'in yerini alan merkezi veritabanı servisi.

## Genel Bakış

`SupabaseService` sınıfı, Firebase Realtime Database API'sini taklit eden bir Supabase sarmalayıcısıdır. Firebase kodlarının değiştirilmeden çalışmaya devam etmesi için **drop-in replacement** olarak tasarlanmıştır. Servis, `window.firebaseService` ve `window.supabaseService` isimlerinin ikisiyle de erişilebilir.

### Mimari Kararlar

- **Firebase-style path parsing**: `sessions/{id}/info/pinned` gibi yollar dahili olarak SQL sorgularına dönüştürülür.
- **camelCase ↔ snake_case çevirisi**: JavaScript tarafı camelCase, PostgreSQL tarafı snake_case kullanır; otomatik dönüşüm yapılır.
- **Snapshot wrapper**: Firebase `snapshot.val()`, `snapshot.forEach()` API'sine uyumlu nesneler oluşturulur.
- **Singleton pattern**: `supabaseService` tek bir global örnek olarak export edilir.
- **Ayrı auth depolama**: Admin panel (`chatbot_admin_auth`) ve widget (`chatbot_widget_auth`) farklı `storageKey` kullanarak oturum çakışmasını önler.

---

## 📋 İçerik

- [Bağlantı ve Kimlik Doğrulama](#bağlantı-ve-kimlik-doğrulama)
- [CRUD İşlemleri](#crud-i̇şlemleri)
- [Ref Uyumluluk Katmanı](#ref-uyumluluk-katmanı)
- [Real-Time Abonelikler](#real-time-abonelikler)
- [Bağlantı Yönetimi](#bağlantı-yönetimi)
- [Dosya Yükleme](#dosya-yükleme)
- [Yardımcı Metodlar](#yardımcı-metodlar)
- [Field Mapping Referansı](#field-mapping-referansı)
- [Path Parsing Referansı](#path-parsing-referansı)

---

## Bağlantı ve Kimlik Doğrulama

### `connect(config?)`

Supabase istemcisini oluşturur ve bağlantıyı başlatır.

```javascript
const client = await supabaseService.connect();

// Veya özel konfigürasyon ile
const client = await supabaseService.connect({
  url: 'https://xxx.supabase.co',
  anonKey: 'sb_xxx'
});
```

**Parametreler:**
- `config` (Object, isteğe bağlı): `{ url, anonKey }` — `null` verilirse `window.SupabaseConfig` kullanılır.

**Döner:** `Promise<Object>` — Supabase client  
**Hatalar:** Bağlantı 3 deneme sonrasında başarısız olursa `Error` fırlatır.  
**Yan Etki:** `isConnected = true`, `retryCount = 0` olarak sıfırlanır. `isAdminPage` tespitine göre `storageKey` seçilir.

---

### `signInAnonymously()`

Anonim oturum açar. Mevcut bir oturum varsa yeniden giriş yapmaz.

```javascript
const user = await supabaseService.signInAnonymously();
```

**Döner:** `Promise<Object|null>` — Supabase `User` nesnesi  
**Kullanım:** Widget ilk açıldığında otomatik çağrılır.

---

### `signInWithEmail(email, password)`

E-posta ve şifre ile oturum açar. Admin panelinde kullanılır.

```javascript
const data = await supabaseService.signInWithEmail('admin@example.com', 'securePass');
```

**Parametreler:**
- `email` (string): E-posta adresi
- `password` (string): Şifre

**Döner:** `Promise<Object>` — `{ user, session }` nesnesi  
**Hatalar:** Geçersiz kimlik bilgileri varsa `Error` fırlatır.

---

### `getAuthSession()`

Mevcut kimlik doğrulama oturumunu alır.

```javascript
const session = await supabaseService.getAuthSession();
```

**Döner:** `Promise<Object|null>` — Oturum nesnesi veya `null`

---

### `isAdminUser(user?)`

Kullanıcının admin rolüne sahip olup olmadığını kontrol eder. Yalnızca `app_metadata.role` alanında `"admin"` değerini arar; `user_metadata` kullanıcı tarafından değiştirilebildiği için kullanılmaz.

```javascript
const isAdmin = supabaseService.isAdminUser();
```

**Parametreler:**
- `user` (Object, isteğe bağlı): Kontrol edilecek kullanıcı. Varsayılan: `this.currentUser`

**Döner:** `boolean`

---

### `signOut()`

Oturumu kapatır, tüm listener'ları temizler, istemciyi sıfırlar.

```javascript
await supabaseService.signOut();
```

---

### `getCurrentUser()`

Mevcut oturum açmış kullanıcıyı döndürür.

```javascript
const user = supabaseService.getCurrentUser();
```

**Döner:** `Object|null`

---

### `getDatabase()`

Supabase client referansını döndürür. Firebase `getDatabase()` uyumluluğu için mevcuttur.

```javascript
const client = supabaseService.getDatabase();
```

**Döner:** `Object` — Supabase client  
**Hatalar:** Bağlantı yoksa `Error` fırlatır.

---

## CRUD İşlemleri

Tüm CRUD metodları Firebase-style path kabul eder ve dahili olarak SQL sorgularına çevirir.

### `read(path)`

Belirtilen Firebase-style yoldaki veriyi okur.

```javascript
// Tüm session'ları mesajlarıyla getir
const sessions = await supabaseService.read('sessions');

// Tek session
const session = await supabaseService.read('sessions/session_123');

// Session kontrol modu
const control = await supabaseService.read('sessions/session_123/control');

// Bir session'ın mesajları
const messages = await supabaseService.read('sessions/session_123/messages');

// Öğrenilmiş yanıtlar
const learned = await supabaseService.read('learned_responses');

// Bekleyen sorular
const pending = await supabaseService.read('pending_questions');
```

**Parametreler:**
- `path` (string): Firebase-style veritabanı yolu

**Döner:** `Promise<Object|null>` — Firebase uyumlu formatta veri veya `null`

**Önemli:** `learned_responses` sorgusu, Supabase JS client'taki hang sorununu aşmak için doğrudan REST API çağrısı kullanır.

---

### `write(path, data)`

Veriyi yazar (UPSERT). Sadece `sessions/{id}/info` yolu desteklenir.

```javascript
await supabaseService.write('sessions/session_123/info', {
  customName: 'Ziyaretçi',
  phoneNumber: '+905551234567',
  startTime: Date.now(),
  lastActive: Date.now(),
  status: 'active'
});
```

**Parametreler:**
- `path` (string): Firebase-style yol
- `data` (Object): Yazılacak veri (camelCase)

**Yan Etki:** Admin olmayan kullanıcılar için `owner_user_id` otomatik eklenir. `createdAt` alanı otomatik atlanır (DB default).

---

### `push(path, data)`

Yeni kayıt ekler (INSERT). Benzersiz UUID üretir.

```javascript
const ref = await supabaseService.push('sessions/session_123/messages', {
  sender: 'user',
  message: 'Merhaba!',
  timestamp: Date.now(),
  seen: false,
  fromAdmin: false
});
console.log('Yeni mesaj ID:', ref.key);
```

**Parametreler:**
- `path` (string): Firebase-style yol
- `data` (Object): Eklenecek veri

**Döner:** `Promise<{ key: string }>` — Oluşturulan kaydın ID'si

**Önemli:** `auto` alanı otomatik olarak `auto_reply`'a dönüştürülür. Messages tablosunda `session_id` filtreden otomatik eklenir.

---

### `update(path, data)`

Mevcut kaydı günceller (UPDATE).

```javascript
await supabaseService.update('sessions/session_123', {
  lastActive: Date.now(),
  needsAttention: true
});

// Kontrol modu güncelleme
await supabaseService.update('sessions/session_123', {
  mode: 'manual'
});
```

**Parametreler:**
- `path` (string): Firebase-style yol
- `data` (Object): Güncellenecek alanlar

**Önemli:** `mode` alanı sessions tablosunda `control_mode` olarak saklanır.

---

### `remove(path)`

Kayıt veya alan siler.

```javascript
// Kaydı sil
await supabaseService.remove('sessions/session_123');

// Tek alanı null'a çevir
await supabaseService.remove('sessions/session_123/info/phoneNumber');
```

**Parametreler:**
- `path` (string): Firebase-style yol

**Davranış:**
- `path` bir `field` içeriyorsa → alan `null`'a set edilir
- `path` bir `id` içeriyorsa → satır silinir

---

## Ref Uyumluluk Katmanı

### `ref(path)`

Firebase `ref()` API'sine tam uyumlu bir nesne döndürür.

```javascript
const ref = supabaseService.ref('sessions/session_123/info/pinned');

// Firebase uyumlu zincir çağrılar
await ref.set(true);
await ref.update({ lastActive: Date.now() });
await ref.remove();
const result = await ref.push({ sender: 'user', message: 'Hi' });

// Real-time listener
const unsubscribe = ref.on('value', (snapshot) => {
  const data = snapshot.val();
});
ref.off('value');
```

**Döndürdüğü nesnenin metodları:**
| Metod | Açıklama |
|---|---|
| `set(value)` | Değeri yaz/güncelle |
| `push(data)` | Yeni kayıt ekle |
| `update(data)` | Mevcut kaydı güncelle |
| `remove()` | Sil |
| `on(eventType, callback)` | Real-time dinleyici ekle |
| `off(eventType, callback)` | Dinleyiciyi kaldır |

---

## Real-Time Abonelikler

### `subscribe(path, callback, eventType?)`

Real-time listener kurar. İki event tipi desteklenir:

#### `value` event (varsayılan)

Tüm veriyi getirir ve değişiklikleri dinler. Her değişiklikte tam veri setini yeniden yükler.

```javascript
const unsubscribe = supabaseService.subscribe('sessions', (snapshot) => {
  const allSessions = snapshot.val();
  snapshot.forEach((child) => {
    console.log(child.key, child.val());
  });
}, 'value');

// Dinleyiciyi kaldır
unsubscribe();
```

**Özellikler:**
- İlk çağrıda mevcut veriyi getirir
- Supabase Realtime ile değişiklikleri dinler
- 10 saniye aralıkla yedek polling yapar (`refreshInterval`)
- Sessions dinlenirken `messages` tablosu da otomatik izlenir

#### `child_added` event

Sadece yeni eklenen kayıtları dinler. Mevcut kayıtlar tetiklenmez.

```javascript
const unsubscribe = supabaseService.subscribe(
  'sessions/session_123/messages',
  (snapshot) => {
    console.log('Yeni mesaj:', snapshot.key, snapshot.val());
  },
  'child_added'
);
```

**Özellikler:**
- Sadece `INSERT` olaylarını dinler
- Mevcut kayıtların ID'leri yüklenip duplikat önlenir (`knownIds` Set)
- Widget'ta admin mesajlarını dinlemek için kullanılır

---

### `unsubscribeAll()`

Tüm aktif listener'ları ve polling interval'larını temizler.

```javascript
supabaseService.unsubscribeAll();
```

---

## Bağlantı Yönetimi

### `isConnectionActive()`

```javascript
const active = supabaseService.isConnectionActive();
```

**Döner:** `boolean`

### `setupConnectionMonitoring()`

Firebase uyumluluğu için mevcuttur. Supabase'de otomatik yönetildiğinden ek işlem yapmaz.

### `disconnect()`

Tüm listener'ları temizler ve bağlantıyı kapatır.

```javascript
supabaseService.disconnect();
```

---

## Dosya Yükleme

### `uploadFile(file)`

Dosyayı Supabase Storage'a (`chat-media` bucket) yükler.

```javascript
const result = await supabaseService.uploadFile(file);
console.log(result.url);  // Public URL
console.log(result.type); // 'image' veya 'video'
```

**Parametreler:**
- `file` (File): HTML File nesnesi

**Döner:** `Promise<{ url: string, type: string }>`

**Kısıtlamalar:**
| Kural | Değer |
|---|---|
| Maksimum boyut | 10 MB |
| İzin verilen resim formatları | JPEG, PNG, GIF, WEBP |
| İzin verilen video formatları | MP4, WEBM |
| Depolama bucket'ı | `chat-media` |
| Dosya yolu şablonu | `chat/{timestamp}_{random}.{ext}` |
| Cache kontrolü | 3600 saniye |

---

## Yardımcı Metodlar

### `generateSessionId()`

Firebase uyumlu session ID üretir.

```javascript
const id = supabaseService.generateSessionId();
// Örnek: session_1720000000000_abc123def456_xyz789abc012_qwert123
```

**Format:** `session_{timestamp}_{random1}_{random2}_{random3}`

### `createUniqueSessionId()`

Veritabanında çakışma olmadığını doğrulayarak benzersiz session ID üretir.

```javascript
const id = await supabaseService.createUniqueSessionId();
```

**Döner:** `Promise<string>`  
**Yeniden deneme:** Maksimum 10 deneme, her denemede 100ms bekleme.

### `handleError(error, context?)`

Hatayı konsola loglar ve `uiService.showToast()` ile kullanıcıya gösterir.

```javascript
supabaseService.handleError(new Error('Bağlantı hatası'), 'read');
```

---

## Field Mapping Referansı

### camelCase → snake_case

| JavaScript (camelCase) | PostgreSQL (snake_case) |
|---|---|
| `customName` | `custom_name` |
| `phoneNumber` | `phone_number` |
| `startTime` | `start_time` |
| `lastActive` | `last_active` |
| `userAgent` | `user_agent` |
| `needsAttention` | `needs_attention` |
| `hasPendingQuestion` | `has_pending_question` |
| `lastReadTimestamp` | `last_read_timestamp` |
| `lastMessage` | `last_message` |
| `controlMode` / `mode` | `control_mode` |
| `ownerUserId` | `owner_user_id` |
| `fromAdmin` | `from_admin` |
| `contextTags` | `context_tags` |
| `endTime` | `end_time` |
| `conversationHistory` | `conversation_history` |
| `replyTo` | `reply_to` |
| `sessionId` | `session_id` |
| `autoReply` | `auto_reply` |
| `createdAt` | `created_at` |
| `mediaUrl` | `media_url` |
| `mediaType` | `media_type` |

> **Not:** `createdAt` alanı `write()` ve `push()` sırasında otomatik atlanır (veritabanında `DEFAULT NOW()` ile oluşturulur).

---

## Path Parsing Referansı

| Firebase Path | Tablo | Aksiyon | Açıklama |
|---|---|---|---|
| `sessions` | `sessions` | `list` | Tüm session'lar |
| `sessions/{id}` | `sessions` | `get` | Tek session + mesajları |
| `sessions/{id}/info` | `sessions` | `get` | Session bilgileri |
| `sessions/{id}/info/{field}` | `sessions` | `field` | Tek alan |
| `sessions/{id}/control` | `sessions` | `get` | Kontrol modu |
| `sessions/{id}/control/mode` | `sessions` | `field` | `control_mode` alanı |
| `sessions/{id}/messages` | `messages` | `list` | Session mesajları |
| `sessions/{id}/messages/{msgId}` | `messages` | `get` | Tek mesaj |
| `sessions/{id}/messages/{msgId}/{field}` | `messages` | `field` | Mesaj alanı |
| `pending_questions` | `pending_questions` | `list` | Tüm bekleyen sorular |
| `pending_questions/{id}` | `pending_questions` | `get` | Tek soru |
| `learned_responses` | `learned_responses` | `list` | Tüm öğrenilmiş yanıtlar |
| `learned_responses/{id}` | `learned_responses` | `get` | Tek yanıt |
| `scheduled_messages` | `scheduled_messages` | `list` | Zamanlanmış mesajlar |
| `timed_responses_config` | `timed_responses_config` | `list` | Zamanlı yanıt ayarları |
| `timed_responses` | `timed_responses` | `list` | Zamanlı soru-yanıt çiftleri |

---

## Sınıf Özellikleri

| Özellik | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `client` | `Object\|null` | `null` | Supabase client |
| `isConnected` | `boolean` | `false` | Bağlantı durumu |
| `config` | `Object\|null` | `null` | Aktif konfigürasyon |
| `retryCount` | `number` | `0` | Mevcut yeniden deneme sayacı |
| `maxRetries` | `number` | `3` | Maksimum yeniden deneme |
| `listeners` | `Map` | `new Map()` | Aktif listener'lar |
| `channels` | `Map` | `new Map()` | Supabase Realtime kanalları |
| `currentUser` | `Object\|null` | `null` | Oturum açmış kullanıcı |
| `_cachedData` | `Object` | `{}` | Dahili cache |

---

## Global Erişim

```javascript
// Her iki isimle de erişilebilir
window.supabaseService  // Doğrudan Supabase adıyla
window.firebaseService  // Firebase uyumluluğu — aynı örneğe işaret eder

// Module import
const { supabaseService } = require('./services/supabase-service.js');
```

---

*Son güncelleme: 2026-07-10*
