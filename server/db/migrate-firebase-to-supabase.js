/**
 * Firebase → Supabase Veri Aktarım Scripti
 * Firebase Realtime Database'deki tüm verileri Supabase PostgreSQL'e aktarır.
 * 
 * Kullanım: node migrate-firebase-to-supabase.js
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { createClient } = require('@supabase/supabase-js');

// ============ KONFİGÜRASYON ============

const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyAC06ihCO4hKOamqM7caxXGQmuGR_QF1dk',
    databaseURL: 'https://chatbotdb-be1f7-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'chatbotdb-be1f7',
};

const SUPABASE_CONFIG = {
    url: 'https://ydhlveimkpkncyizdjjy.supabase.co',
    anonKey: 'sb_publishable_v0JocEesLatJRgbkMNNNDA_7yaI1s6O',
};

// ============ MIGRATION ============

async function migrate() {
    console.log('🚀 Migration başlıyor...\n');

    // 1. Firebase'e bağlan
    console.log('📡 Firebase\'e bağlanılıyor...');
    const firebaseApp = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(firebaseApp);
    await signInAnonymously(auth);
    const db = getDatabase(firebaseApp);
    console.log('✅ Firebase bağlantısı başarılı\n');

    // 2. Supabase'e bağlan
    console.log('📡 Supabase\'e bağlanılıyor...');
    const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    console.log('✅ Supabase bağlantısı başarılı\n');

    // 3. Firebase'den verileri oku
    console.log('📖 Firebase\'den veriler okunuyor...\n');

    // Sessions
    const sessionsSnap = await get(ref(db, 'sessions'));
    const sessionsData = sessionsSnap.val() || {};
    console.log(`  📁 Sessions: ${Object.keys(sessionsData).length} adet`);

    // Pending Questions
    const pendingSnap = await get(ref(db, 'pending_questions'));
    const pendingData = pendingSnap.val() || {};
    console.log(`  📁 Pending Questions: ${Object.keys(pendingData).length} adet`);

    // Learned Responses
    const learnedSnap = await get(ref(db, 'learned_responses'));
    const learnedData = learnedSnap.val() || {};
    console.log(`  📁 Learned Responses: ${Object.keys(learnedData).length} adet`);

    // Scheduled Messages
    const scheduledSnap = await get(ref(db, 'scheduled_messages'));
    const scheduledData = scheduledSnap.val() || {};
    console.log(`  📁 Scheduled Messages: ${Object.keys(scheduledData).length} adet`);

    console.log('');

    // 4. Supabase'e aktar

    // --- Sessions ---
    console.log('💾 Sessions aktarılıyor...');
    let sessionCount = 0;
    let messageCount = 0;

    for (const [sessionId, sessionData] of Object.entries(sessionsData)) {
        const info = sessionData.info || {};
        const control = sessionData.control || {};

        // Session kaydı oluştur
        const sessionRow = {
            id: sessionId,
            custom_name: info.customName || 'isimsiz',
            phone_number: info.phoneNumber || null,
            start_time: info.startTime || null,
            last_active: info.lastActive || null,
            user_agent: info.userAgent || null,
            status: info.status || 'active',
            pinned: info.pinned || false,
            needs_attention: info.needsAttention || false,
            has_pending_question: info.hasPendingQuestion || false,
            last_read_timestamp: info.lastReadTimestamp || 0,
            last_message: info.lastMessage || null,
            control_mode: control.mode || 'auto',
        };

        const { error: sErr } = await supabase
            .from('sessions')
            .upsert(sessionRow, { onConflict: 'id' });

        if (sErr) {
            console.error(`  ❌ Session hatası (${sessionId}):`, sErr.message);
            continue;
        }
        sessionCount++;

        // Mesajları aktar
        const messages = sessionData.messages || {};
        for (const [msgId, msg] of Object.entries(messages)) {
            const messageRow = {
                id: msgId,
                session_id: sessionId,
                sender: msg.sender || 'user',
                message: msg.message || '',
                timestamp: msg.timestamp || Date.now(),
                seen: msg.seen || false,
                from_admin: msg.fromAdmin || false,
                auto_reply: msg.auto || false,
                learned: msg.learned || false,
                scheduled: msg.scheduled || false,
                reply_to: msg.replyTo || null,
            };

            const { error: mErr } = await supabase
                .from('messages')
                .upsert(messageRow, { onConflict: 'id' });

            if (mErr) {
                console.error(`  ❌ Mesaj hatası (${msgId}):`, mErr.message);
            } else {
                messageCount++;
            }
        }
    }
    console.log(`  ✅ ${sessionCount} session, ${messageCount} mesaj aktarıldı\n`);

    // --- Pending Questions ---
    console.log('💾 Pending Questions aktarılıyor...');
    let pendingCount = 0;
    for (const [id, data] of Object.entries(pendingData)) {
        const row = {
            id: id,
            session_id: data.sessionId || null,
            question: data.question || '',
            conversation_history: data.conversationHistory || null,
            timestamp: data.timestamp || Date.now(),
            status: data.status || 'pending',
        };

        const { error } = await supabase
            .from('pending_questions')
            .upsert(row, { onConflict: 'id' });

        if (error) {
            console.error(`  ❌ Pending hatası (${id}):`, error.message);
        } else {
            pendingCount++;
        }
    }
    console.log(`  ✅ ${pendingCount} pending question aktarıldı\n`);

    // --- Learned Responses ---
    console.log('💾 Learned Responses aktarılıyor...');
    let learnedCount = 0;
    for (const [id, data] of Object.entries(learnedData)) {
        const row = {
            id: id,
            question: data.question || '',
            response: data.response || '',
            context_tags: data.contextTags || null,
            timestamp: data.timestamp || null,
        };

        const { error } = await supabase
            .from('learned_responses')
            .upsert(row, { onConflict: 'id' });

        if (error) {
            console.error(`  ❌ Learned hatası (${id}):`, error.message);
        } else {
            learnedCount++;
        }
    }
    console.log(`  ✅ ${learnedCount} learned response aktarıldı\n`);

    // --- Scheduled Messages ---
    console.log('💾 Scheduled Messages aktarılıyor...');
    let scheduledCount = 0;
    for (const [id, data] of Object.entries(scheduledData)) {
        const row = {
            id: id,
            start_time: data.startTime || '09:00',
            end_time: data.endTime || '18:00',
            message: data.message || '',
            enabled: data.enabled !== undefined ? data.enabled : true,
        };

        const { error } = await supabase
            .from('scheduled_messages')
            .upsert(row, { onConflict: 'id' });

        if (error) {
            console.error(`  ❌ Scheduled hatası (${id}):`, error.message);
        } else {
            scheduledCount++;
        }
    }
    console.log(`  ✅ ${scheduledCount} scheduled message aktarıldı\n`);

    // 5. Özet
    console.log('═══════════════════════════════════════');
    console.log('  ✅ MIGRATION TAMAMLANDI!');
    console.log('═══════════════════════════════════════');
    console.log(`  Sessions:           ${sessionCount}`);
    console.log(`  Messages:           ${messageCount}`);
    console.log(`  Pending Questions:  ${pendingCount}`);
    console.log(`  Learned Responses:  ${learnedCount}`);
    console.log(`  Scheduled Messages: ${scheduledCount}`);
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration hatası:', err);
    process.exit(1);
});
