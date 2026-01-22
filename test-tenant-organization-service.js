/**
 * Test script for Tenant Organization Service
 * Tests core functionality including tenant and branch management
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api';
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJyb2xlcyI6WyJTQUFTX0FETUlOIl0sImlhdCI6MTY0Mjg1NzYwMCwiZXhwIjoxOTU4MjE3NjAwfQ.test-signature';

let createdTenantId = null;
let createdBranchId = null;

async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Health Check Status:', response.data.status);
    console.log('📊 Database Connected:', response.data.database.connected);
    console.log('🔄 Cache Connected:', response.data.cache.connected);
    return true;
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
    return false;
  }
}

async function testCreateTenant() {
  console.log('\n🏢 Testing Tenant Creation...');
  
  const tenantData = {
    organizationName: 'Test Dental Clinic',
    industryType: 'DENTAL',
    subscriptionType: 'PROFESSIONAL',
    owner: {
      name: 'Dr. Test Smith',
      email: 'test.smith@testclinic.com',
      phone: '+91-9876543210',
      roles: ['CENTRAL_ADMIN', 'DOCTOR']
    },
    contactInfo: {
      address: {
        street: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        zipCode: '400001'
      },
      website: 'https://testclinic.com',
      taxId: 'TEST123456789'
    },
    configuration: {
      enabledModules: ['APPOINTMENTS', 'QUEUE_MANAGEMENT', 'AI_DIAGNOSIS'],
      appointmentRules: {
        maxAdvanceBookingDays: 30,
        minBookingNoticeHours: 2,
        allowCancellationHours: 24,
        maxAppointmentsPerDay: 50
      },
      tokenRules: {
        enableQRCheckin: true,
        enableNFCCheckin: false,
        autoAdvanceQueue: true,
        maxWaitingTokens: 20
      },
      featureFlags: {
        AI_ENABLED: true,
        OCR_ENABLED: true,
        ANALYTICS_ENABLED: true
      }
    },
    limits: {
      maxBranches: 3,
      maxUsers: 25,
      maxAppointmentsPerMonth: 2000,
      storageQuotaGB: 10
    },
    mainBranch: {
      branchName: 'Main Test Clinic',
      address: {
        street: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        zipCode: '400001'
      },
      contactInfo: {
        phone: '+91-9876543210',
        email: 'main@testclinic.com'
      }
    }
  };

  try {
    const response = await axios.post(`${BASE_URL}/tenants/create`, tenantData);
    
    if (response.data.success) {
      createdTenantId = response.data.data.tenantId;
      console.log('✅ Tenant Created Successfully');
      console.log('🆔 Tenant ID:', createdTenantId);
      console.log('📊 Status:', response.data.data.status);
      console.log('👤 Owner:', response.data.data.owner.name);
      return true;
    } else {
      console.error('❌ Tenant Creation Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Tenant Creation Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetTenant() {
  if (!createdTenantId) {
    console.log('⏭️ Skipping Get Tenant - No tenant created');
    return false;
  }

  console.log('\n📋 Testing Get Tenant...');
  
  try {
    const response = await axios.get(`${BASE_URL}/tenants/${createdTenantId}`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` }
    });
    
    if (response.data.success) {
      console.log('✅ Tenant Retrieved Successfully');
      console.log('🏢 Organization:', response.data.data.organizationName);
      console.log('📊 Status:', response.data.data.status);
      console.log('🔧 Enabled Modules:', response.data.data.configuration.enabledModules.join(', '));
      return true;
    } else {
      console.error('❌ Get Tenant Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Get Tenant Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testValidateTenant() {
  if (!createdTenantId) {
    console.log('⏭️ Skipping Validate Tenant - No tenant created');
    return false;
  }

  console.log('\n✅ Testing Tenant Validation...');
  
  try {
    const response = await axios.get(`${BASE_URL}/tenants/validate/${createdTenantId}`);
    
    if (response.data.success) {
      console.log('✅ Tenant Validation Successful');
      console.log('🔍 Is Valid:', response.data.data.isValid);
      console.log('📊 Status:', response.data.data.status);
      console.log('🏢 Organization:', response.data.data.organizationName);
      return true;
    } else {
      console.error('❌ Tenant Validation Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Tenant Validation Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testCreateBranch() {
  if (!createdTenantId) {
    console.log('⏭️ Skipping Create Branch - No tenant created');
    return false;
  }

  console.log('\n🏪 Testing Branch Creation...');
  
  const branchData = {
    branchName: 'Downtown Test Branch',
    branchCode: 'DT01',
    branchType: 'BRANCH',
    address: {
      street: '456 Downtown Ave',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      zipCode: '400002',
      coordinates: {
        latitude: 19.0760,
        longitude: 72.8777
      }
    },
    contactInfo: {
      phone: '+91-9876543211',
      email: 'downtown@testclinic.com'
    },
    operationalInfo: {
      timezone: 'Asia/Kolkata',
      workingHours: {
        monday: {
          isOpen: true,
          openTime: '09:00',
          closeTime: '18:00',
          breakStart: '13:00',
          breakEnd: '14:00'
        },
        tuesday: {
          isOpen: true,
          openTime: '09:00',
          closeTime: '18:00',
          breakStart: '13:00',
          breakEnd: '14:00'
        },
        wednesday: {
          isOpen: true,
          openTime: '09:00',
          closeTime: '18:00',
          breakStart: '13:00',
          breakEnd: '14:00'
        },
        thursday: {
          isOpen: true,
          openTime: '09:00',
          closeTime: '18:00',
          breakStart: '13:00',
          breakEnd: '14:00'
        },
        friday: {
          isOpen: true,
          openTime: '09:00',
          closeTime: '18:00',
          breakStart: '13:00',
          breakEnd: '14:00'
        },
        saturday: {
          isOpen: true,
          openTime: '09:00',
          closeTime: '17:00',
          breakStart: '13:00',
          breakEnd: '14:00'
        },
        sunday: {
          isOpen: false
        }
      }
    },
    departments: [
      {
        name: 'General Dentistry',
        code: 'GEN',
        description: 'General dental services',
        rooms: [
          {
            roomNumber: '101',
            roomName: 'Consultation Room 1',
            roomType: 'CONSULTATION',
            capacity: 1,
            equipment: ['Dental Chair', 'X-Ray Viewer', 'Computer']
          },
          {
            roomNumber: '102',
            roomName: 'Treatment Room 1',
            roomType: 'TREATMENT',
            capacity: 1,
            equipment: ['Dental Chair', 'Suction Unit', 'LED Light']
          }
        ]
      },
      {
        name: 'Orthodontics',
        code: 'ORTHO',
        description: 'Orthodontic services and braces',
        rooms: [
          {
            roomNumber: '201',
            roomName: 'Orthodontic Room',
            roomType: 'TREATMENT',
            capacity: 1,
            equipment: ['Orthodontic Chair', 'Cephalometric X-Ray']
          }
        ]
      }
    ],
    configuration: {
      enabledServices: ['APPOINTMENTS', 'QUEUE_MANAGEMENT', 'BILLING'],
      appointmentSlotDuration: 30,
      maxDailyAppointments: 40,
      enableWalkIns: true,
      autoConfirmAppointments: false
    }
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/branches/tenant/${createdTenantId}/branches`, 
      branchData,
      { headers: { Authorization: `Bearer ${TEST_JWT}` } }
    );
    
    if (response.data.success) {
      createdBranchId = response.data.data.branchId;
      console.log('✅ Branch Created Successfully');
      console.log('🆔 Branch ID:', createdBranchId);
      console.log('🏪 Branch Name:', response.data.data.branchName);
      console.log('📍 Location:', response.data.data.address.city);
      console.log('🏢 Departments:', response.data.data.departments.length);
      return true;
    } else {
      console.error('❌ Branch Creation Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Branch Creation Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetBranch() {
  if (!createdBranchId) {
    console.log('⏭️ Skipping Get Branch - No branch created');
    return false;
  }

  console.log('\n📋 Testing Get Branch...');
  
  try {
    const response = await axios.get(`${BASE_URL}/branches/${createdBranchId}`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` }
    });
    
    if (response.data.success) {
      console.log('✅ Branch Retrieved Successfully');
      console.log('🏪 Branch Name:', response.data.data.branchName);
      console.log('📊 Status:', response.data.data.status);
      console.log('🏢 Departments:', response.data.data.departments.length);
      console.log('🏠 Total Rooms:', response.data.data.departments.reduce((total, dept) => total + dept.rooms.length, 0));
      return true;
    } else {
      console.error('❌ Get Branch Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Get Branch Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetTenantBranches() {
  if (!createdTenantId) {
    console.log('⏭️ Skipping Get Tenant Branches - No tenant created');
    return false;
  }

  console.log('\n🏪 Testing Get Tenant Branches...');
  
  try {
    const response = await axios.get(`${BASE_URL}/branches/tenant/${createdTenantId}/branches`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` }
    });
    
    if (response.data.success) {
      console.log('✅ Tenant Branches Retrieved Successfully');
      console.log('🏪 Total Branches:', response.data.count);
      response.data.data.forEach((branch, index) => {
        console.log(`   ${index + 1}. ${branch.branchName} (${branch.branchCode}) - ${branch.status}`);
      });
      return true;
    } else {
      console.error('❌ Get Tenant Branches Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Get Tenant Branches Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testTenantConfiguration() {
  if (!createdTenantId) {
    console.log('⏭️ Skipping Tenant Configuration - No tenant created');
    return false;
  }

  console.log('\n⚙️ Testing Tenant Configuration...');
  
  try {
    // Get current configuration
    const getResponse = await axios.get(`${BASE_URL}/tenants/${createdTenantId}/configuration`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` }
    });
    
    if (getResponse.data.success) {
      console.log('✅ Configuration Retrieved Successfully');
      console.log('🔧 Enabled Modules:', getResponse.data.data.enabledModules.join(', '));
      console.log('🎯 Feature Flags:', Object.keys(getResponse.data.data.featureFlags || {}).length);
    }

    // Update configuration
    const updateData = {
      enabledModules: ['APPOINTMENTS', 'QUEUE_MANAGEMENT', 'AI_DIAGNOSIS', 'BILLING'],
      appointmentRules: {
        maxAdvanceBookingDays: 45,
        minBookingNoticeHours: 4,
        allowCancellationHours: 48,
        maxAppointmentsPerDay: 60
      },
      featureFlags: {
        AI_ENABLED: true,
        OCR_ENABLED: true,
        ANALYTICS_ENABLED: true,
        NOTIFICATIONS_ENABLED: true,
        BILLING_ENABLED: true
      }
    };

    const updateResponse = await axios.put(
      `${BASE_URL}/tenants/${createdTenantId}/configuration`, 
      updateData,
      { headers: { Authorization: `Bearer ${TEST_JWT}` } }
    );
    
    if (updateResponse.data.success) {
      console.log('✅ Configuration Updated Successfully');
      console.log('🔧 New Modules:', updateResponse.data.data.enabledModules.join(', '));
      return true;
    } else {
      console.error('❌ Configuration Update Failed:', updateResponse.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Configuration Test Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testBranchValidation() {
  if (!createdBranchId || !createdTenantId) {
    console.log('⏭️ Skipping Branch Validation - No branch/tenant created');
    return false;
  }

  console.log('\n✅ Testing Branch Validation...');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/branches/${createdBranchId}/validate?tenantId=${createdTenantId}`,
      { headers: { Authorization: `Bearer ${TEST_JWT}` } }
    );
    
    if (response.data.success) {
      console.log('✅ Branch Validation Successful');
      console.log('🔍 Is Valid:', response.data.data.isValid);
      console.log('📊 Status:', response.data.data.status);
      console.log('🏪 Branch Name:', response.data.data.branchName);
      console.log('🏢 Tenant Match:', response.data.data.tenantId === createdTenantId);
      return true;
    } else {
      console.error('❌ Branch Validation Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Branch Validation Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Tenant Organization Service Tests...');
  console.log('=' .repeat(60));

  const results = {
    healthCheck: await testHealthCheck(),
    createTenant: await testCreateTenant(),
    getTenant: await testGetTenant(),
    validateTenant: await testValidateTenant(),
    createBranch: await testCreateBranch(),
    getBranch: await testGetBranch(),
    getTenantBranches: await testGetTenantBranches(),
    tenantConfiguration: await testTenantConfiguration(),
    branchValidation: await testBranchValidation()
  };

  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));

  let passed = 0;
  let total = 0;

  Object.entries(results).forEach(([test, result]) => {
    total++;
    if (result) passed++;
    console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
  });

  console.log('\n' + '=' .repeat(60));
  console.log(`🎯 OVERALL RESULT: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Tenant Organization Service is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the service configuration and logs.');
  }

  if (createdTenantId) {
    console.log(`\n📝 Created Tenant ID: ${createdTenantId}`);
  }
  if (createdBranchId) {
    console.log(`📝 Created Branch ID: ${createdBranchId}`);
  }

  console.log('\n🔗 Service Endpoints:');
  console.log(`   Health: ${BASE_URL.replace('/api', '')}/health`);
  console.log(`   API Docs: See API_DOCUMENTATION.md`);
  console.log(`   Service: ${BASE_URL}`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});