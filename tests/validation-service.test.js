/**
 * Validation Service Test Suite
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
    console.log('🧪 Validation Service Test Suite Başlatılıyor...');
    
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

// Testleri tanımla
testSuite.test('Validation Service - Constructor', () => {
  const service = new ValidationService();
  
  if (typeof service.rules !== 'object') {
    throw new Error('rules property should be object');
  }
  
  if (typeof service.errorMessages !== 'object') {
    throw new Error('errorMessages property should be object');
  }
  
  if (!Array.isArray(service.sanitizePatterns)) {
    throw new Error('sanitizePatterns should be array');
  }
  
  return { service: 'initialized correctly' };
});

testSuite.test('Validation Service - Sanitize Input - Basic', () => {
  const service = new ValidationService();
  
  const testCases = [
    {
      input: '<script>alert("xss")</script>',
      expected: 'alert("xss")',
      description: 'Script tags should be removed'
    },
    {
      input: 'Hello <b>World</b>',
      expected: 'Hello World',
      description: 'HTML tags should be removed'
    },
    {
      input: '  Hello   World  ',
      expected: 'Hello World',
      description: 'Extra whitespace should be trimmed'
    },
    {
      input: 'A'.repeat(1500),
      expected: 'A'.repeat(1000),
      description: 'Should respect maxLength'
    }
  ];
  
  for (const testCase of testCases) {
    const result = service.sanitizeInput(testCase.input);
    if (result !== testCase.expected) {
      throw new Error(`${testCase.description}: expected "${testCase.expected}", got "${result}"`);
    }
  }
  
  return { sanitizeInput: 'working correctly' };
});

testSuite.test('Validation Service - Sanitize Input - Options', () => {
  const service = new ValidationService();
  
  // Test with preserveCase: false
  const result1 = service.sanitizeInput('Hello World', { preserveCase: false });
  if (result1 !== 'hello world') {
    throw new Error('Should convert to lowercase when preserveCase is false');
  }
  
  // Test with allowLineBreaks: true
  const result2 = service.sanitizeInput('Hello\nWorld', { allowLineBreaks: true });
  if (result2 !== 'Hello\nWorld') {
    throw new Error('Should preserve line breaks when allowLineBreaks is true');
  }
  
  // Test with allowLineBreaks: false
  const result3 = service.sanitizeInput('Hello\nWorld', { allowLineBreaks: false });
  if (result3 !== 'Hello World') {
    throw new Error('Should remove line breaks when allowLineBreaks is false');
  }
  
  return { sanitizeInputOptions: 'working correctly' };
});

testSuite.test('Validation Service - Validate Field - Required', () => {
  const service = new ValidationService();
  
  const result1 = service.validateField('test', '', ['required']);
  if (result1.isValid !== false) {
    throw new Error('Empty value should fail required validation');
  }
  
  const result2 = service.validateField('test', null, ['required']);
  if (result2.isValid !== false) {
    throw new Error('Null value should fail required validation');
  }
  
  const result3 = service.validateField('test', '   ', ['required']);
  if (result3.isValid !== false) {
    throw new Error('Whitespace-only value should fail required validation');
  }
  
  const result4 = service.validateField('test', 'valid value', ['required']);
  if (result4.isValid !== true) {
    throw new Error('Non-empty value should pass required validation');
  }
  
  return { requiredValidation: 'working correctly' };
});

testSuite.test('Validation Service - Validate Field - Length', () => {
  const service = new ValidationService();
  
  const result1 = service.validateField('test', 'ab', ['minLength'], { min: 3 });
  if (result1.isValid !== false) {
    throw new Error('Value shorter than min should fail minLength validation');
  }
  
  const result2 = service.validateField('test', 'abcde', ['maxLength'], { max: 4 });
  if (result2.isValid !== false) {
    throw new Error('Value longer than max should fail maxLength validation');
  }
  
  const result3 = service.validateField('test', 'abc', ['minLength', 'maxLength'], { min: 2, max: 5 });
  if (result3.isValid !== true) {
    throw new Error('Value within range should pass length validation');
  }
  
  return { lengthValidation: 'working correctly' };
});

testSuite.test('Validation Service - Validate Field - Email', () => {
  const service = new ValidationService();
  
  const validEmails = [
    'test@example.com',
    'user.name@domain.co.uk',
    'user+tag@example.org'
  ];
  
  const invalidEmails = [
    'invalid-email',
    '@example.com',
    'test@',
    'test.example.com'
  ];
  
  for (const email of validEmails) {
    const result = service.validateField('email', email, ['email']);
    if (result.isValid !== true) {
      throw new Error(`Valid email "${email}" should pass validation`);
    }
  }
  
  for (const email of invalidEmails) {
    const result = service.validateField('email', email, ['email']);
    if (result.isValid !== false) {
      throw new Error(`Invalid email "${email}" should fail validation`);
    }
  }
  
  return { emailValidation: 'working correctly' };
});

testSuite.test('Validation Service - Validate Field - Phone', () => {
  const service = new ValidationService();
  
  const validPhones = [
    '05551234567',
    '+905551234567',
    '0212345678'
  ];
  
  const invalidPhones = [
    '123',
    'abc123',
    '1234567890123456'
  ];
  
  for (const phone of validPhones) {
    const result = service.validateField('phone', phone, ['phone']);
    if (result.isValid !== true) {
      throw new Error(`Valid phone "${phone}" should pass validation`);
    }
  }
  
  for (const phone of invalidPhones) {
    const result = service.validateField('phone', phone, ['phone']);
    if (result.isValid !== false) {
      throw new Error(`Invalid phone "${phone}" should fail validation`);
    }
  }
  
  return { phoneValidation: 'working correctly' };
});

testSuite.test('Validation Service - Validate Field - Custom Rules', () => {
  const service = new ValidationService();
  
  // Custom rule ekle
  service.addRule('customRule', (value) => {
    return value === 'custom';
  }, 'Custom validation failed');
  
  const result1 = service.validateField('test', 'custom', ['customRule']);
  if (result1.isValid !== true) {
    throw new Error('Valid value should pass custom rule');
  }
  
  const result2 = service.validateField('test', 'invalid', ['customRule']);
  if (result2.isValid !== false) {
    throw new Error('Invalid value should fail custom rule');
  }
  
  return { customRules: 'working correctly' };
});

testSuite.test('Validation Service - Validate Message', () => {
  const service = new ValidationService();
  
  const validMessages = [
    'Hello',
    'This is a valid message',
    'A'.repeat(100) // Within limit
  ];
  
  const invalidMessages = [
    '', // Empty
    'A'.repeat(1001), // Too long
    '<script>alert("xss")</script>' // Contains script
  ];
  
  for (const message of validMessages) {
    const result = service.validateMessage(message);
    if (result.isValid !== true) {
      throw new Error(`Valid message should pass validation: ${message.substring(0, 20)}...`);
    }
  }
  
  for (const message of invalidMessages) {
    const result = service.validateMessage(message);
    if (result.isValid !== false) {
      throw new Error(`Invalid message should fail validation: ${message.substring(0, 20)}...`);
    }
  }
  
  return { messageValidation: 'working correctly' };
});

testSuite.test('Validation Service - Validate Message - Spam Check', () => {
  const service = new ValidationService();
  
  const spamMessages = [
    'CLICK HERE FOR FREE MONEY!!!',
    'WIN PRIZE NOW!!!',
    'https://spam.com',
    'BUY NOW LIMITED OFFER'
  ];
  
  const nonSpamMessages = [
    'Hello, how are you?',
    'Can you help me with something?',
    'Thank you for your help'
  ];
  
  for (const message of spamMessages) {
    const result = service.validateMessage(message, { checkSpam: true });
    if (result.isValid !== false) {
      throw new Error(`Spam message should fail validation: ${message}`);
    }
  }
  
  for (const message of nonSpamMessages) {
    const result = service.validateMessage(message, { checkSpam: true });
    if (result.isValid !== true) {
      throw new Error(`Non-spam message should pass validation: ${message}`);
    }
  }
  
  return { spamCheck: 'working correctly' };
});

testSuite.test('Validation Service - Validate File', () => {
  const service = new ValidationService();
  
  // Valid file
  const validFile = new File(['test'], 'test.txt', { type: 'text/plain' });
  const validResult = service.validateFile(validFile);
  
  if (validResult.isValid !== true) {
    throw new Error('Valid file should pass validation');
  }
  
  // Invalid file (too large)
  const largeFile = new File(['A'.repeat(6 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
  const largeResult = service.validateFile(largeFile);
  
  if (largeResult.isValid !== false) {
    throw new Error('Large file should fail validation');
  }
  
  // Invalid file (wrong type)
  const invalidTypeFile = new File(['test'], 'test.exe', { type: 'application/octet-stream' });
  const invalidTypeResult = service.validateFile(invalidTypeFile);
  
  if (invalidTypeResult.isValid !== false) {
    throw new Error('Invalid file type should fail validation');
  }
  
  return { fileValidation: 'working correctly' };
});

testSuite.test('Validation Service - Validate Form', () => {
  const service = new ValidationService();
  
  const formData = {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello, this is a test message',
    age: '25'
  };
  
  const schema = {
    name: ['required', 'minLength'],
    email: ['required', 'email'],
    message: ['required', 'maxLength'],
    age: ['required', 'number']
  };
  
  const result = service.validateForm(formData, schema);
  
  if (!result.isValid) {
    throw new Error('Valid form data should pass validation');
  }
  
  if (result.errors.length > 0) {
    throw new Error('Valid form should not have errors');
  }
  
  // Test with invalid data
  const invalidFormData = {
    name: '',
    email: 'invalid-email',
    message: '',
    age: 'not-a-number'
  };
  
  const invalidResult = service.validateForm(invalidFormData, schema);
  
  if (invalidResult.isValid) {
    throw new Error('Invalid form data should fail validation');
  }
  
  if (invalidResult.errors.length === 0) {
    throw new Error('Invalid form should have errors');
  }
  
  return { formValidation: 'working correctly' };
});

testSuite.test('Validation Service - Error Messages', () => {
  const service = new ValidationService();
  
  const result = service.validateField('test', '', ['required']);
  
  if (result.errors.length === 0) {
    throw new Error('Should have error messages');
  }
  
  const hasRequiredError = result.errors.some(error => error.rule === 'required');
  if (!hasRequiredError) {
    throw new Error('Should have required error message');
  }
  
  return { errorMessages: 'working correctly' };
});

testSuite.test('Validation Service - Turkish Text Validation', () => {
  const service = new ValidationService();
  
  const validTurkishText = 'Merhaba dünya, nasılsınız?';
  const invalidTurkishText = 'Hello <script>alert("xss")</script> world';
  
  const validResult = service.validateField('turkish', validTurkishText, ['turkishText']);
  if (validResult.isValid !== true) {
    throw new Error('Valid Turkish text should pass validation');
  }
  
  const invalidResult = service.validateField('turkish', invalidTurkishText, ['turkishText']);
  if (invalidResult.isValid !== false) {
    throw new Error('Invalid Turkish text should fail validation');
  }
  
  return { turkishTextValidation: 'working correctly' };
});

// Testleri çalıştır
if (typeof window !== 'undefined') {
  // Browser ortamında
  window.runValidationTests = () => testSuite.run();
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js ortamında
  module.exports = { testSuite, runTests: () => testSuite.run() };
}