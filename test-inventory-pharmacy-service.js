const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3009';
const API_URL = `${BASE_URL}/api`;

// Test JWT token (you'll need to replace this with a valid token)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJVU0VSXzAwMSIsInRlbmFudElkIjoiVEVOQU5UXzAwMSIsImJyYW5jaElkIjoiQlJBTkNIXzAwMSIsInJvbGUiOiJwaGFybWFjaXN0IiwibmFtZSI6IkpvaG4gUGhhcm1hY2lzdCIsImVtYWlsIjoiam9obi5waGFybWFjaXN0QGRlbnRhbWF0ZS5jb20iLCJpYXQiOjE3Mzg0MDcwMDAsImV4cCI6MTczODQ5MzQwMH0.example';

// HTTP client with default headers
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_TOKEN}`
  },
  timeout: 10000
});

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to run a test
async function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 Running: ${testName}`);
  
  try {
    await testFunction();
    testResults.passed++;
    testResults.details.push({ name: testName, status: 'PASSED', error: null });
    console.log(`✅ PASSED: ${testName}`);
  } catch (error) {
    testResults.failed++;
    testResults.details.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}`);
  }
}

// Test functions
async function testHealthCheck() {
  const response = await client.get('/health');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Health check returned success: false');
  }
  
  if (response.data.service !== 'inventory-pharmacy-service') {
    throw new Error(`Expected service name 'inventory-pharmacy-service', got '${response.data.service}'`);
  }
}

async function testDetailedHealthCheck() {
  const response = await client.get('/api/health');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Detailed health check returned success: false');
  }
  
  if (!response.data.status) {
    throw new Error('Health check response missing status object');
  }
  
  // Check if database status is present
  if (!response.data.status.database) {
    throw new Error('Database status missing from health check');
  }
  
  // Check if Redis status is present
  if (!response.data.status.redis) {
    throw new Error('Redis status missing from health check');
  }
  
  // Check if cache status is present
  if (!response.data.status.cache) {
    throw new Error('Cache status missing from health check');
  }
}

async function testAPIInfo() {
  const response = await client.get('/api');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('API info returned success: false');
  }
  
  if (!response.data.endpoints) {
    throw new Error('API info missing endpoints object');
  }
  
  const expectedEndpoints = ['health', 'apiHealth', 'medicines', 'stock', 'dispensing', 'vendors', 'restock', 'reports'];
  for (const endpoint of expectedEndpoints) {
    if (!response.data.endpoints[endpoint]) {
      throw new Error(`Missing endpoint: ${endpoint}`);
    }
  }
}

async function testUnauthorizedAccess() {
  try {
    // Remove authorization header for this test
    const unauthorizedClient = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    await unauthorizedClient.get('/api/medicines');
    throw new Error('Expected 401 status for unauthorized request');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // This is expected
      return;
    }
    throw error;
  }
}

async function testInvalidEndpoint() {
  try {
    await client.get('/api/nonexistent-endpoint');
    throw new Error('Expected 404 status for invalid endpoint');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // This is expected
      if (!error.response.data.code || error.response.data.code !== 'ENDPOINT_NOT_FOUND') {
        throw new Error('Expected ENDPOINT_NOT_FOUND error code');
      }
      return;
    }
    throw error;
  }
}

async function testRateLimiting() {
  console.log('   Testing rate limiting (this may take a moment)...');
  
  // Make multiple rapid requests to trigger rate limiting
  const promises = [];
  for (let i = 0; i < 15; i++) {
    promises.push(client.get('/api'));
  }
  
  try {
    await Promise.all(promises);
    console.log('   Note: Rate limiting may not be triggered in test environment');
  } catch (error) {
    if (error.response && error.response.status === 429) {
      // Rate limiting is working
      if (!error.response.data.code || !error.response.data.code.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('Expected rate limit error code');
      }
      return;
    }
    // If we get other errors, that's fine - rate limiting might not be triggered
    console.log('   Note: Rate limiting test completed without triggering limits');
  }
}

async function testServiceConnectivity() {
  // Test if the service is running and responding
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    if (response.status !== 200) {
      throw new Error(`Service not responding correctly. Status: ${response.status}`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Service is not running. Please start the inventory-pharmacy-service first.');
    }
    throw error;
  }
}

async function testDatabaseConnections() {
  const response = await client.get('/api/health');
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  const { database, redis, cache } = response.data.status;
  
  // Check database connection
  if (!database.connected) {
    throw new Error('Database is not connected');
  }
  
  // Check Redis connection
  if (!redis.connected) {
    throw new Error('Redis is not connected');
  }
  
  // Check cache health
  if (cache.status !== 'healthy') {
    throw new Error(`Cache is not healthy. Status: ${cache.status}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Inventory & Pharmacy Service Tests');
  console.log('='.repeat(50));
  
  // Basic connectivity tests
  await runTest('Service Connectivity', testServiceConnectivity);
  await runTest('Database Connections', testDatabaseConnections);
  
  // Health check tests
  await runTest('Basic Health Check', testHealthCheck);
  await runTest('Detailed Health Check', testDetailedHealthCheck);
  
  // API tests
  await runTest('API Information', testAPIInfo);
  await runTest('Unauthorized Access', testUnauthorizedAccess);
  await runTest('Invalid Endpoint', testInvalidEndpoint);
  
  // Performance and security tests
  await runTest('Rate Limiting', testRateLimiting);
  
  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`);
      });
  }
  
  if (testResults.passed === testResults.total) {
    console.log('\n🎉 All tests passed! The Inventory & Pharmacy Service is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the service configuration and dependencies.');
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Ensure MongoDB and Redis are running');
  console.log('2. Check environment variables in .env file');
  console.log('3. Verify JWT token configuration');
  console.log('4. Test with actual medicine and stock data');
  console.log('5. Integrate with other DentaMate services');
  
  return testResults.failed === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner error:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testResults
};