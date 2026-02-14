/**
 * Supabase Konfigürasyon Dosyası
 * Tüm Supabase bağlantıları için merkezi konfigürasyon
 */

const SUPABASE_CONFIG = {
    // Supabase Proje URL'si
    url: 'https://ydhlveimkpkncyizdjjy.supabase.co',

    // Supabase Anon/Public Key
    anonKey: 'sb_publishable_v0JocEesLatJRgbkMNNNDA_7yaI1s6O',

    // Varsayılan ayarlar
    settings: {
        autoConnect: true,
        retryAttempts: 3,
        retryDelay: 1000,
        timeout: 10000
    }
};

// Mevcut ortamı tespit et
const getCurrentEnvironment = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    }
    return 'production';
};

// Aktif konfigürasyonu al
const getActiveConfig = () => {
    const env = getCurrentEnvironment();
    return {
        ...SUPABASE_CONFIG,
        currentEnvironment: env
    };
};

// Export et
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_CONFIG, getActiveConfig, getCurrentEnvironment };
} else {
    window.SupabaseConfig = { SUPABASE_CONFIG, getActiveConfig, getCurrentEnvironment };
}
