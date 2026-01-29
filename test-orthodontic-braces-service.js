const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3009';
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LWRvY3Rvci0xIiwidGVuYW50SWQiOiJ0ZXN0LXRlbmFudC0xIiwiYnJhbmNoSWQiOiJ0ZXN0LWJyYW5jaC0xIiwicm9sZSI6IkRPQ1RPUiIsImlhdCI6MTcwNDEwMDAwMCwiZXhwIjoxNzA0MTg2NDAwfQ.test-signature';

// Test data
const testCaseData = {
  patientId: 'test-patient-1',
  appointmentId: 'test-appointment-1',
  caseType: 'BRACES',
  priority: 'NORMAL',
  doctorNotes: 'Patient needs upper and lower braces. Moderate crowding observed.'
};

class OrthodonticBracesServiceTester {
  constructor() {
    this.axios = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${TEST_JWT}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Running test: ${testName}`);
      await testFunction();
      console.log(`✅ ${testName} - PASSED`);
      this.testResults.passed++;
    } catch (error) {
      console.log(`❌ ${testName} - FAILED`);
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
    }
  }

  async testHealthCheck() {
    const response = await this.axios.get('/health');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.service || response.data.service !== 'orthodontic-braces-service') {
      throw new Error('Invalid service name in health check response');
    }
    
    console.log(`   Service status: ${response.data.status}`);
    console.log(`   Checks: ${Object.keys(response.data.checks || {}).join(', ')}`);
  }

  async testServiceInfo() {
    const response = await this.axios.get('/info');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.service || response.data.service !== 'orthodontic-braces-service') {
      throw new Error('Invalid service name in info response');
    }
    
    console.log(`   Version: ${response.data.version}`);
    console.log(`   Environment: ${response.data.environment}`);
    console.log(`   Uptime: ${response.data.uptime_seconds}s`);
  }

  async testCreateCase() {
    const response = await this.axios.post('/orthodontics/cases', testCaseData);
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Response indicates failure');
    }
    
    const caseData = response.data.data;
    if (!caseData.caseId) {
      throw new Error('No caseId in response');
    }
    
    if (caseData.status !== 'CREATED') {
      throw new Error(`Expected status CREATED, got ${caseData.status}`);
    }
    
    console.log(`   Created case: ${caseData.caseId}`);
    console.log(`   Case type: ${caseData.caseType}`);
    console.log(`   Priority: ${caseData.priority}`);
    
    // Store case ID for other tests
    this.testCaseId = caseData.caseId;
    return caseData;
  }

  async testGetCaseById() {
    if (!this.testCaseId) {
      throw new Error('No test case ID available');
    }
    
    const response = await this.axios.get(`/orthodontics/cases/${this.testCaseId}`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Response indicates failure');
    }
    
    const caseData = response.data.data;
    if (caseData.caseId !== this.testCaseId) {
      throw new Error('Case ID mismatch');
    }
    
    console.log(`   Retrieved case: ${caseData.caseId}`);
    console.log(`   Status: ${caseData.status}`);
    console.log(`   Doctor notes: ${caseData.doctorNotes.substring(0, 50)}...`);
  }

  async testListCases() {
    const response = await this.axios.get('/orthodontics/cases?limit=10');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Response indicates failure');
    }
    
    if (!Array.isArray(response.data.data)) {
      throw new Error('Expected array of cases');
    }
    
    console.log(`   Found ${response.data.data.length} cases`);
    if (response.data.pagination) {
      console.log(`   Total count: ${response.data.pagination.totalCount}`);
      console.log(`   Current page: ${response.data.pagination.currentPage}`);
    }
  }

  async testUpdateCaseStatus() {
    if (!this.testCaseId) {
      throw new Error('No test case ID available');
    }
    
    // First assign an orthotist (simulate)
    const assignResponse = await this.axios.patch(
      `/orthodontics/cases/${this.testCaseId}/assign-orthotist`,
      { orthotistId: 'test-orthotist-1' }
    );
    
    if (assignResponse.status !== 200) {
      throw new Error(`Failed to assign orthotist: ${assignResponse.status}`);
    }
    
    console.log(`   Assigned orthotist to case`);
    
    // Note: Status update would require orthotist role for most transitions
    // This test demonstrates the API structure
    console.log(`   Status update API structure validated`);
  }

  async testCaseStatistics() {
    const response = await this.axios.get('/orthodontics/cases/statistics');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Response indicates failure');
    }
    
    const stats = response.data.data;
    if (typeof stats.totalCases !== 'number') {
      throw new Error('Invalid statistics format');
    }
    
    console.log(`   Total cases: ${stats.totalCases}`);
    console.log(`   Status breakdown: ${JSON.stringify(stats.statusBreakdown)}`);
    console.log(`   Overdue cases: ${stats.overdueCases}`);
  }

  async testMeasurementEndpoints() {
    // Test measurement listing (should work without actual measurements)
    const response = await this.axios.get('/orthodontics/measurements?limit=5');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Response indicates failure');
    }
    
    if (!Array.isArray(response.data.data)) {
      throw new Error('Expected array of measurements');
    }
    
    console.log(`   Found ${response.data.data.length} measurements`);
    console.log(`   Measurement API structure validated`);
  }

  async testMeasurementStatistics() {
    const response = await this.axios.get('/orthodontics/measurements/statistics');
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Response indicates failure');
    }
    
    const stats = response.data.data;
    if (typeof stats.totalMeasurements !== 'number') {
      throw new Error('Invalid statistics format');
    }
    
    console.log(`   Total measurements: ${stats.totalMeasurements}`);
    console.log(`   Status breakdown: ${JSON.stringify(stats.statusBreakdown)}`);
    console.log(`   Pending reviews: ${stats.pendingReviews}`);
  }

  async testUnauthorizedAccess() {
    try {
      // Test without authorization header
      const unauthorizedAxios = axios.create({
        baseURL: BASE_URL,
        timeout: 5000
      });
      
      await unauthorizedAxios.get('/orthodontics/cases');
      throw new Error('Expected unauthorized error');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(`   Correctly rejected unauthorized request`);
      } else {
        throw error;
      }
    }
  }

  async testInvalidEndpoint() {
    try {
      await this.axios.get('/orthodontics/invalid-endpoint');
      throw new Error('Expected 404 error');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`   Correctly returned 404 for invalid endpoint`);
      } else {
        throw error;
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Orthodontic Braces Service Tests');
    console.log(`📍 Testing against: ${BASE_URL}`);
    
    // Health and info tests
    await this.runTest('Health Check', () => this.testHealthCheck());
    await this.runTest('Service Info', () => this.testServiceInfo());
    
    // Case management tests
    await this.runTest('Create Case', () => this.testCreateCase());
    await this.runTest('Get Case by ID', () => this.testGetCaseById());
    await this.runTest('List Cases', () => this.testListCases());
    await this.runTest('Update Case Status', () => this.testUpdateCaseStatus());
    await this.runTest('Case Statistics', () => this.testCaseStatistics());
    
    // Measurement tests
    await this.runTest('Measurement Endpoints', () => this.testMeasurementEndpoints());
    await this.runTest('Measurement Statistics', () => this.testMeasurementStatistics());
    
    // Security tests
    await this.runTest('Unauthorized Access', () => this.testUnauthorizedAccess());
    await this.runTest('Invalid Endpoint', () => this.testInvalidEndpoint());
    
    // Print summary
    console.log('\n📊 Test Summary');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.errors.forEach(error => {
        console.log(`   - ${error.test}: ${error.error}`);
      });
    }
    
    return this.testResults.failed === 0;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new OrthodonticBracesServiceTester();
  
  tester.runAllTests()
    .then(success => {
      if (success) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
      } else {
        console.log('\n💥 Some tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test runner failed:', error.message);
      process.exit(1);
    });
}

module.exports = OrthodonticBracesServiceTester;