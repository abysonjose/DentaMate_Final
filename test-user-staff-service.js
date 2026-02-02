const axios = require('axios');

const BASE_URL = 'http://localhost:3004';
const API_URL = `${BASE_URL}/api`;

// Test configuration
const testConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Mock JWT token for testing (in real scenario, get from auth service)
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0X3VzZXJfMTIzIiwic3RhZmZJZCI6InRlc3Rfc3RhZmZfMTIzIiwidGVuYW50SWQiOiJ0ZXN0X3RlbmFudF8xMjMiLCJicmFuY2hJZCI6InRlc3RfYnJhbmNoXzEyMyIsInJvbGVzIjpbIlNBQVNfQURNSU4iXSwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjE3MDQxNTM2MDB9';

const authHeaders = {
  ...testConfig.headers,
  'Authorization': `Bearer ${mockToken}`
};

// Test data
const testStaffData = {
  tenantId: 'test_tenant_123',
  branchId: 'test_branch_456',
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@testclinic.com',
    phone: '+1234567890'
  },
  employmentInfo: {
    employmentType: 'FULL_TIME',
    dateOfJoining: '2024-01-01'
  },
  roles: [
    {
      roleId: 'role_doctor_123',
      roleName: 'DOCTOR'
    }
  ]
};

async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`, testConfig);
    console.log('✅ Health Check Status:', response.status);
    console.log('📊 Health Data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
    return false;
  }
}

async function testDetailedHealthCheck() {
  console.log('\n🔍 Testing Detailed Health Check...');
  try {
    const response = await axios.get(`${BASE_URL}/health/detailed`, testConfig);
    console.log('✅ Detailed Health Check Status:', response.status);
    console.log('📊 Detailed Health Data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Detailed Health Check Failed:', error.message);
    return false;
  }
}
async function testGetAllRoles() {
  console.log('\n🔍 Testing Get All Roles...');
  try {
    const response = await axios.get(`${API_URL}/roles`, {
      ...testConfig,
      headers: authHeaders
    });
    console.log('✅ Get All Roles Status:', response.status);
    console.log('📊 Roles Count:', response.data.data?.length || 0);
    if (response.data.data?.length > 0) {
      console.log('📋 Sample Role:', JSON.stringify(response.data.data[0], null, 2));
    }
    return true;
  } catch (error) {
    console.error('❌ Get All Roles Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testInitializeSystemRoles() {
  console.log('\n🔍 Testing Initialize System Roles...');
  try {
    const response = await axios.post(`${API_URL}/roles/system/initialize`, {}, {
      ...testConfig,
      headers: authHeaders
    });
    console.log('✅ Initialize System Roles Status:', response.status);
    console.log('📊 Initialize Result:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Initialize System Roles Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetRoleHierarchy() {
  console.log('\n🔍 Testing Get Role Hierarchy...');
  try {
    const response = await axios.get(`${API_URL}/roles/system/hierarchy`, {
      ...testConfig,
      headers: authHeaders
    });
    console.log('✅ Get Role Hierarchy Status:', response.status);
    console.log('📊 Hierarchy Count:', response.data.data?.length || 0);
    if (response.data.data?.length > 0) {
      console.log('📋 Role Hierarchy:', response.data.data.map(role => 
        `${role.roleName} (Level: ${role.level})`
      ).join(', '));
    }
    return true;
  } catch (error) {
    console.error('❌ Get Role Hierarchy Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testCreateStaff() {
  console.log('\n🔍 Testing Create Staff...');
  try {
    const response = await axios.post(`${API_URL}/staff`, testStaffData, {
      ...testConfig,
      headers: authHeaders
    });
    console.log('✅ Create Staff Status:', response.status);
    console.log('📊 Created Staff:', JSON.stringify(response.data.data, null, 2));
    return response.data.data?.staffId;
  } catch (error) {
    console.error('❌ Create Staff Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetStaff(staffId) {
  if (!staffId) {
    console.log('\n⏭️  Skipping Get Staff - No staff ID available');
    return false;
  }

  console.log('\n🔍 Testing Get Staff...');
  try {
    const response = await axios.get(`${API_URL}/staff/${staffId}`, {
      ...testConfig,
      headers: authHeaders
    });
    console.log('✅ Get Staff Status:', response.status);
    console.log('📊 Staff Data:', JSON.stringify(response.data.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Get Staff Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetStaffByTenant() {
  console.log('\n🔍 Testing Get Staff by Tenant...');
  try {
    const response = await axios.get(`${API_URL}/staff/tenant/${testStaffData.tenantId}`, {
      ...testConfig,
      headers: authHeaders
    });
    console.log('✅ Get Staff by Tenant Status:', response.status);
    console.log('📊 Staff Count:', response.data.data?.length || 0);
    return true;
  } catch (error) {
    console.error('❌ Get Staff by Tenant Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetStaffByRole() {
  console.log('\n🔍 Testing Get Staff by Role...');
  try {
    const response = await axios.get(`${API_URL}/staff/role/DOCTOR?tenantId=${testStaffData.tenantId}`, {
      ...testConfig,
      headers: authHeaders
    });
    console.log('✅ Get Staff by Role Status:', response.status);
    console.log('📊 Doctors Count:', response.data.data?.length || 0);
    return true;
  } catch (error) {
    console.error('❌ Get Staff by Role Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAPIDocumentation() {
  console.log('\n🔍 Testing API Documentation...');
  try {
    const response = await axios.get(`${API_URL}/docs`, testConfig);
    console.log('✅ API Documentation Status:', response.status);
    console.log('📚 Service:', response.data.service);
    console.log('📚 Version:', response.data.version);
    console.log('📚 Available Endpoints:', Object.keys(response.data.endpoints));
    return true;
  } catch (error) {
    console.error('❌ API Documentation Failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting User Staff Service Tests...');
  console.log('=' .repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Detailed Health Check', fn: testDetailedHealthCheck },
    { name: 'API Documentation', fn: testAPIDocumentation },
    { name: 'Initialize System Roles', fn: testInitializeSystemRoles },
    { name: 'Get All Roles', fn: testGetAllRoles },
    { name: 'Get Role Hierarchy', fn: testGetRoleHierarchy },
    { name: 'Get Staff by Tenant', fn: testGetStaffByTenant },
    { name: 'Get Staff by Role', fn: testGetStaffByRole }
  ];

  let createdStaffId = null;

  for (const test of tests) {
    results.total++;
    try {
      let result;
      if (test.name === 'Create Staff') {
        result = await test.fn();
        createdStaffId = result;
        result = !!result;
      } else if (test.name === 'Get Staff') {
        result = await test.fn(createdStaffId);
      } else {
        result = await test.fn();
      }

      if (result) {
        results.passed++;
        console.log(`✅ ${test.name}: PASSED`);
      } else {
        results.failed++;
        console.log(`❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      results.failed++;
      console.log(`❌ ${test.name}: ERROR -`, error.message);
    }
  }

  // Test Create Staff separately to get staff ID
  console.log('\n🔍 Testing Create Staff...');
  results.total++;
  try {
    createdStaffId = await testCreateStaff();
    if (createdStaffId) {
      results.passed++;
      console.log('✅ Create Staff: PASSED');
      
      // Now test Get Staff with the created ID
      console.log('\n🔍 Testing Get Staff...');
      results.total++;
      const getResult = await testGetStaff(createdStaffId);
      if (getResult) {
        results.passed++;
        console.log('✅ Get Staff: PASSED');
      } else {
        results.failed++;
        console.log('❌ Get Staff: FAILED');
      }
    } else {
      results.failed++;
      console.log('❌ Create Staff: FAILED');
    }
  } catch (error) {
    results.failed++;
    console.log('❌ Create Staff: ERROR -', error.message);
  }

  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! User Staff Service is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the service configuration and logs.');
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Verify all services are running: docker-compose ps');
  console.log('2. Check service logs: docker-compose logs user-staff-service');
  console.log('3. Test with real authentication tokens');
  console.log('4. Integrate with frontend applications');
  console.log('5. Set up monitoring and alerting');

  return results.failed === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testHealthCheck,
  testCreateStaff,
  testGetStaff,
  testGetAllRoles
};