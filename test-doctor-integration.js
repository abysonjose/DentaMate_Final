/**
 * Doctor Dashboard Integration Test
 * Tests the integration between doctor module and backend services
 */

const axios = require('axios');

// Configuration
const config = {
  appointmentService: 'http://localhost:8083/appointment-service/api/v1',
  tokenQueueService: 'http://localhost:3005/api',
  patientService: 'http://localhost:3001/api/v1', // Assuming patient service port
  authToken: 'your-jwt-token-here',
  tenantId: 'tenant001',
  userId: 'doctor001',
  doctorId: 'doctor001',
  branchId: 'branch001',
  patientId: 'patient001'
};

// Helper function to create headers
function getHeaders() {
  return {
    'Authorization': `Bearer ${config.authToken}`,
    'X-Tenant-ID': config.tenantId,
    'X-User-ID': config.userId,
    'Content-Type': 'application/json'
  };
}

// Test functions
async function testAppointmentServiceIntegration() {
  console.log('\n🔍 Testing Appointment Service Integration...');
  
  try {
    // Test 1: Get today's appointments for doctor
    console.log('📅 Testing: Get today\'s appointments');
    const todayResponse = await axios.get(
      `${config.appointmentService}/appointments/doctor/${config.doctorId}/today`,
      { headers: getHeaders() }
    );
    console.log('✅ Today\'s appointments:', todayResponse.data?.length || 0, 'appointments');

    // Test 2: Get available slots
    console.log('🕐 Testing: Get available slots');
    const today = new Date().toISOString().split('T')[0];
    const slotsResponse = await axios.get(
      `${config.appointmentService}/schedules/doctor/${config.doctorId}/slots?date=${today}&duration=30`,
      { headers: getHeaders() }
    );
    console.log('✅ Available slots:', slotsResponse.data?.availableSlots?.length || 0, 'slots');

    // Test 3: Get appointment details
    if (todayResponse.data && todayResponse.data.length > 0) {
      const appointmentId = todayResponse.data[0].id;
      console.log('📋 Testing: Get appointment details');
      const appointmentResponse = await axios.get(
        `${config.appointmentService}/appointments/${appointmentId}`,
        { headers: getHeaders() }
      );
      console.log('✅ Appointment details loaded for ID:', appointmentId);
    }

    return true;
  } catch (error) {
    console.error('❌ Appointment Service Integration Error:', error.message);
    return false;
  }
}

async function testTokenQueueServiceIntegration() {
  console.log('\n🎫 Testing Token Queue Service Integration...');
  
  try {
    // Test 1: Get queue status
    console.log('📊 Testing: Get queue status');
    const queueResponse = await axios.get(
      `${config.tokenQueueService}/queues/${config.branchId}/${config.doctorId}`,
      { headers: getHeaders() }
    );
    console.log('✅ Queue status:', queueResponse.data?.success ? 'Active' : 'Error');

    // Test 2: Get branch queues
    console.log('🏢 Testing: Get branch queues');
    const branchQueuesResponse = await axios.get(
      `${config.tokenQueueService}/queues/branch/${config.branchId}`,
      { headers: getHeaders() }
    );
    console.log('✅ Branch queues:', branchQueuesResponse.data?.data?.length || 0, 'queues');

    // Test 3: Generate a test token (if needed)
    console.log('🎟️ Testing: Generate token');
    const tokenData = {
      patientId: config.patientId,
      patientName: 'Test Patient',
      patientPhone: '1234567890',
      doctorId: config.doctorId,
      doctorName: 'Dr. Test',
      departmentId: 'dept001',
      departmentName: 'General Dentistry',
      branchId: config.branchId,
      tenantId: config.tenantId,
      tokenType: 'APPOINTMENT'
    };

    const tokenResponse = await axios.post(
      `${config.tokenQueueService}/tokens/generate`,
      tokenData,
      { headers: getHeaders() }
    );
    console.log('✅ Token generated:', tokenResponse.data?.data?.displayToken || 'Success');

    return true;
  } catch (error) {
    console.error('❌ Token Queue Service Integration Error:', error.message);
    return false;
  }
}

async function testPatientServiceIntegration() {
  console.log('\n👤 Testing Patient Service Integration...');
  
  try {
    // Test 1: Get patient profile
    console.log('📝 Testing: Get patient profile');
    const patientResponse = await axios.get(
      `${config.patientService}/patients/${config.patientId}`,
      { headers: getHeaders() }
    );
    console.log('✅ Patient profile loaded:', patientResponse.data?.firstName || 'Success');

    // Test 2: Search patients
    console.log('🔍 Testing: Search patients');
    const searchResponse = await axios.get(
      `${config.patientService}/patients/search?q=test`,
      { headers: getHeaders() }
    );
    console.log('✅ Patient search results:', searchResponse.data?.length || 0, 'patients');

    // Test 3: Get patient statistics
    console.log('📊 Testing: Get patient statistics');
    const statsResponse = await axios.get(
      `${config.patientService}/patients/${config.patientId}/stats`,
      { headers: getHeaders() }
    );
    console.log('✅ Patient stats loaded:', statsResponse.data ? 'Success' : 'No data');

    return true;
  } catch (error) {
    console.error('❌ Patient Service Integration Error:', error.message);
    return false;
  }
}

async function testCrossServiceIntegration() {
  console.log('\n🔗 Testing Cross-Service Integration...');
  
  try {
    // Test 1: Appointment to Token linking
    console.log('🔗 Testing: Appointment-Token linking');
    
    // Get today's appointments
    const appointmentsResponse = await axios.get(
      `${config.appointmentService}/appointments/doctor/${config.doctorId}/today`,
      { headers: getHeaders() }
    );

    // Get queue tokens
    const queueResponse = await axios.get(
      `${config.tokenQueueService}/queues/${config.branchId}/${config.doctorId}`,
      { headers: getHeaders() }
    );

    const appointments = appointmentsResponse.data || [];
    const tokens = queueResponse.data?.data?.tokens || [];

    console.log('✅ Cross-reference check:');
    console.log(`   - Appointments: ${appointments.length}`);
    console.log(`   - Tokens: ${tokens.length}`);

    // Check if appointments have corresponding tokens
    let linkedCount = 0;
    appointments.forEach(apt => {
      const hasToken = tokens.some(token => token.appointmentId === apt.id);
      if (hasToken) linkedCount++;
    });

    console.log(`   - Linked appointments: ${linkedCount}/${appointments.length}`);

    return true;
  } catch (error) {
    console.error('❌ Cross-Service Integration Error:', error.message);
    return false;
  }
}

async function testWebSocketConnection() {
  console.log('\n🌐 Testing WebSocket Connection...');
  
  try {
    const io = require('socket.io-client');
    
    const socket = io(config.tokenQueueService.replace('/api', ''), {
      auth: {
        token: config.authToken
      }
    });

    return new Promise((resolve) => {
      socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully');
        
        // Join doctor queue room
        socket.emit('join-queue', {
          branchId: config.branchId,
          doctorId: config.doctorId,
          queueType: 'doctor'
        });

        console.log('✅ Joined doctor queue room');
        
        socket.disconnect();
        resolve(true);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error.message);
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        console.error('❌ WebSocket connection timeout');
        socket.disconnect();
        resolve(false);
      }, 5000);
    });
  } catch (error) {
    console.error('❌ WebSocket Test Error:', error.message);
    return false;
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('🚀 Starting Doctor Dashboard Integration Tests...');
  console.log('=' .repeat(60));

  const results = {
    appointmentService: false,
    tokenQueueService: false,
    patientService: false,
    crossService: false,
    webSocket: false
  };

  // Run all tests
  results.appointmentService = await testAppointmentServiceIntegration();
  results.tokenQueueService = await testTokenQueueServiceIntegration();
  results.patientService = await testPatientServiceIntegration();
  results.crossService = await testCrossServiceIntegration();
  results.webSocket = await testWebSocketConnection();

  // Summary
  console.log('\n📊 Integration Test Results:');
  console.log('=' .repeat(60));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
  });

  console.log('\n' + '=' .repeat(60));
  console.log(`🎯 Overall Result: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All integration tests passed! Doctor dashboard is ready.');
  } else {
    console.log('⚠️  Some integration tests failed. Please check the services.');
  }

  return passed === total;
}

// Configuration validation
function validateConfiguration() {
  console.log('🔧 Validating configuration...');
  
  const required = ['authToken', 'tenantId', 'userId', 'doctorId', 'branchId', 'patientId'];
  const missing = required.filter(key => !config[key] || config[key] === 'your-jwt-token-here');
  
  if (missing.length > 0) {
    console.error('❌ Missing configuration:', missing.join(', '));
    console.log('\n📝 Please update the config object with valid values:');
    missing.forEach(key => {
      console.log(`   - ${key}: ${config[key] || 'undefined'}`);
    });
    return false;
  }
  
  console.log('✅ Configuration validated');
  return true;
}

// Run tests if configuration is valid
if (validateConfiguration()) {
  runIntegrationTests().catch(console.error);
} else {
  console.log('\n⚠️  Please update the configuration and run the tests again.');
}

module.exports = {
  runIntegrationTests,
  testAppointmentServiceIntegration,
  testTokenQueueServiceIntegration,
  testPatientServiceIntegration,
  testCrossServiceIntegration,
  testWebSocketConnection
};