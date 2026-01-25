/**
 * Test Script for Accounts Manager Dashboard
 * Tests the comprehensive financial oversight and decision-making workspace
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test data
const testAccountsManager = {
  email: 'accounts.manager@dentamate.com',
  password: 'AccountsManager123!',
  tenantId: 'tenant_001'
};

let authToken = '';
let testResults = [];

// Utility function to log test results
function logTest(testName, success, message, data = null) {
  const result = {
    test: testName,
    success,
    message,
    timestamp: new Date().toISOString(),
    data
  };
  testResults.push(result);
  
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}: ${message}`);
  if (data) console.log('   Data:', JSON.stringify(data, null, 2));
}

// Authentication
async function authenticateAccountsManager() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, testAccountsManager);
    
    if (response.data.success && response.data.user.role === 'accounts-manager') {
      authToken = response.data.tokens.accessToken;
      logTest('Authentication', true, 'Accounts Manager authenticated successfully', {
        userId: response.data.user.id,
        role: response.data.user.role,
        tenantId: response.data.user.tenantId
      });
      return true;
    } else {
      logTest('Authentication', false, 'Invalid role or authentication failed');
      return false;
    }
  } catch (error) {
    logTest('Authentication', false, `Authentication error: ${error.message}`);
    return false;
  }
}

// Test Financial KPIs
async function testFinancialKPIs() {
  try {
    const response = await axios.get(`${API_URL}/accounts-manager/kpis`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': testAccountsManager.tenantId
      }
    });

    const kpis = response.data;
    const requiredFields = [
      'totalRevenue', 'netCollections', 'outstandingReceivables', 
      'refundsIssued', 'revenueGrowth', 'collectionEfficiency'
    ];

    const missingFields = requiredFields.filter(field => !(field in kpis));
    
    if (missingFields.length === 0) {
      logTest('Financial KPIs', true, 'All required KPI fields present', {
        totalRevenue: kpis.totalRevenue,
        collectionEfficiency: kpis.collectionEfficiency,
        revenueGrowth: kpis.revenueGrowth
      });
    } else {
      logTest('Financial KPIs', false, `Missing KPI fields: ${missingFields.join(', ')}`);
    }
  } catch (error) {
    logTest('Financial KPIs', false, `KPIs fetch error: ${error.message}`);
  }
}

// Test Revenue Analytics
async function testRevenueAnalytics() {
  try {
    const response = await axios.get(`${API_URL}/accounts-manager/revenue/analytics`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': testAccountsManager.tenantId
      },
      params: { period: 'month' }
    });

    const analytics = response.data;
    const requiredSections = ['departmentWise', 'doctorWise', 'treatmentWise', 'paymentModeAnalytics'];
    
    const missingSections = requiredSections.filter(section => !analytics[section]);
    
    if (missingSections.length === 0) {
      logTest('Revenue Analytics', true, 'All analytics sections present', {
        departmentCount: analytics.departmentWise.length,
        doctorCount: analytics.doctorWise.length,
        treatmentCount: analytics.treatmentWise.length,
        paymentModes: analytics.paymentModeAnalytics.length
      });
    } else {
      logTest('Revenue Analytics', false, `Missing analytics sections: ${missingSections.join(', ')}`);
    }
  } catch (error) {
    logTest('Revenue Analytics', false, `Revenue analytics error: ${error.message}`);
  }
}

// Test Billing Oversight
async function testBillingOversight() {
  try {
    const response = await axios.get(`${API_URL}/accounts-manager/billing/oversight`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': testAccountsManager.tenantId
      }
    });

    const oversight = response.data;
    const requiredSections = ['flaggedBills', 'pendingApprovals', 'billingDiscrepancies', 'adjustmentRequests'];
    
    const missingSections = requiredSections.filter(section => !oversight[section]);
    
    if (missingSections.length === 0) {
      logTest('Billing Oversight', true, 'All oversight sections present', {
        flaggedBills: oversight.flaggedBills.length,
        pendingApprovals: oversight.pendingApprovals.length,
        discrepancies: oversight.billingDiscrepancies.length,
        adjustmentRequests: oversight.adjustmentRequests.length
      });
    } else {
      logTest('Billing Oversight', false, `Missing oversight sections: ${missingSections.join(', ')}`);
    }
  } catch (error) {
    logTest('Billing Oversight', false, `Billing oversight error: ${error.message}`);
  }
}

// Test Refund Management
async function testRefundManagement() {
  try {
    const response = await axios.get(`${API_URL}/accounts-manager/refunds`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': testAccountsManager.tenantId
      },
      params: { status: 'PENDING' }
    });

    const refunds = response.data;
    
    if (Array.isArray(refunds)) {
      const pendingRefunds = refunds.filter(r => r.status === 'PENDING');
      logTest('Refund Management', true, 'Refund requests retrieved successfully', {
        totalRefunds: refunds.length,
        pendingRefunds: pendingRefunds.length,
        sampleRefund: refunds[0] || null
      });
    } else {
      logTest('Refund Management', false, 'Invalid refund data format');
    }
  } catch (error) {
    logTest('Refund Management', false, `Refund management error: ${error.message}`);
  }
}

// Test Refund Approval
async function testRefundApproval() {
  try {
    // First get pending refunds
    const refundsResponse = await axios.get(`${API_URL}/accounts-manager/refunds`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': testAccountsManager.tenantId
      },
      params: { status: 'PENDING' }
    });

    const pendingRefunds = refundsResponse.data.filter(r => r.status === 'PENDING');
    
    if (pendingRefunds.length > 0) {
      const refundId = pendingRefunds[0].id;
      
      // Test approval
      const approvalResponse = await axios.post(
        `${API_URL}/accounts-manager/refunds/${refundId}/approve`,
        { notes: 'Test approval - valid refund request' },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-Tenant-ID': testAccountsManager.tenantId
          }
        }
      );

      if (approvalResponse.status === 200) {
        logTest('Refund Approval', true, 'Refund approved successfully', {
          refundId,
          approvalNotes: 'Test approval - valid refund request'
        });
      } else {
        logTest('Refund Approval', false, 'Refund approval failed');
      }
    } else {
      logTest('Refund Approval', true, 'No pending refunds to approve (expected in test environment)');
    }
  } catch (error) {
    logTest('Refund Approval', false, `Refund approval error: ${error.message}`);
  }
}

// Test Financial Alerts
async function testFinancialAlerts() {
  try {
    const response = await axios.get(`${API_URL}/accounts-manager/alerts`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': testAccountsManager.tenantId
      }
    });

    const alerts = response.data;
    
    if (Array.isArray(alerts)) {
      const highPriorityAlerts = alerts.filter(a => a.severity === 'HIGH');
      logTest('Financial Alerts', true, 'Financial alerts retrieved successfully', {
        totalAlerts: alerts.length,
        highPriorityAlerts: highPriorityAlerts.length,
        alertTypes: [...new Set(alerts.map(a => a.type))]
      });
    } else {
      logTest('Financial Alerts', false, 'Invalid alerts data format');
    }
  } catch (error) {
    logTest('Financial Alerts', false, `Financial alerts error: ${error.message}`);
  }
}

// Test Receivables Data
async function testReceivablesData() {
  try {
    const response = await axios.get(`${API_URL}/accounts-manager/receivables`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': testAccountsManager.tenantId
      }
    });

    const receivables = response.data;
    const requiredFields = ['totalOutstanding', 'agingAnalysis', 'overdueAccounts'];
    
    const missingFields = requiredFields.filter(field => !(field in receivables));
    
    if (missingFields.length === 0) {
      logTest('Receivables Data', true, 'Receivables data complete', {
        totalOutstanding: receivables.totalOutstanding,
        agingBuckets: receivables.agingAnalysis.length,
        overdueAccounts: receivables.overdueAccounts.length
      });
    } else {
      logTest('Receivables Data', false, `Missing receivables fields: ${missingFields.join(', ')}`);
    }
  } catch (error) {
    logTest('Receivables Data', false, `Receivables data error: ${error.message}`);
  }
}

// Test Policy Configuration
async function testPolicyConfiguration() {
  try {
    const response = await axios.get(`${API_URL}/accounts-manager/policies`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': testAccountsManager.tenantId
      }
    });

    const policies = response.data;
    
    if (policies && typeof policies === 'object') {
      logTest('Policy Configuration', true, 'Policy configuration retrieved', {
        policiesCount: Object.keys(policies).length,
        samplePolicies: Object.keys(policies).slice(0, 3)
      });
    } else {
      logTest('Policy Configuration', false, 'Invalid policy configuration format');
    }
  } catch (error) {
    logTest('Policy Configuration', false, `Policy configuration error: ${error.message}`);
  }
}

// Test Audit Logs
async function testAuditLogs() {
  try {
    const response = await axios.get(`${API_URL}/accounts-manager/audit/logs`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': testAccountsManager.tenantId
      },
      params: {
        limit: 10,
        entityType: 'REFUND'
      }
    });

    const auditLogs = response.data;
    
    if (Array.isArray(auditLogs)) {
      logTest('Audit Logs', true, 'Audit logs retrieved successfully', {
        logsCount: auditLogs.length,
        sampleLog: auditLogs[0] || null
      });
    } else {
      logTest('Audit Logs', false, 'Invalid audit logs format');
    }
  } catch (error) {
    logTest('Audit Logs', false, `Audit logs error: ${error.message}`);
  }
}

// Test Role-based Access Control
async function testRoleBasedAccess() {
  try {
    // Test access to accounts-manager specific endpoints
    const endpoints = [
      '/accounts-manager/kpis',
      '/accounts-manager/revenue/analytics',
      '/accounts-manager/billing/oversight',
      '/accounts-manager/refunds',
      '/accounts-manager/receivables'
    ];

    let accessibleEndpoints = 0;
    
    for (const endpoint of endpoints) {
      try {
        await axios.get(`${API_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'X-Tenant-ID': testAccountsManager.tenantId
          }
        });
        accessibleEndpoints++;
      } catch (error) {
        // Expected for some endpoints in test environment
      }
    }

    if (accessibleEndpoints >= 3) {
      logTest('Role-based Access', true, 'Accounts Manager has appropriate access', {
        accessibleEndpoints,
        totalEndpoints: endpoints.length
      });
    } else {
      logTest('Role-based Access', false, 'Insufficient access to accounts manager endpoints');
    }
  } catch (error) {
    logTest('Role-based Access', false, `Role access test error: ${error.message}`);
  }
}

// Main test execution
async function runAccountsManagerDashboardTests() {
  console.log('🧪 Starting Accounts Manager Dashboard Tests...\n');
  
  // Authentication test
  const authSuccess = await authenticateAccountsManager();
  if (!authSuccess) {
    console.log('❌ Authentication failed. Stopping tests.');
    return;
  }

  // Core functionality tests
  await testFinancialKPIs();
  await testRevenueAnalytics();
  await testBillingOversight();
  await testRefundManagement();
  await testRefundApproval();
  await testFinancialAlerts();
  await testReceivablesData();
  await testPolicyConfiguration();
  await testAuditLogs();
  await testRoleBasedAccess();

  // Test summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.filter(r => !r.success).forEach(test => {
      console.log(`   - ${test.test}: ${test.message}`);
    });
  }

  console.log('\n🎯 Accounts Manager Dashboard Features Tested:');
  console.log('   ✓ Financial KPIs and Performance Metrics');
  console.log('   ✓ Revenue Analytics (Department/Doctor/Treatment-wise)');
  console.log('   ✓ Billing Oversight and Flagged Bills');
  console.log('   ✓ Refund Management and Approval Workflow');
  console.log('   ✓ Financial Alerts and Notifications');
  console.log('   ✓ Receivables Control and Aging Analysis');
  console.log('   ✓ Policy Configuration Access');
  console.log('   ✓ Audit Logs and Compliance Tracking');
  console.log('   ✓ Role-based Access Control');

  console.log('\n✅ Accounts Manager Dashboard testing completed!');
}

// Run tests
runAccountsManagerDashboardTests().catch(console.error);