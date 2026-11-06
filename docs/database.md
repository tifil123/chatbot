# Veritabanı ve Güvenlik Dokümantasyonu

Supabase PostgreSQL veritabanı şeması, RLS güvenlik politikaları ve SQL yardımcı scriptleri.

## 📋 İçerik

- [Tablo Şeması](#tablo-şeması)
- [İndeksler](#i̇ndeksler)
- [RLS Güvenlik Modeli](#rls-güvenlik-modeli)
- [SQL Script Referansı](#sql-script-referansı)
- [Migration Scripti](#migration-scripti)

---

## Tablo Şeması

Tüm tablolar `server/db/schema.sql` dosyasında tanımlanmıştır.

### sessions

Kullanıcı oturumları. Firebase'deki `sessions/{id}/info` ve `sessions/{id}/control` yapısının birleşimi.

| Kolon | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `id` | `TEXT` (PK) | — | Session benzersiz kimliği |
| `custom_name` | `TEXT` | `'isimsiz'` | Kullanıcı görünen adı |
| `phone_number` | `TEXT` | `null` | Telefon numarası |
| `start_time` | `BIGINT` | — | Oturum başlangıç zamanı (Unix ms) |
| `last_active` | `BIGINT` | — | Son aktivite zamanı (Unix ms) |
| `user_agent` | `TEXT` | — | Tarayıcı user-agent bilgisi |
| `status` | `TEXT` | `'active'` | Oturum durumu (`active` / `ended`) |
| `pinned` | `BOOLEAN` | `FALSE` | Sabitlenmiş mi |
| `needs_attention` | `BOOLEAN` | `FALSE` | Admin dikkatine ihtiyacı var mı |
| `has_pending_question` | `BOOLEAN` | `FALSE` | Bekleyen soru var mı |
| `last_read_timestamp` | `BIGINT` | `0` | Son okunma zamanı |
| `last_message` | `TEXT` | `null` | Son mesaj önizlemesi |
| `control_mode` | `TEXT` | `'auto'` | Kontrol modu (`auto` / `manual`) |
| `owner_user_id` | `UUID` (FK → `auth.users`) | `null` | Widget oturumunun sahibi |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | Kayıt oluşturma zamanı |

### messages

Sohbet mesajları. Firebase'deki `sessions/{id}/messages` yapısı.

| Kolon | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `id` | `TEXT` (PK) | `gen_random_uuid()` | Mesaj benzersiz kimliği |
| `session_id` | `TEXT` (FK → `sessions.id`, CASCADE) | — | Ait olduğu session |
| `sender` | `TEXT` | — | Gönderen (`'user'` / `'bot'`) |
| `message` | `TEXT` | — | Mesaj içeriği |
| `timestamp` | `BIGINT` | — | Gönderim zamanı (Unix ms) |
| `seen` | `BOOLEAN` | `FALSE` | Okundu mu |
| `from_admin` | `BOOLEAN` | `FALSE` | Admin tarafından mı gönderildi |
| `auto_reply` | `BOOLEAN` | `FALSE` | Otomatik yanıt mı |
| `learned` | `BOOLEAN` | `FALSE` | Öğrenilmiş yanıttan mı |
| `scheduled` | `BOOLEAN` | `FALSE` | Zamanlanmış mesaj mı |
| `reply_to` | `JSONB` | `null` | Yanıtlanan mesaj bilgisi |
| `media_url` | `TEXT` | `null` | Medya dosyası URL'si |
| `media_type` | `TEXT` | `null` | Medya tipi (`'image'` / `'video'`) |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | Kayıt oluşturma zamanı |

### pending_questions

Botun cevaplayamadığı sorular. Admin tarafından incelenir.

| Kolon | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `id` | `TEXT` (PK) | `gen_random_uuid()` | Benzersiz kimlik |
| `session_id` | `TEXT` (FK → `sessions.id`, CASCADE) | — | Sorunun geldiği session |
| `question` | `TEXT` | — | Soru metni |
| `conversation_history` | `TEXT` | `null` | Sohbet geçmişi bağlamı |
| `timestamp` | `BIGINT` | — | Soru zamanı (Unix ms) |
| `status` | `TEXT` | `'pending'` | Durum (`pending` / `answered`) |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | Kayıt oluşturma zamanı |

### learned_responses

Chatbota öğretilmiş soru-yanıt çiftleri.

| Kolon | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `id` | `TEXT` (PK) | `gen_random_uuid()` | Benzersiz kimlik |
| `question` | `TEXT` | — | Soru kalıbı |
| `response` | `TEXT` | — | Yanıt metni |
| `context_tags` | `JSONB` | `null` | Bağlam etiketleri |
| `timestamp` | `BIGINT` | `null` | Öğretilme zamanı |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | Kayıt oluşturma zamanı |

### scheduled_messages

Belirli saat aralığında gönderilecek zamanlanmış mesajlar.

| Kolon | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `id` | `TEXT` (PK) | `gen_random_uuid()` | Benzersiz kimlik |
| `start_time` | `TEXT` | — | Başlangıç saati (HH:MM) |
| `end_time` | `TEXT` | — | Bitiş saati (HH:MM) |
| `message` | `TEXT` | — | Mesaj içeriği |
| `enabled` | `BOOLEAN` | `TRUE` | Aktif mi |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | Kayıt oluşturma zamanı |

### timed_responses_config

Zamanlı yanıt sisteminin genel açma/kapama ayarı. Tek satırlık tablo.

| Kolon | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `id` | `TEXT` (PK) | `'default'` | Sabit kimlik |
| `enabled` | `BOOLEAN` | `FALSE` | Sistem aktif mi |
| `start_time` | `TEXT` | `'09:00'` | Aktif olma başlangıcı |
| `end_time` | `TEXT` | `'18:00'` | Aktif olma bitişi |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | Kayıt oluşturma zamanı |

### timed_responses

Zamanlı yanıt sistemi aktifken kullanılacak soru-yanıt çiftleri.

| Kolon | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `id` | `TEXT` (PK) | `gen_random_uuid()` | Benzersiz kimlik |
| `question` | `TEXT` | — | Soru kalıbı |
| `response` | `TEXT` | — | Yanıt metni |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | Kayıt oluşturma zamanı |

---

## İndeksler

| İndeks | Tablo | Kolon(lar) | Amaç |
|---|---|---|---|
| `idx_messages_session` | `messages` | `session_id` | Session bazlı mesaj sorguları |
| `idx_messages_timestamp` | `messages` | `timestamp` | Zamana göre sıralama |
| `idx_pending_session` | `pending_questions` | `session_id` | Session bazlı soru sorguları |
| `idx_pending_status` | `pending_questions` | `status` | Durum bazlı filtreleme |
| `idx_sessions_phone` | `sessions` | `phone_number` | Telefon numarası araması |
| `idx_sessions_owner` | `sessions` | `owner_user_id` | Sahiplik bazlı sorgular |

---

## RLS Güvenlik Modeli

Tüm tablolarda **Row Level Security (RLS)** etkin ve zorunludur (`FORCE ROW LEVEL SECURITY`).

### Admin Rol Tespiti

Admin kontrolü `is_chatbot_admin()` SQL fonksiyonu ile yapılır:

```sql
-- JWT token'ında yalnızca app_metadata.role = 'admin' ise TRUE
-- user_metadata kullanıcı tarafından değiştirilebilir, yetki kontrolünde kullanılmaz
SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', FALSE);
```

Admin hesabının `app_metadata` alanında `role: admin` bulunmalıdır. Bu alan yalnızca sunucu tarafından değiştirilebilir; değişiklikten sonra yeni token için çıkış yapıp tekrar giriş yapın.

### Politika Özeti

| Tablo | Rol | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `sessions` | Admin | ✅ | ✅ | ✅ | ✅ |
| `sessions` | Ziyaretçi | Kendi¹ | Kısıtlı² | Kendi¹ | ❌ |
| `messages` | Admin | ✅ | ✅ | ✅ | ✅ |
| `messages` | Ziyaretçi | Kendi¹ | Kısıtlı³ | ❌ | ❌ |
| `pending_questions` | Admin | ✅ | ✅ | ✅ | ✅ |
| `pending_questions` | Ziyaretçi | ❌ | Kısıtlı⁴ | ❌ | ❌ |
| `learned_responses` | Admin | ✅ | ✅ | ✅ | ✅ |
| `learned_responses` | Herkes | ✅ | ❌ | ❌ | ❌ |
| `scheduled_messages` | Admin | ✅ | ✅ | ✅ | ✅ |
| `scheduled_messages` | Herkes | Aktifler⁵ | ❌ | ❌ | ❌ |
| `timed_responses_config` | Admin | ✅ | ✅ | ✅ | ✅ |
| `timed_responses_config` | Herkes | ✅ | ❌ | ❌ | ❌ |
| `timed_responses` | Admin | ✅ | ✅ | ✅ | ✅ |
| `timed_responses` | Herkes | ✅ | ❌ | ❌ | ❌ |

**Dipnotlar:**

1. **Kendi**: `owner_user_id = auth.uid()` — sadece sahibi olduğu session/mesajları görebilir/düzenleyebilir.
2. **Kısıtlı session oluşturma**: `id IS NOT NULL`, `owner_user_id = auth.uid()`, `status = 'active'`, `control_mode = 'auto'`, `pinned = FALSE`, `needs_attention = FALSE`.
3. **Kısıtlı mesaj oluşturma**: `sender = 'user'` veya `sender = 'bot'`, kendi session'ına ait, `from_admin = FALSE`, `auto_reply = FALSE`, `learned = FALSE`, `scheduled = FALSE`, `1 ≤ length(message) ≤ 1000`.
4. **Kısıtlı soru oluşturma**: Kendi session'ına ait, `status = 'pending'`, `1 ≤ length(question) ≤ 1000`.
5. **Aktifler**: `enabled = TRUE` olan kayıtlar.

### Storage (`chat-media`)

Kova herkese açık okunur. Yükleme için Supabase oturumu gerekir (widget'ın anonim oturumu da sayılır) ve dosyalar `chat/` klasöründe olmalıdır. Kova 10 MB sınırını ve izin verilen tipleri (JPEG, PNG, GIF, WEBP, MP4, WEBM) sunucu tarafında uygular.

### Güvenlik Mimarisi Şeması

```
┌─────────────────┐     ┌──────────────────┐
│  Admin Panel     │     │  Chat Widget     │
│  (authenticated) │     │  (anonymous auth)│
└───────┬─────────┘     └───────┬──────────┘
        │                       │
        │ signInWithEmail()     │ signInAnonymously()
        │ role=admin JWT        │ anonymous JWT
        │                       │
        ▼                       ▼
┌─────────────────────────────────────────┐
│         Supabase RLS Katmanı            │
│  ┌──────────┐  ┌─────────────────────┐  │
│  │ is_admin? │  │ owner_user_id check│  │
│  │ → full    │  │ → scoped access    │  │
│  │   access  │  │                    │  │
│  └──────────┘  └─────────────────────┘  │
└─────────────────────────────────────────┘
```

> **Bilinen kısıt:** Bot cevapları şu anda tarayıcıda üretilip doğrudan veritabanına yazılıyor. Daha güvenli nihai çözüm, bot yanıtını bir Edge Function veya backend üzerinden `service_role` key ile yazmaktır.

---

## Real-Time Yayınlar

Aşağıdaki tablolar Supabase Realtime'a eklenmiştir:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE learned_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE timed_responses_config;
ALTER PUBLICATION supabase_realtime ADD TABLE timed_responses;
```

---

## SQL Script Referansı

Tüm scriptler `server/db/` dizinindedir.

| Dosya | Amaç | Ne Zaman Çalıştırılır |
|---|---|---|
| `schema.sql` | Ana veritabanı şeması + RLS politikaları (birleşik) | İlk kurulum — tüm tabloları, indeksleri, RLS politikalarını ve `is_chatbot_admin()` fonksiyonunu oluşturur |
| `secure-rls-policies.sql` | `is_chatbot_admin()` fonksiyonlu RLS politikaları | `schema.sql`'den bağımsız uygulamak gerekirse |
| `secure-rls-policies-simple.sql` | SQL fonksiyon blokları olmayan basitleştirilmiş RLS | Supabase SQL Editor'de doğrudan yapıştırma kolaylığı için |
| `secure-widget-ownership.sql` | `owner_user_id` kolonu + ziyaretçi sahiplik politikaları | İlk RLS kurulumundan sonra |
| `secure-storage-policies.sql` | `chat-media` yükleme politikası, dosya tipi ve boyut sınırları | RLS kurulumundan sonra; tekrar çalıştırılabilir |
| `check-security-status.sql` | Güvenlik durumu kontrolü (salt okunur) | Politika kurallarını, `user_metadata` bağımlılıklarını ve `chat-media` sınırlarını doğrulamak için |

### Çalıştırma Sırası (Temiz Kurulum)

1. `schema.sql` — Tabloları, indeksleri, realtime yayınları ve tüm RLS politikalarını oluşturur.
2. `secure-storage-policies.sql` — `chat-media` kovasını kilitler.
3. Doğrulama: `check-security-status.sql` çalıştırın.

### Çalıştırma Sırası (Mevcut DB'ye RLS Ekleme)

1. `secure-rls-policies-simple.sql` veya `secure-rls-policies.sql`
2. `secure-widget-ownership.sql`
3. `secure-storage-policies.sql`
4. Doğrulama: `check-security-status.sql`

---

## Migration Scripti

`server/db/migrate-firebase-to-supabase.js` — Firebase Realtime Database'den Supabase PostgreSQL'e veri aktarımı.

### Kullanım

```bash
cd server/db
npm install
node migrate-firebase-to-supabase.js
```

### Bağımlılıklar

`server/db/package.json` içinde tanımlıdır:
- `firebase` — Firebase SDK
- `@supabase/supabase-js` — Supabase istemcisi

### Aktarılan Tablolar

1. `sessions` — Session bilgileri (info + control alanları birleştirilir)
2. `messages` — Tüm mesajlar
3. `pending_questions` — Bekleyen sorular
4. `learned_responses` — Öğrenilmiş yanıtlar
5. `scheduled_messages` — Zamanlanmış mesajlar

> **Not:** Bu script tek seferlik kullanım içindir. Firebase'den Supabase'e geçiş tamamlandıktan sonra tekrar çalıştırılmasına gerek yoktur.

---

*Son güncelleme: 2026-07-10*
