/**
 * Firebase Service Test Suite
 */

// Test framework'i
class TestSuite {
  constructor() {
    this.tests = [];
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('🧪 Firebase Service Test Suite Başlatılıyor...');
    
    for (const test of this.tests) {
      try {
        const result = await test.testFn();
        this.results.push({
          name: test.name,
          status: 'passed',
          result,
          error: null
        });
        this.passed++;
        console.log(`✅ ${test.name}: PASSED`);
      } catch (error) {
        this.results.push({
          name: test.name,
          status: 'failed',
          result: null,
          error: error.message
        });
        this.failed++;
        console.log(`❌ ${test.name}: FAILED - ${error.message}`);
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Özeti:');
    console.log(`Toplam: ${this.tests.length}`);
    console.log(`Başarılı: ${this.passed}`);
    console.log(`Başarısız: ${this.failed}`);
    console.log(`Başarı Oranı: ${((this.passed / this.tests.length) * 100).toFixed(2)}%`);
    
    if (this.failed === 0) {
      console.log('🎉 Tüm testler başarılı!');
    } else {
      console.log('⚠️ Bazı testler başarısız oldu.');
    }
  }
}

// Test suite oluştur
const testSuite = new TestSuite();

// Mock Firebase SDK
const mockFirebase = {
  apps: [],
  initialize: (config) => {
    console.log('Mock Firebase initialized with config:', config);
    return Promise.resolve();
  },
  database: () => ({
    ref: (path) => ({
      set: (data) => Promise.resolve(),
      update: (data) => Promise.resolve(),
      remove: () => Promise.resolve(),
      on: (eventType, callback) => {
        // Mock listener
        setTimeout(() => {
          callback({ val: () => ({}) });
        }, 100);
        return () => {};
      },
      once: (eventType) => Promise.resolve({ val: () => ({}) }),
      child: (path) => mockFirebase.database().ref(path)
    })
  })
};

// Firebase'i mockla
window.firebase = mockFirebase;

// Testleri tanımla
testSuite.test('Firebase Service - Constructor', () => {
  const service = new FirebaseService();
  
  if (typeof service.db !== 'object') {
    throw new Error('db property should be initialized as object');
  }
  
  if (typeof service.isConnected !== 'boolean') {
    throw new Error('isConnected property should be boolean');
  }
  
  if (service.isConnected !== false) {
    throw new Error('isConnected should be false initially');
  }
  
  return { service: 'initialized correctly' };
});

testSuite.test('Firebase Service - Connect Success', async () => {
  const service = new FirebaseService();
  
  const db = await service.connect({
    databaseURL: 'https://test.firebaseio.com'
  });
  
  if (!db) {
    throw new Error('connect should return database reference');
  }
  
  if (!service.isConnected) {
    throw new Error('isConnected should be true after successful connection');
  }
  
  return { connected: true, db: 'database reference' };
});

testSuite.test('Firebase Service - Connect with Invalid Config', async () => {
  const service = new FirebaseService();
  
  try {
    await service.connect({
      databaseURL: 'invalid-url'
    });
    throw new Error('Should have thrown an error');
  } catch (error) {
    if (!error.message.includes('connection failed')) {
      throw new Error('Should have failed with connection error');
    }
  }
  
  return { error: 'handled correctly' };
});

testSuite.test('Firebase Service - Read Data', async () => {
  const service = new FirebaseService();
  await service.connect();
  
  const data = await service.read('test/path');
  
  if (data === null || data === undefined) {
    throw new Error('read should return data');
  }
  
  return { data: 'read successfully' };
});

testSuite.test('Firebase Service - Write Data', async () => {
  const service = new FirebaseService();
  await service.connect();
  
  await service.write('test/path', { test: 'data' });
  
  return { write: 'successful' };
});

testSuite.test('Firebase Service - Update Data', async () => {
  const service = new FirebaseService();
  await service.connect();
  
  await service.update('test/path', { test: 'updated' });
  
  return { update: 'successful' };
});

testSuite.test('Firebase Service - Remove Data', async () => {
  const service = new FirebaseService();
  await service.connect();
  
  await service.remove('test/path');
  
  return { remove: 'successful' };
});

testSuite.test('Firebase Service - Subscribe to Events', async () => {
  const service = new FirebaseService();
  await service.connect();
  
  let callbackCalled = false;
  
  const unsubscribe = service.subscribe('test/path', (snapshot) => {
    callbackCalled = true;
  });
  
  if (typeof unsubscribe !== 'function') {
    throw new Error('subscribe should return unsubscribe function');
  }
  
  // Callback'in çağrıldığını kontrol et
  setTimeout(() => {
    if (!callbackCalled) {
      throw new Error('Callback should have been called');
    }
  }, 200);
  
  return { subscribe: 'successful' };
});

testSuite.test('Firebase Service - Get Database', () => {
  const service = new FirebaseService();
  
  try {
    service.getDatabase();
    throw new Error('Should throw error when not connected');
  } catch (error) {
    if (!error.message.includes('Firebase not connected')) {
      throw new Error('Should throw specific error message');
    }
  }
  
  return { error: 'handled correctly' };
});

testSuite.test('Firebase Service - Retry Mechanism', async () => {
  const service = new FirebaseService();
  service.maxRetries = 2;
  
  let connectAttempts = 0;
  
  // Mock connect method to count attempts
  const originalConnect = service.connect;
  service.connect = async (config) => {
    connectAttempts++;
    if (connectAttempts < 2) {
      throw new Error('Connection failed');
    }
    return originalConnect.call(service, config);
  };
  
  await service.connect();
  
  if (connectAttempts !== 2) {
    throw new Error('Should have retried 2 times');
  }
  
  return { retries: connectAttempts };
});

testSuite.test('Firebase Service - Error Handling', async () => {
  const service = new FirebaseService();
  
  const errors = [];
  
  // Override console.error to capture errors
  const originalConsoleError = console.error;
  console.error = (message, error) => {
    errors.push({ message, error });
  };
  
  try {
    await service.read('nonexistent/path');
  } catch (error) {
    // Expected error
  }
  
  console.error = originalConsoleError;
  
  return { errors: errors.length };
});

testSuite.test('Firebase Service - Cleanup', async () => {
  const service = new FirebaseService();
  await service.connect();
  
  // Add some listeners
  const unsubscribe1 = service.subscribe('test/path1', () => {});
  const unsubscribe2 = service.subscribe('test/path2', () => {});
  
  // Check listeners count
  if (service.listeners.size !== 2) {
    throw new Error('Should have 2 listeners');
  }
  
  // Disconnect
  service.disconnect();
  
  if (service.isConnected) {
    throw new Error('isConnected should be false after disconnect');
  }
  
  if (service.listeners.size !== 0) {
    throw new Error('All listeners should be cleared after disconnect');
  }
  
  return { cleanup: 'successful' };
});

testSuite.test('Firebase Service - Delay Function', async () => {
  const service = new FirebaseService();
  
  const startTime = Date.now();
  await service.delay(100);
  const endTime = Date.now();
  
  const elapsed = endTime - startTime;
  
  if (elapsed < 100 || elapsed > 150) {
    throw new Error(`Delay should be approximately 100ms, was ${elapsed}ms`);
  }
  
  return { delay: elapsed };
});

// Testleri çalıştır
if (typeof window !== 'undefined') {
  // Browser ortamında
  window.runFirebaseTests = () => testSuite.run();
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js ortamında
  module.exports = { testSuite, runTests: () => testSuite.run() };
}