const axios = require('axios');

// Test configuration
const AUDIT_SERVICE_URL = 'http://localhost:3015';
const API_BASE = `${AUDIT_SERVICE_URL}/api/v1/audit`;

// Mock JWT tokens for testing
const SERVICE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoic2VydmljZSIsInNlcnZpY2VJZCI6InRlc3Qtc2VydmljZSIsInNlcnZpY2VOYW1lIjoidGVzdC1zZXJ2aWNlIiwiaWF0IjoxNzA1MzE3NjAwfQ.test';
const USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoiQ0VOVFJBTF9BRE1JTiIsInRlbmFudElkIjoidGVzdC10ZW5hbnQiLCJicmFuY2hJZCI6InRlc3QtYnJhbmNoIiwiaWF0IjoxNzA1MzE3NjAwfQ.test';

class AuditServiceTester {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  async runTest(testName, testFunction) {
    this.totalTests++;
    console.log(`\n🧪 Running: ${testName}`);
    
    try {
      await testFunction();
      this.passedTests++;
      console.log(`✅ PASSED: ${testName}`);
      this.testResults.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${testName}`);
      console.log(`   Error: ${error.message}`);
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  async testHealthCheck() {
    const response = await axios.get(`${AUDIT_SERVICE_URL}/health`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Health check returned success: false');
    }
    
    console.log('   Health check response:', JSON.stringify(response.data, null, 2));
  }

  async testCreateAuditEvent() {
    const eventData = {
      actorId: 'test-user-123',
      actorRole: 'DOCTOR',
      action: 'CREATE',
      resource: {
        type: 'MEDICAL_RECORD',
        id: 'record-456'
      },
      tenantId: 'test-tenant-789',
      branchId: 'test-branch-101',
      sourceService: 'clinical-service',
      category: 'CLINICAL',
      severity: 'MEDIUM',
      metadata: {
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent',
        sessionId: 'test-session-123',
        reason: 'Test audit event creation'
      }
    };

    const response = await axios.post(`${API_BASE}/events`, eventData, {
      headers: {
        'x-service-token': SERVICE_TOKEN,
        'x-service-id': 'test-service',
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }

    if (!response.data.success || !response.data.eventId) {
      throw new Error('Event creation failed or missing eventId');
    }

    console.log('   Created event ID:', response.data.eventId);
    return response.data.eventId;
  }

  async testCreateBatchAuditEvents() {
    const batchData = {
      events: [
        {
          actorId: 'test-user-123',
          actorRole: 'BILLING_OFFICER',
          action: 'CREATE',
          resource: {
            type: 'INVOICE',
            id: 'invoice-001'
          },
          tenantId: 'test-tenant-789',
          sourceService: 'billing-payment-service',
          category: 'FINANCIAL',
          severity: 'MEDIUM'
        },
        {
          actorId: 'test-user-456',
          actorRole: 'PHARMACIST',
          action: 'UPDATE',
          resource: {
            type: 'INVENTORY_ITEM',
            id: 'med-789'
          },
          tenantId: 'test-tenant-789',
          sourceService: 'inventory-pharmacy-service',
          category: 'SYSTEM',
          severity: 'LOW'
        }
      ]
    };

    const response = await axios.post(`${API_BASE}/events/batch`, batchData, {
      headers: {
        'x-service-token': SERVICE_TOKEN,
        'x-service-id': 'test-service',
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }

    if (!response.data.success || response.data.eventsCreated !== 2) {
      throw new Error('Batch event creation failed');
    }

    console.log('   Created events count:', response.data.eventsCreated);
    console.log('   Event IDs:', response.data.eventIds);
  }

  async testQueryAuditEvents() {
    // Wait a moment for events to be indexed
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await axios.get(`${API_BASE}/events?category=CLINICAL&limit=10`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Query failed');
    }

    console.log('   Found events:', response.data.data.events.length);
    console.log('   Pagination:', response.data.data.pagination);
  }

  async testGetAuditSummary() {
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
    const endDate = new Date().toISOString();

    const response = await axios.get(
      `${API_BASE}/summary?periodType=DAILY&startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${USER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Summary query failed');
    }

    console.log('   Summary data:', JSON.stringify(response.data.data, null, 2));
  }

  async testGetAuditStatistics() {
    const response = await axios.get(`${API_BASE}/statistics?days=7`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Statistics query failed');
    }

    console.log('   Statistics:', JSON.stringify(response.data.data, null, 2));
  }

  async testIntegrityCheck() {
    const response = await axios.get(`${API_BASE}/integrity?limit=100`, {
      headers: {
        'Authorization': `Bearer ${USER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.success) {
      throw new Error('Integrity check failed');
    }

    console.log('   Integrity check result:', response.data.data);
  }

  async testValidationErrors() {
    try {
      await axios.post(`${API_BASE}/events`, {
        // Missing required fields
        actorId: '',
        action: 'INVALID_ACTION'
      }, {
        headers: {
          'x-service-token': SERVICE_TOKEN,
          'x-service-id': 'test-service',
          'Content-Type': 'application/json'
        }
      });
      
      throw new Error('Should have failed validation');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('   Validation error correctly caught:', error.response.data.code);
      } else {
        throw error;
      }
    }
  }

  async testUnauthorizedAccess() {
    try {
      await axios.get(`${API_BASE}/events`, {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        }
      });
      
      throw new Error('Should have failed authentication');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('   Unauthorized access correctly blocked:', error.response.data.code);
      } else {
        throw error;
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Audit Logging Service Tests...\n');
    console.log(`Testing against: ${AUDIT_SERVICE_URL}`);

    // Basic functionality tests
    await this.runTest('Health Check', () => this.testHealthCheck());
    await this.runTest('Create Audit Event', () => this.testCreateAuditEvent());
    await this.runTest('Create Batch Audit Events', () => this.testCreateBatchAuditEvents());
    await this.runTest('Query Audit Events', () => this.testQueryAuditEvents());
    await this.runTest('Get Audit Summary', () => this.testGetAuditSummary());
    await this.runTest('Get Audit Statistics', () => this.testGetAuditStatistics());
    await this.runTest('Integrity Check', () => this.testIntegrityCheck());

    // Error handling tests
    await this.runTest('Validation Errors', () => this.testValidationErrors());
    await this.runTest('Unauthorized Access', () => this.testUnauthorizedAccess());

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests}`);
    console.log(`Failed: ${this.totalTests - this.passedTests}`);
    console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);

    if (this.passedTests === this.totalTests) {
      console.log('\n🎉 All tests passed! Audit Logging Service is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the service configuration.');
      
      console.log('\nFailed Tests:');
      this.testResults
        .filter(result => result.status === 'FAILED')
        .forEach(result => {
          console.log(`  ❌ ${result.name}: ${result.error}`);
        });
    }

    console.log('\n📋 Service Information:');
    console.log(`  • Service URL: ${AUDIT_SERVICE_URL}`);
    console.log(`  • API Base: ${API_BASE}`);
    console.log(`  • Test completed at: ${new Date().toISOString()}`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new AuditServiceTester();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = AuditServiceTester;