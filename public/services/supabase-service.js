/**
 * Supabase Service Katmanı
 * Firebase Service ile aynı interface - migration için drop-in replacement
 * firebase-service.js yerine kullanılır
 */

class SupabaseService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.config = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.listeners = new Map();
        this.channels = new Map();
        this.currentUser = null;
        this._cachedData = {};
    }

    // ============ FIELD MAPPING ============

    /**
     * Firebase camelCase field adlarını PostgreSQL snake_case'e çevir
     */
    _toSnakeCase(key) {
        const map = {
            customName: 'custom_name',
            phoneNumber: 'phone_number',
            startTime: 'start_time',
            lastActive: 'last_active',
            userAgent: 'user_agent',
            needsAttention: 'needs_attention',
            hasPendingQuestion: 'has_pending_question',
            lastReadTimestamp: 'last_read_timestamp',
            lastMessage: 'last_message',
            controlMode: 'control_mode',
            fromAdmin: 'from_admin',
            contextTags: 'context_tags',
            endTime: 'end_time',
            conversationHistory: 'conversation_history',
            replyTo: 'reply_to',
            sessionId: 'session_id',
            autoReply: 'auto_reply',
        };
        return map[key] || key;
    }

    /**
     * PostgreSQL snake_case field adlarını Firebase camelCase'e çevir
     */
    _toCamelCase(key) {
        const map = {
            custom_name: 'customName',
            phone_number: 'phoneNumber',
            start_time: 'startTime',
            last_active: 'lastActive',
            user_agent: 'userAgent',
            needs_attention: 'needsAttention',
            has_pending_question: 'hasPendingQuestion',
            last_read_timestamp: 'lastReadTimestamp',
            last_message: 'lastMessage',
            control_mode: 'controlMode',
            from_admin: 'fromAdmin',
            context_tags: 'contextTags',
            end_time: 'endTime',
            conversation_history: 'conversationHistory',
            reply_to: 'replyTo',
            session_id: 'sessionId',
            auto_reply: 'auto',
            created_at: 'createdAt',
        };
        return map[key] || key;
    }

    /**
     * Objedeki tüm key'leri snake_case'e çevir
     */
    _convertKeysToSnake(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[this._toSnakeCase(key)] = value;
        }
        return result;
    }

    /**
     * Objedeki tüm key'leri camelCase'e çevir
     */
    _convertKeysToCamel(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[this._toCamelCase(key)] = value;
        }
        return result;
    }

    // ============ PATH PARSING ============

    /**
     * Firebase-style path'i Supabase tablo/id/field yapısına çevir
     * Örn: 'sessions/xxx/info/pinned' → {table:'sessions', id:'xxx', field:'pinned'}
     * Örn: 'sessions/xxx/messages' → {table:'messages', filter:{session_id:'xxx'}}
     */
    _parsePath(path) {
        const parts = path.split('/').filter(p => p.length > 0);

        if (parts.length === 0) return null;

        const root = parts[0]; // sessions, pending_questions, learned_responses, scheduled_messages

        if (root === 'sessions') {
            if (parts.length === 1) {
                // sessions
                return { table: 'sessions', action: 'list' };
            }
            if (parts.length === 2) {
                // sessions/{id}
                return { table: 'sessions', id: parts[1], action: 'get' };
            }
            if (parts.length >= 3) {
                const section = parts[2]; // info, messages, control

                if (section === 'messages') {
                    if (parts.length === 3) {
                        // sessions/{id}/messages
                        return { table: 'messages', filter: { session_id: parts[1] }, action: 'list' };
                    }
                    if (parts.length === 4) {
                        // sessions/{id}/messages/{msgId}
                        return { table: 'messages', id: parts[3], action: 'get' };
                    }
                    if (parts.length === 5) {
                        // sessions/{id}/messages/{msgId}/{field} (e.g., seen)
                        return { table: 'messages', id: parts[3], field: parts[4], action: 'field' };
                    }
                }

                if (section === 'info') {
                    if (parts.length === 3) {
                        // sessions/{id}/info
                        return { table: 'sessions', id: parts[1], section: 'info', action: 'get' };
                    }
                    if (parts.length === 4) {
                        // sessions/{id}/info/{field}
                        return { table: 'sessions', id: parts[1], field: this._toSnakeCase(parts[3]), action: 'field' };
                    }
                }

                if (section === 'control') {
                    if (parts.length === 3) {
                        // sessions/{id}/control
                        return { table: 'sessions', id: parts[1], section: 'control', action: 'get' };
                    }
                    if (parts.length === 4) {
                        // sessions/{id}/control/mode
                        return { table: 'sessions', id: parts[1], field: 'control_mode', action: 'field' };
                    }
                }
            }
        }

        // pending_questions, learned_responses, scheduled_messages
        if (['pending_questions', 'learned_responses', 'scheduled_messages'].includes(root)) {
            if (parts.length === 1) {
                return { table: root, action: 'list' };
            }
            if (parts.length === 2) {
                return { table: root, id: parts[1], action: 'get' };
            }
            if (parts.length === 3) {
                // e.g., learned_responses/{id}/response
                return { table: root, id: parts[1], field: this._toSnakeCase(parts[2]), action: 'field' };
            }
        }

        console.warn('⚠️ Bilinmeyen path:', path);
        return { table: root, action: 'unknown' };
    }

    // ============ SESSION DATA RECONSTRUCTION ============

    /**
     * Supabase session satırını Firebase-uyumlu nested yapıya çevir
     */
    _sessionRowToFirebaseFormat(row, messages = []) {
        const messagesObj = {};
        messages.forEach(msg => {
            messagesObj[msg.id] = {
                sender: msg.sender,
                message: msg.message,
                timestamp: msg.timestamp,
                seen: msg.seen || false,
                fromAdmin: msg.from_admin || false,
                auto: msg.auto_reply || false,
                learned: msg.learned || false,
                scheduled: msg.scheduled || false,
                replyTo: msg.reply_to || null,
            };
        });

        return {
            info: {
                customName: row.custom_name || 'isimsiz',
                phoneNumber: row.phone_number || null,
                startTime: row.start_time,
                lastActive: row.last_active,
                userAgent: row.user_agent,
                status: row.status || 'active',
                pinned: row.pinned || false,
                needsAttention: row.needs_attention || false,
                hasPendingQuestion: row.has_pending_question || false,
                lastReadTimestamp: row.last_read_timestamp || 0,
                lastMessage: row.last_message || null,
            },
            messages: messagesObj,
            control: {
                mode: row.control_mode || 'auto',
            },
        };
    }

    /**
     * Message satırını Firebase-uyumlu formata çevir
     */
    _messageRowToFirebaseFormat(row) {
        return {
            sender: row.sender,
            message: row.message,
            timestamp: row.timestamp,
            seen: row.seen || false,
            fromAdmin: row.from_admin || false,
            auto: row.auto_reply || false,
            learned: row.learned || false,
            scheduled: row.scheduled || false,
            replyTo: row.reply_to || null,
        };
    }

    /**
     * Learned response satırını Firebase-uyumlu formata çevir
     */
    _learnedRowToFirebaseFormat(row) {
        return {
            question: row.question,
            response: row.response,
            contextTags: row.context_tags || null,
            timestamp: row.timestamp,
            learnedAt: row.learned_at || row.timestamp || Date.now(),
            learnedFrom: row.learned_from || 'unknown',
        };
    }

    /**
     * Pending question satırını Firebase-uyumlu formata çevir
     */
    _pendingRowToFirebaseFormat(row) {
        return {
            sessionId: row.session_id,
            question: row.question,
            conversationHistory: row.conversation_history,
            timestamp: row.timestamp,
            status: row.status,
        };
    }

    /**
     * Scheduled message satırını Firebase-uyumlu formata çevir
     */
    _scheduledRowToFirebaseFormat(row) {
        return {
            startTime: row.start_time,
            endTime: row.end_time,
            message: row.message,
            enabled: row.enabled,
        };
    }

    // ============ SNAPSHOT WRAPPERS ============

    /**
     * Firebase Snapshot benzeri wrapper (forEach, val, key desteği)
     */
    _createSnapshot(data) {
        return {
            _data: data,
            val() {
                return this._data;
            },
            forEach(callback) {
                if (!this._data) return;
                for (const [key, value] of Object.entries(this._data)) {
                    callback({
                        key: key,
                        _value: value,
                        val() { return this._value; }
                    });
                }
            },
            numChildren() {
                return this._data ? Object.keys(this._data).length : 0;
            }
        };
    }

    /**
     * child_added event için tek kayıt snapshot
     */
    _createChildSnapshot(key, value) {
        return {
            key: key,
            _value: value,
            val() { return this._value; },
            numChildren() { return 0; }
        };
    }

    // ============ ANA METODLAR ============

    /**
     * Supabase'e bağlan (Firebase connect() uyumlu)
     * @param {Object} config - Konfigürasyon (opsiyonel)
     * @returns {Promise<Object>} Supabase client
     */
    async connect(config = null) {
        if (this.isConnected && this.client) {
            return this.client;
        }

        try {
            this.config = config || window.SupabaseConfig?.getActiveConfig?.() || window.SupabaseConfig?.SUPABASE_CONFIG;

            if (!this.config || !this.config.url) {
                throw new Error('Supabase konfigürasyonu bulunamadı! Lütfen config/supabase-config.js dosyasını kontrol edin.');
            }

            const url = this.config.url || this.config.databaseURL;
            const key = this.config.anonKey;

            if (!url || !key) {
                throw new Error('Supabase URL veya Anon Key eksik!');
            }

            // Supabase client oluştur
            this.client = supabase.createClient(url, key, {
                realtime: {
                    params: {
                        eventsPerSecond: 10,
                    },
                },
            });

            this.isConnected = true;
            this.retryCount = 0;
            this.currentUser = { uid: 'anonymous_' + Date.now() };

            console.log('✅ Supabase bağlantısı başarılı:', url);
            return this.client;

        } catch (error) {
            console.error('❌ Supabase bağlantı hatası:', error);

            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Yeniden bağlanılıyor (${this.retryCount}/${this.maxRetries})...`);
                await this.delay(this.config?.settings?.retryDelay || 1000);
                return this.connect(this.config);
            }

            throw new Error(`Supabase bağlantısı ${this.maxRetries} denemeden sonra başarısız: ${error.message}`);
        }
    }

    /**
     * Anonim giriş simülasyonu (Firebase uyumluluğu için)
     */
    async signInAnonymously() {
        this.currentUser = { uid: 'anonymous_' + Date.now() };
        console.log('✅ Anonim oturum oluşturuldu:', this.currentUser.uid);
        return this.currentUser;
    }

    /**
     * Mevcut kullanıcıyı al
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Database reference (Firebase uyumluluğu)
     */
    getDatabase() {
        if (!this.client) {
            throw new Error('Supabase bağlı değil. connect() çağırın.');
        }
        return this.client;
    }

    // ============ CRUD İŞLEMLERİ ============

    /**
     * Veri oku (Firebase read() uyumlu)
     * @param {string} path - Firebase-style path
     * @returns {Promise<Object>} Data
     */
    async read(path) {
        try {
            const parsed = this._parsePath(path);
            if (!parsed) return null;

            // Sessions - tüm session'ları mesajlarıyla birlikte getir
            if (parsed.table === 'sessions' && parsed.action === 'list') {
                const { data: sessions, error: sErr } = await this.client
                    .from('sessions')
                    .select('*');
                if (sErr) throw sErr;
                if (!sessions || sessions.length === 0) return null;

                const { data: allMessages, error: mErr } = await this.client
                    .from('messages')
                    .select('*')
                    .order('timestamp', { ascending: true });
                if (mErr) throw mErr;

                const result = {};
                for (const session of sessions) {
                    const sessionMessages = (allMessages || []).filter(m => m.session_id === session.id);
                    result[session.id] = this._sessionRowToFirebaseFormat(session, sessionMessages);
                }
                return result;
            }

            // Tek session
            if (parsed.table === 'sessions' && parsed.id) {
                const { data: session, error: sErr } = await this.client
                    .from('sessions')
                    .select('*')
                    .eq('id', parsed.id)
                    .single();
                if (sErr && sErr.code !== 'PGRST116') throw sErr;
                if (!session) return null;

                if (parsed.section === 'control') {
                    return { mode: session.control_mode || 'auto' };
                }

                const { data: messages, error: mErr } = await this.client
                    .from('messages')
                    .select('*')
                    .eq('session_id', parsed.id)
                    .order('timestamp', { ascending: true });
                if (mErr) throw mErr;

                return this._sessionRowToFirebaseFormat(session, messages || []);
            }

            // Session mesajları
            if (parsed.table === 'messages' && parsed.filter) {
                const { data: messages, error } = await this.client
                    .from('messages')
                    .select('*')
                    .eq('session_id', parsed.filter.session_id)
                    .order('timestamp', { ascending: true });
                if (error) throw error;
                if (!messages || messages.length === 0) return null;

                const result = {};
                messages.forEach(msg => {
                    result[msg.id] = this._messageRowToFirebaseFormat(msg);
                });
                return result;
            }

            // Learned responses
            if (parsed.table === 'learned_responses' && parsed.action === 'list') {
                console.log('🧠 learned_responses sorgusu başlıyor...');

                // Direct REST API call (Supabase JS client query hang sorununu bypass eder)
                const url = this.config.url || this.config.databaseURL;
                const key = this.config.anonKey;
                const response = await fetch(`${url}/rest/v1/learned_responses?select=*`, {
                    headers: {
                        'apikey': key,
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    throw new Error(`learned_responses fetch hatası: ${response.status}`);
                }

                const data = await response.json();
                console.log('🧠 learned_responses sorgu sonucu:', data?.length, 'adet');
                if (!data || data.length === 0) return null;

                const result = {};
                data.forEach(row => {
                    result[row.id] = this._learnedRowToFirebaseFormat(row);
                });
                console.log('🧠 learned_responses dönüştürüldü:', Object.keys(result).length, 'adet');
                return result;
            }

            // Pending questions
            if (parsed.table === 'pending_questions' && parsed.action === 'list') {
                const { data, error } = await this.client
                    .from('pending_questions')
                    .select('*');
                if (error) throw error;
                if (!data || data.length === 0) return null;

                const result = {};
                data.forEach(row => {
                    result[row.id] = this._pendingRowToFirebaseFormat(row);
                });
                return result;
            }

            // Scheduled messages
            if (parsed.table === 'scheduled_messages' && parsed.action === 'list') {
                const { data, error } = await this.client
                    .from('scheduled_messages')
                    .select('*');
                if (error) throw error;
                if (!data || data.length === 0) return null;

                const result = {};
                data.forEach(row => {
                    result[row.id] = this._scheduledRowToFirebaseFormat(row);
                });
                return result;
            }

            console.warn('⚠️ read() bilinmeyen path:', path);
            return null;

        } catch (error) {
            console.error(`❌ Error reading data from ${path}:`, error);
            throw error;
        }
    }

    /**
     * Veri yaz - SET (Firebase write() uyumlu)
     * @param {string} path - Firebase-style path
     * @param {Object} data - Yazılacak veri
     */
    async write(path, data) {
        try {
            console.log('🔥 Supabase write çağrıldı - path:', path);
            const parsed = this._parsePath(path);
            if (!parsed) throw new Error('Geçersiz path: ' + path);

            if (parsed.table === 'sessions' && parsed.id && parsed.section === 'info') {
                // sessions/{id}/info → UPSERT session
                const snakeData = this._convertKeysToSnake(data);
                snakeData.id = parsed.id;

                const { error } = await this.client
                    .from('sessions')
                    .upsert(snakeData, { onConflict: 'id' });
                if (error) throw error;
                console.log('✅ Supabase write başarılı - path:', path);
                return;
            }

            console.warn('⚠️ write() bilinmeyen path:', path);
        } catch (error) {
            console.error(`❌ Error writing data to ${path}:`, error);
            throw error;
        }
    }

    /**
     * Veri ekle - PUSH (Firebase push() uyumlu)
     * @param {string} path - Firebase-style path
     * @param {Object} data - Eklenecek veri
     * @returns {Object} { key: newId }
     */
    async push(path, data) {
        try {
            console.log('🔥 Supabase push çağrıldı - path:', path);
            const parsed = this._parsePath(path);
            if (!parsed) throw new Error('Geçersiz path: ' + path);

            const newId = this._generateId();
            const snakeData = this._convertKeysToSnake(data);
            snakeData.id = newId;

            // Messages - session_id ekle
            if (parsed.table === 'messages' && parsed.filter) {
                snakeData.session_id = parsed.filter.session_id;
            }

            // 'auto' field'ını 'auto_reply'ya çevir
            if ('auto' in data) {
                snakeData.auto_reply = data.auto;
                delete snakeData.auto;
            }

            const { error } = await this.client
                .from(parsed.table)
                .insert(snakeData);
            if (error) throw error;

            console.log('✅ Supabase push başarılı - path:', path, 'ID:', newId);
            return { key: newId };
        } catch (error) {
            console.error(`❌ Error pushing data to ${path}:`, error);
            throw error;
        }
    }

    /**
     * Veri güncelle (Firebase update() uyumlu)
     * @param {string} path - Firebase-style path
     * @param {Object} data - Güncellenecek veri
     */
    async update(path, data) {
        try {
            const parsed = this._parsePath(path);
            if (!parsed) throw new Error('Geçersiz path: ' + path);

            const snakeData = this._convertKeysToSnake(data);

            // 'mode' field'ını sessions tablosunda 'control_mode' olarak sakla
            if (parsed.table === 'sessions' && 'mode' in data) {
                snakeData.control_mode = data.mode;
                delete snakeData.mode;
            }

            if (parsed.id) {
                const { error } = await this.client
                    .from(parsed.table)
                    .update(snakeData)
                    .eq('id', parsed.id);
                if (error) throw error;
            } else if (parsed.filter) {
                const filterKey = Object.keys(parsed.filter)[0];
                const filterVal = parsed.filter[filterKey];
                const { error } = await this.client
                    .from(parsed.table)
                    .update(snakeData)
                    .eq(filterKey, filterVal);
                if (error) throw error;
            }

            return;
        } catch (error) {
            console.error(`❌ Error updating data at ${path}:`, error);
            throw error;
        }
    }

    /**
     * Veri sil (Firebase remove() uyumlu)
     * @param {string} path - Firebase-style path
     */
    async remove(path) {
        try {
            const parsed = this._parsePath(path);
            if (!parsed) throw new Error('Geçersiz path: ' + path);

            if (parsed.field) {
                // Tek bir field'ı null'a set et (kaldır)
                const nullData = {};
                nullData[parsed.field] = null;
                const { error } = await this.client
                    .from(parsed.table)
                    .update(nullData)
                    .eq('id', parsed.id);
                if (error) throw error;
            } else if (parsed.id) {
                const { error } = await this.client
                    .from(parsed.table)
                    .delete()
                    .eq('id', parsed.id);
                if (error) throw error;
            }

            return;
        } catch (error) {
            console.error(`❌ Error deleting data at ${path}:`, error);
            throw error;
        }
    }

    // ============ REF UYUMLULUK KATMANI ============

    /**
     * Firebase ref() uyumluluğu
     * firebaseService.ref('path').set(value), .push(data), .remove() destekler
     */
    ref(path) {
        const service = this;
        return {
            async set(value) {
                const parsed = service._parsePath(path);
                if (!parsed) throw new Error('Geçersiz path: ' + path);

                if (parsed.field) {
                    // Tek field güncelleme: sessions/xxx/info/pinned → UPDATE sessions SET pinned = value
                    const updateData = {};
                    updateData[parsed.field] = value;
                    const { error } = await service.client
                        .from(parsed.table)
                        .update(updateData)
                        .eq('id', parsed.id);
                    if (error) throw error;
                } else if (parsed.section === 'info' && parsed.id) {
                    // sessions/xxx/info → UPSERT session
                    const snakeData = service._convertKeysToSnake(
                        typeof value === 'object' ? value : {}
                    );
                    snakeData.id = parsed.id;
                    const { error } = await service.client
                        .from(parsed.table)
                        .upsert(snakeData, { onConflict: 'id' });
                    if (error) throw error;
                } else if (parsed.id && !parsed.field) {
                    // Doğrudan kayıt güncelle
                    const snakeData = typeof value === 'object'
                        ? service._convertKeysToSnake(value)
                        : value;
                    if (typeof snakeData === 'object') {
                        snakeData.id = parsed.id;
                    }
                    const { error } = await service.client
                        .from(parsed.table)
                        .upsert(typeof snakeData === 'object' ? snakeData : { id: parsed.id }, { onConflict: 'id' });
                    if (error) throw error;
                }
            },

            async push(data) {
                return service.push(path, data);
            },

            async remove() {
                return service.remove(path);
            },

            async update(data) {
                return service.update(path, data);
            },

            on(eventType, callback) {
                return service.subscribe(path, callback, eventType);
            },

            off(eventType, callback) {
                const listenerKey = `${path}_${eventType}`;
                const channel = service.channels.get(listenerKey);
                if (channel) {
                    service.client.removeChannel(channel);
                    service.channels.delete(listenerKey);
                    service.listeners.delete(listenerKey);
                }
            }
        };
    }

    // ============ REAL-TIME SUBSCRIPTIONS ============

    /**
     * Real-time listener (Firebase subscribe() uyumlu)
     * @param {string} path - Firebase-style path
     * @param {Function} callback - Callback fonksiyonu
     * @param {string} eventType - 'value' veya 'child_added'
     * @returns {Function} Unsubscribe fonksiyonu
     */
    subscribe(path, callback, eventType = 'value') {
        try {
            console.log(`🔗 Supabase listener kuruluyor: ${path} (${eventType})`);
            const parsed = this._parsePath(path);
            if (!parsed) return () => { };

            const listenerKey = `${path}_${eventType}`;

            if (eventType === 'child_added') {
                return this._subscribeChildAdded(path, parsed, callback, listenerKey);
            }

            // 'value' event type - tüm veriyi getir ve değişiklikleri dinle
            return this._subscribeValue(path, parsed, callback, listenerKey);
        } catch (error) {
            console.error(`❌ Error subscribing to ${path}:`, error);
            throw error;
        }
    }

    /**
     * 'value' event type subscription - Firebase snapshot uyumlu
     */
    _subscribeValue(path, parsed, callback, listenerKey) {
        const service = this;

        // İlk yükleme için veriyi getir
        async function fetchAndNotify() {
            try {
                console.log(`📖 fetchAndNotify çağrıldı: ${path}`);
                const data = await service.read(path);
                console.log(`📖 read sonucu (${path}):`, data ? Object.keys(data).length + ' kayıt' : 'null/boş');
                const snapshot = service._createSnapshot(data || {});
                callback(snapshot);
            } catch (error) {
                console.error(`❌ Subscription fetch hatası (${path}):`, error);
            }
        }

        // İlk yüklemeleri sırayla çalıştır (eşzamanlık sorununu önle)
        if (!this._fetchQueue) {
            this._fetchQueue = Promise.resolve();
        }
        this._fetchQueue = this._fetchQueue.then(() => fetchAndNotify());

        // Hangi tabloları dinleyeceğimizi belirle
        let tablesToWatch = [parsed.table];
        if (parsed.table === 'sessions') {
            tablesToWatch = ['sessions', 'messages']; // Sessions değiştiğinde mesajlar da gerekli
        }

        // Real-time channel oluştur
        const channelName = 'sub_' + listenerKey.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
        let channel = this.client.channel(channelName);

        for (const table of tablesToWatch) {
            const filterConfig = {
                event: '*',
                schema: 'public',
                table: table,
            };

            // Belirli bir session'ın mesajlarını filtreliyorsak
            if (table === 'messages' && parsed.filter?.session_id) {
                filterConfig.filter = `session_id=eq.${parsed.filter.session_id}`;
            }

            channel = channel.on(
                'postgres_changes',
                filterConfig,
                (payload) => {
                    console.log(`🔥 Supabase real-time tetiklendi: ${table} (${payload.eventType})`);
                    // Veriyi yeniden getir ve callback'i çağır
                    fetchAndNotify();
                }
            );
        }

        channel.subscribe((status) => {
            console.log(`📡 Supabase channel durumu (${listenerKey}):`, status);
        });

        // Channel'ı kaydet
        this.channels.set(listenerKey, channel);
        this.listeners.set(listenerKey, { path, callback, eventType: 'value' });

        console.log(`✅ Supabase listener kuruldu: ${listenerKey}`);

        // Unsubscribe fonksiyonu döndür
        return () => {
            this.client.removeChannel(channel);
            this.channels.delete(listenerKey);
            this.listeners.delete(listenerKey);
            console.log(`❌ Supabase listener kaldırıldı: ${listenerKey}`);
        };
    }

    /**
     * 'child_added' event type - yeni kayıt eklendiğinde tetiklenir
     * Widget'ta admin mesajlarını dinlemek için kullanılır
     */
    _subscribeChildAdded(path, parsed, callback, listenerKey) {
        const service = this;

        // Mevcut mesaj ID'lerini takip et (duplikat önleme)
        const knownIds = new Set();

        // Mevcut mesajları yükle ve ID'lerini kaydet
        async function loadExistingIds() {
            try {
                if (parsed.table === 'messages' && parsed.filter) {
                    const { data, error } = await service.client
                        .from('messages')
                        .select('id')
                        .eq('session_id', parsed.filter.session_id);
                    if (!error && data) {
                        data.forEach(row => knownIds.add(row.id));
                    }
                }
            } catch (e) {
                console.warn('Mevcut ID\'ler yüklenirken hata:', e);
            }
        }

        loadExistingIds();

        // Real-time channel - sadece INSERT'leri dinle
        const channelName = 'ca_' + listenerKey.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
        const filterConfig = {
            event: 'INSERT',
            schema: 'public',
            table: parsed.table,
        };

        if (parsed.filter?.session_id) {
            filterConfig.filter = `session_id=eq.${parsed.filter.session_id}`;
        }

        const channel = this.client
            .channel(channelName)
            .on('postgres_changes', filterConfig, (payload) => {
                const newRow = payload.new;
                if (newRow && !knownIds.has(newRow.id)) {
                    knownIds.add(newRow.id);
                    console.log(`🔥 Supabase child_added tetiklendi: ${parsed.table}`, newRow.id);

                    // Firebase uyumlu snapshot oluştur
                    const formattedData = service._messageRowToFirebaseFormat(newRow);
                    const snapshot = service._createChildSnapshot(newRow.id, formattedData);
                    callback(snapshot);
                }
            })
            .subscribe();

        this.channels.set(listenerKey, channel);
        this.listeners.set(listenerKey, { path, callback, eventType: 'child_added' });

        return () => {
            this.client.removeChannel(channel);
            this.channels.delete(listenerKey);
            this.listeners.delete(listenerKey);
        };
    }

    /**
     * Tüm listener'ları temizle
     */
    unsubscribeAll() {
        this.channels.forEach((channel) => {
            this.client.removeChannel(channel);
        });
        this.channels.clear();
        this.listeners.clear();
    }

    // ============ BAĞLANTI YÖNETİMİ ============

    /**
     * Bağlantı durumunu kontrol et
     */
    isConnectionActive() {
        return this.isConnected && this.client !== null;
    }

    /**
     * Bağlantı izleme (Firebase uyumluluğu)
     */
    setupConnectionMonitoring() {
        // Supabase'de otomatik olarak yönetilir
        console.log('🟢 Supabase bağlantı izleme aktif');
    }

    /**
     * Bağlantıyı kapat
     */
    disconnect() {
        this.unsubscribeAll();
        this.client = null;
        this.isConnected = false;
        console.log('Supabase disconnected');
    }

    // ============ YARDIMCI METODLAR ============

    /**
     * Gecikme fonksiyonu
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Benzersiz ID oluştur
     */
    _generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Session ID oluştur (Firebase uyumlu)
     */
    generateSessionId() {
        if (typeof uuidv4 !== 'undefined') {
            return 'session_' + uuidv4();
        }
        const timestamp = Date.now();
        const random1 = Math.random().toString(36).substring(2, 15);
        const random2 = Math.random().toString(36).substring(2, 15);
        const random3 = Math.random().toString(36).substring(2, 10);
        return 'session_' + timestamp + '_' + random1 + '_' + random2 + '_' + random3;
    }

    /**
     * Benzersiz session ID oluştur ve kontrol et
     */
    async createUniqueSessionId() {
        let sessionId;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            sessionId = this.generateSessionId();

            try {
                const { data, error } = await this.client
                    .from('sessions')
                    .select('id')
                    .eq('id', sessionId)
                    .single();

                if (error && error.code === 'PGRST116') {
                    // PGRST116 = no rows found → ID benzersiz
                    console.log('✅ Benzersiz session ID oluşturuldu:', sessionId);
                    return sessionId;
                }

                if (!data) {
                    console.log('✅ Benzersiz session ID oluşturuldu:', sessionId);
                    return sessionId;
                }

                console.warn(`⚠️ Session ID çakışması: ${sessionId}, yeniden deneniyor...`);
                attempts++;
                await this.delay(100);
            } catch (error) {
                console.warn('Session ID kontrolü sırasında hata:', error);
                return sessionId;
            }
        }

        console.warn('⚠️ Maksimum deneme sayısına ulaşıldı, son ID kullanılıyor:', sessionId);
        return sessionId;
    }

    /**
     * Hata yönetimi
     */
    handleError(error, context = 'Unknown') {
        console.error(`Supabase Service Error [${context}]:`, error);
        if (window.uiService) {
            window.uiService.showToast(`Supabase hatası: ${error.message}`, 'error');
        }
    }
}

// Singleton pattern ile export et
const supabaseService = new SupabaseService();

// Global'e ekle - Firebase uyumluluğu için HER İKİ isimle de erişilebilir
if (typeof window !== 'undefined') {
    window.supabaseService = supabaseService;
    window.firebaseService = supabaseService; // ← Firebase kodları değişmeden çalışır!
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupabaseService, supabaseService };
}
