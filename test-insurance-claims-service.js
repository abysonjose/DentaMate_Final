const axios = require('axios');

const BASE_URL = 'http://localhost:3009';
const API_BASE = `${BASE_URL}/api/insurance`;

// Test JWT token (replace with actual token from auth service)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJ0ZW5hbnRJZCI6InRlc3QtdGVuYW50IiwiYnJhbmNoSWQiOiJ0ZXN0LWJyYW5jaCIsInJvbGUiOiJpbnN1cmFuY2Vfc3RhZmYiLCJ1c2VyTmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTcwNTMxNTIwMCwiZXhwIjoxNzA1NDAxNjAwfQ.test-signature';

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health Check failed:', error.response?.data || error.message);
    return false;
  }
}

async function testCreatePolicy() {
  console.log('\n📋 Testing Create Insurance Policy...');
  try {
    const policyData = {
      patientId: 'test-patient-123',
      provider: {
        name: 'ABC Health Insurance',
        code: 'ABC001',
        contactInfo: {
          phone: '+1-555-0123',
          email: 'claims@abchealth.com',
          address: '123 Insurance St, City, State 12345'
        }
      },
      policyNumber: 'POL-2024-001',
      policyHolderName: 'John Doe',
      policyHolderRelation: 'self',
      coverageType: 'comprehensive',
      coverageDetails: {
        annualLimit: 5000,
        deductible: 100,
        coPaymentPercentage: 20,
        coveredServices: [
          {
            serviceType: 'cleaning',
            coveragePercentage: 100,
            annualLimit: 500
          },
          {
            serviceType: 'filling',
            coveragePercentage: 80,
            annualLimit: 1500
          },
          {
            serviceType: 'root_canal',
            coveragePercentage: 70,
            annualLimit: 2000
          }
        ],
        excludedServices: ['cosmetic', 'orthodontics']
      },
      validityPeriod: {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }
    };

    const response = await axios.post(`${API_BASE}/policies`, policyData, { headers });
    console.log('✅ Policy Created:', {
      policyId: response.data.data.policyId,
      policyNumber: response.data.data.policyNumber,
      status: response.data.data.status
    });
    return response.data.data.policyId;
  } catch (error) {
    console.error('❌ Create Policy failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetPolicy(policyId) {
  console.log('\n🔍 Testing Get Policy...');
  try {
    const response = await axios.get(`${API_BASE}/policies/${policyId}`, { headers });
    console.log('✅ Policy Retrieved:', {
      policyId: response.data.data.policyId,
      provider: response.data.data.provider.name,
      status: response.data.data.status,
      verificationStatus: response.data.data.verificationStatus
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Get Policy failed:', error.response?.data || error.message);
    return null;
  }
}

async function testVerifyPolicy(policyId) {
  console.log('\n✅ Testing Verify Policy...');
  try {
    const verificationData = {
      status: 'verified',
      notes: 'Policy verified successfully with insurer'
    };

    const response = await axios.patch(`${API_BASE}/policies/${policyId}/verify`, verificationData, { headers });
    console.log('✅ Policy Verified:', {
      policyId: response.data.data.policyId,
      verificationStatus: response.data.data.verificationStatus,
      lastVerificationDate: response.data.data.lastVerificationDate
    });
    return true;
  } catch (error) {
    console.error('❌ Verify Policy failed:', error.response?.data || error.message);
    return false;
  }
}

async function testCheckEligibility(policyId) {
  console.log('\n💰 Testing Policy Eligibility Check...');
  try {
    const params = {
      serviceType: 'root_canal',
      amount: 1500
    };

    const response = await axios.get(`${API_BASE}/policies/${policyId}/eligibility`, {
      headers,
      params
    });
    
    console.log('✅ Eligibility Check:', {
      eligible: response.data.eligibility.eligible,
      coverageAmount: response.data.eligibility.amounts?.coverageAmount,
      patientPayable: response.data.eligibility.amounts?.patientPayable,
      remainingBenefit: response.data.eligibility.amounts?.remainingBenefit
    });
    return response.data.eligibility;
  } catch (error) {
    console.error('❌ Eligibility Check failed:', error.response?.data || error.message);
    return null;
  }
}

async function testCreateClaim(policyId) {
  console.log('\n📄 Testing Create Insurance Claim...');
  try {
    const claimData = {
      patientId: 'test-patient-123',
      policyId: policyId,
      invoiceId: 'test-invoice-456',
      appointmentId: 'test-appointment-789',
      doctorId: 'test-doctor-101',
      treatmentDetails: {
        treatmentDate: '2024-01-15',
        treatmentType: 'root_canal',
        treatmentCodes: [
          {
            code: 'D3330',
            description: 'Molar endodontic therapy',
            amount: 1500
          }
        ],
        diagnosis: 'Pulpitis with periapical involvement',
        treatmentSummary: 'Root canal treatment performed on tooth #19',
        doctorNotes: 'Patient responded well to treatment'
      },
      financialDetails: {
        totalAmount: 1500,
        claimAmount: 1500
      },
      priority: 'normal',
      tags: ['endodontics', 'emergency'],
      internalNotes: 'Patient has good insurance coverage'
    };

    const response = await axios.post(`${API_BASE}/claims`, claimData, { headers });
    console.log('✅ Claim Created:', {
      claimId: response.data.data.claimId,
      claimNumber: response.data.data.claimNumber,
      status: response.data.data.status,
      claimAmount: response.data.data.financialDetails.claimAmount
    });
    return response.data.data.claimId;
  } catch (error) {
    console.error('❌ Create Claim failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetClaim(claimId) {
  console.log('\n🔍 Testing Get Claim...');
  try {
    const response = await axios.get(`${API_BASE}/claims/${claimId}`, { headers });
    console.log('✅ Claim Retrieved:', {
      claimId: response.data.data.claimId,
      claimNumber: response.data.data.claimNumber,
      status: response.data.data.status,
      insurer: response.data.data.insurer.name,
      statusHistoryCount: response.data.data.statusHistory.length
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Get Claim failed:', error.response?.data || error.message);
    return null;
  }
}

async function testSubmitClaim(claimId) {
  console.log('\n📤 Testing Submit Claim...');
  try {
    const submissionData = {
      method: 'manual',
      reference: 'SUB-2024-001',
      acknowledgmentNumber: 'ACK-ABC-789'
    };

    const response = await axios.post(`${API_BASE}/claims/${claimId}/submit`, submissionData, { headers });
    console.log('✅ Claim Submitted:', {
      claimId: response.data.data.claimId,
      status: response.data.data.status,
      submittedAt: response.data.data.submissionDetails.submittedAt,
      acknowledgmentNumber: response.data.data.submissionDetails.acknowledgmentNumber
    });
    return true;
  } catch (error) {
    console.error('❌ Submit Claim failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdateClaimStatus(claimId) {
  console.log('\n🔄 Testing Update Claim Status...');
  try {
    const statusData = {
      status: 'APPROVED',
      notes: 'Claim approved by insurer',
      insurerRemarks: 'All documentation verified',
      approvedBy: 'ABC Insurance Reviewer',
      approvedAmount: 1200,
      reference: 'APP-ABC-2024-001'
    };

    const response = await axios.patch(`${API_BASE}/claims/${claimId}/status`, statusData, { headers });
    console.log('✅ Claim Status Updated:', {
      claimId: response.data.data.claimId,
      status: response.data.data.status,
      approvedAmount: response.data.data.financialDetails.approvedAmount,
      patientPayable: response.data.data.financialDetails.patientPayableAmount
    });
    return true;
  } catch (error) {
    console.error('❌ Update Claim Status failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSettleClaim(claimId) {
  console.log('\n💳 Testing Settle Claim...');
  try {
    const settlementData = {
      status: 'SETTLED',
      notes: 'Settlement processed',
      settledAmount: 1200,
      method: 'bank_transfer',
      reference: 'SET-ABC-2024-001'
    };

    const response = await axios.patch(`${API_BASE}/claims/${claimId}/status`, settlementData, { headers });
    console.log('✅ Claim Settled:', {
      claimId: response.data.data.claimId,
      status: response.data.data.status,
      settledAmount: response.data.data.financialDetails.settledAmount,
      settlementMethod: response.data.data.settlementDetails.settlementMethod
    });
    return true;
  } catch (error) {
    console.error('❌ Settle Claim failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetClaimHistory(claimId) {
  console.log('\n📜 Testing Get Claim History...');
  try {
    const response = await axios.get(`${API_BASE}/claims/${claimId}/history`, { headers });
    console.log('✅ Claim History Retrieved:', {
      claimId: claimId,
      historyCount: response.data.count,
      statuses: response.data.data.map(h => h.status)
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Get Claim History failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetPatientPolicies() {
  console.log('\n👤 Testing Get Patient Policies...');
  try {
    const patientId = 'test-patient-123';
    const response = await axios.get(`${API_BASE}/policies/patient/${patientId}`, { headers });
    console.log('✅ Patient Policies Retrieved:', {
      patientId: patientId,
      policyCount: response.data.count,
      policies: response.data.data.map(p => ({
        policyId: p.policyId,
        provider: p.provider.name,
        status: p.status
      }))
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Get Patient Policies failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetClaimsByStatus() {
  console.log('\n📊 Testing Get Claims by Status...');
  try {
    const response = await axios.get(`${API_BASE}/claims?status=SETTLED&limit=5`, { headers });
    console.log('✅ Claims by Status Retrieved:', {
      status: 'SETTLED',
      count: response.data.count,
      claims: response.data.data.map(c => ({
        claimId: c.claimId,
        claimNumber: c.claimNumber,
        status: c.status
      }))
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Get Claims by Status failed:', error.response?.data || error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Insurance Claims Service Tests...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test health check first
  const healthOk = await testHealthCheck();
  results.total++;
  if (healthOk) results.passed++; else results.failed++;

  if (!healthOk) {
    console.log('\n❌ Service is not healthy. Stopping tests.');
    return results;
  }

  // Test policy workflow
  const policyId = await testCreatePolicy();
  results.total++;
  if (policyId) results.passed++; else results.failed++;

  if (policyId) {
    const policy = await testGetPolicy(policyId);
    results.total++;
    if (policy) results.passed++; else results.failed++;

    const verified = await testVerifyPolicy(policyId);
    results.total++;
    if (verified) results.passed++; else results.failed++;

    const eligibility = await testCheckEligibility(policyId);
    results.total++;
    if (eligibility) results.passed++; else results.failed++;

    // Test claim workflow
    const claimId = await testCreateClaim(policyId);
    results.total++;
    if (claimId) results.passed++; else results.failed++;

    if (claimId) {
      const claim = await testGetClaim(claimId);
      results.total++;
      if (claim) results.passed++; else results.failed++;

      const submitted = await testSubmitClaim(claimId);
      results.total++;
      if (submitted) results.passed++; else results.failed++;

      const statusUpdated = await testUpdateClaimStatus(claimId);
      results.total++;
      if (statusUpdated) results.passed++; else results.failed++;

      const settled = await testSettleClaim(claimId);
      results.total++;
      if (settled) results.passed++; else results.failed++;

      const history = await testGetClaimHistory(claimId);
      results.total++;
      if (history) results.passed++; else results.failed++;
    }
  }

  // Test additional endpoints
  const patientPolicies = await testGetPatientPolicies();
  results.total++;
  if (patientPolicies) results.passed++; else results.failed++;

  const claimsByStatus = await testGetClaimsByStatus();
  results.total++;
  if (claimsByStatus !== null) results.passed++; else results.failed++;

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.total}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Insurance Claims Service is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the service configuration and try again.');
  }

  return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testHealthCheck,
  testCreatePolicy,
  testCreateClaim
};