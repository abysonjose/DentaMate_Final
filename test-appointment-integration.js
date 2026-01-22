// Test script to verify appointment integration between Central Admin and Branch Admin
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8083/appointment-service/api/v1';
const GATEWAY_URL = 'http://localhost:8080/api';

// Test configuration
const testConfig = {
  tenantId: 'tenant001',
  userId: 'admin001',
  clinicId: 'clinic001',
  branchId: 'branch001',
  doctorId: 'doctor001',
  patientId: 'patient001'
};

// Helper function to create headers
function createHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-ID': testConfig.tenantId,
    'X-User-ID': testConfig.userId,
    'Authorization': 'Bearer test-jwt-token'
  };
}

// Test functions
async function testAppointmentServiceHealth() {
  console.log('\n🔍 Testing Appointment Service Health...');
  try {
    const response = await axios.get(`${API_BASE_URL}/appointments/health`, {
      headers: createHeaders()
    });
    console.log('✅ Appointment Service Health:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Appointment Service Health Check Failed:', error.message);
    return false;
  }
}

async function testCreateAppointment() {
  console.log('\n📅 Testing Create Appointment...');
  try {
    const appointmentData = {
      patientId: testConfig.patientId,
      doctorId: testConfig.doctorId,
      clinicId: testConfig.clinicId,
      branchId: testConfig.branchId,
      departmentId: 'dept001',
      appointmentDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      durationMinutes: 30,
      appointmentType: 'consultation',
      priority: 'normal',
      reason: 'Regular checkup',
      notes: 'Integration test appointment',
      isRecurring: false,
      estimatedCost: 150.00,
      isWalkIn: false
    };

    const response = await axios.post(`${API_BASE_URL}/appointments`, appointmentData, {
      headers: createHeaders()
    });
    
    console.log('✅ Appointment Created:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Create Appointment Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetAvailableSlots() {
  console.log('\n🕐 Testing Get Available Slots...');
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const response = await axios.get(`${API_BASE_URL}/schedules/doctor/${testConfig.doctorId}/slots`, {
      params: {
        date: dateStr,
        duration: 30
      },
      headers: createHeaders()
    });
    
    console.log('✅ Available Slots Retrieved:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Get Available Slots Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetQueueSummary() {
  console.log('\n📊 Testing Get Queue Summary...');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(`${API_BASE_URL}/tokens/doctor/${testConfig.doctorId}/queue-summary`, {
      params: { date: today },
      headers: createHeaders()
    });
    
    console.log('✅ Queue Summary Retrieved:', response.data);
    return response.data;
  } catch (error) {
    console.log('❌ Get Queue Summary Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testCentralAdminEndpoints() {
  console.log('\n🏢 Testing Central Admin Integration...');
  
  // Test system-wide metrics endpoint
  try {
    const response = await axios.get(`${GATEWAY_URL}/central-admin/appointments/metrics`, {
      headers: createHeaders()
    });
    console.log('✅ Central Admin Metrics:', response.data);
  } catch (error) {
    console.log('⚠️  Central Admin Metrics (Expected - endpoint may not exist yet):', error.message);
  }
  
  // Test global appointments endpoint
  try {
    const response = await axios.get(`${GATEWAY_URL}/central-admin/appointments/global`, {
      headers: createHeaders()
    });
    console.log('✅ Global Appointments:', response.data);
  } catch (error) {
    console.log('⚠️  Global Appointments (Expected - endpoint may not exist yet):', error.message);
  }
}

async function testBranchAdminEndpoints() {
  console.log('\n🏪 Testing Branch Admin Integration...');
  
  // Test branch-specific appointments
  try {
    const response = await axios.get(`${GATEWAY_URL}/branch-admin/appointments/branch/${testConfig.branchId}`, {
      headers: createHeaders()
    });
    console.log('✅ Branch Appointments:', response.data);
  } catch (error) {
    console.log('⚠️  Branch Appointments (Expected - endpoint may not exist yet):', error.message);
  }
  
  // Test branch queue monitoring
  try {
    const response = await axios.get(`${GATEWAY_URL}/branch-admin/queue/status/${testConfig.branchId}`, {
      headers: createHeaders()
    });
    console.log('✅ Branch Queue Status:', response.data);
  } catch (error) {
    console.log('⚠️  Branch Queue Status (Expected - endpoint may not exist yet):', error.message);
  }
}

async function testAppointmentWorkflow() {
  console.log('\n🔄 Testing Complete Appointment Workflow...');
  
  // 1. Create appointment
  const appointment = await testCreateAppointment();
  if (!appointment) return false;
  
  // 2. Update appointment status to confirmed
  try {
    const response = await axios.put(`${API_BASE_URL}/appointments/${appointment.id}/status`, {
      status: 'confirmed'
    }, {
      headers: createHeaders()
    });
    console.log('✅ Appointment Status Updated:', response.data);
  } catch (error) {
    console.log('❌ Update Appointment Status Failed:', error.response?.data || error.message);
  }
  
  // 3. Get appointment details
  try {
    const response = await axios.get(`${API_BASE_URL}/appointments/${appointment.id}`, {
      headers: createHeaders()
    });
    console.log('✅ Appointment Details Retrieved:', response.data);
  } catch (error) {
    console.log('❌ Get Appointment Details Failed:', error.response?.data || error.message);
  }
  
  return true;
}

// Main test execution
async function runIntegrationTests() {
  console.log('🚀 Starting Appointment Integration Tests...');
  console.log('=' .repeat(60));
  
  const results = {
    healthCheck: false,
    availableSlots: false,
    queueSummary: false,
    appointmentWorkflow: false,
    centralAdminIntegration: false,
    branchAdminIntegration: false
  };
  
  // Run tests
  results.healthCheck = await testAppointmentServiceHealth();
  results.availableSlots = await testGetAvailableSlots();
  results.queueSummary = await testGetQueueSummary();
  results.appointmentWorkflow = await testAppointmentWorkflow();
  
  // Test admin integrations (these may fail if endpoints don't exist yet)
  await testCentralAdminEndpoints();
  await testBranchAdminEndpoints();
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📋 TEST RESULTS SUMMARY:');
  console.log('=' .repeat(60));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📊 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All core appointment service tests passed!');
  } else {
    console.log('⚠️  Some tests failed - check service availability and configuration');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Ensure appointment-scheduling-service is running on port 8083');
  console.log('2. Ensure api-gateway is running on port 8080');
  console.log('3. Check database connectivity (MongoDB)');
  console.log('4. Verify JWT token configuration');
  console.log('5. Test frontend components in browser');
}

// Run the tests
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

module.exports = {
  runIntegrationTests,
  testConfig
};