const axios = require('axios');
const io = require('socket.io-client');

// Test configuration
const API_BASE_URL = 'http://localhost:3005/api';
const SOCKET_URL = 'http://localhost:3005';

// Mock JWT token (replace with actual token in real testing)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LWRvY3RvciIsInVzZXJOYW1lIjoiRHIuIFRlc3QiLCJ1c2VyUm9sZSI6IkRPQ1RPUiIsInRlbmFudElkIjoidGVzdC10ZW5hbnQiLCJicmFuY2hJZCI6InRlc3QtYnJhbmNoIiwiaWF0IjoxNjM5NTg0MDAwLCJleHAiOjE2Mzk2NzA0MDB9.test';

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testTokenQueueService() {
  console.log('🧪 Testing Token Queue Realtime Service Integration\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${SOCKET_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data);

    // Test 2: Generate Token
    console.log('\n2. Testing Token Generation...');
    const tokenData = {
      patientId: 'test-patient-001',
      patientName: 'John Doe',
      patientPhone: '+1234567890',
      doctorId: 'test-doctor',
      doctorName: 'Dr. Test',
      departmentId: 'dental-dept',
      departmentName: 'Dental Department',
      branchId: 'test-branch',
      tenantId: 'test-tenant',
      tokenType: 'WALK_IN'
    };

    try {
      const tokenResponse = await axios.post(`${API_BASE_URL}/tokens/generate`, tokenData, { headers });
      console.log('✅ Token Generated:', {
        tokenNumber: tokenResponse.data.data.tokenNumber,
        displayToken: tokenResponse.data.data.displayToken,
        status: tokenResponse.data.data.status
      });
    } catch (error) {
      console.log('❌ Token Generation Failed:', error.response?.data?.message || error.message);
    }

    // Test 3: Get Queue Status
    console.log('\n3. Testing Queue Status...');
    try {
      const queueResponse = await axios.get(`${API_BASE_URL}/queues/test-branch/test-doctor`, { headers });
      console.log('✅ Queue Status Retrieved:', {
        queueLength: queueResponse.data.data.queueLength,
        status: queueResponse.data.data.queue.status
      });
    } catch (error) {
      console.log('❌ Queue Status Failed:', error.response?.data?.message || error.message);
    }

    // Test 4: WebSocket Connection
    console.log('\n4. Testing WebSocket Connection...');
    const socket = io(SOCKET_URL, {
      auth: {
        token: TEST_TOKEN
      }
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket Connected');
      
      // Join queue room
      socket.emit('join-queue', {
        branchId: 'test-branch',
        doctorId: 'test-doctor',
        queueType: 'doctor'
      });
    });

    socket.on('queue-status', (data) => {
      console.log('✅ Queue Status Received via WebSocket:', {
        queueLength: data.queueLength,
        estimatedWaitTime: data.estimatedWaitTime
      });
    });

    socket.on('error', (error) => {
      console.log('❌ WebSocket Error:', error.message);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket Connection Error:', error.message);
    });

    // Test 5: Check-in Validation
    console.log('\n5. Testing Check-in Validation...');
    const checkinData = {
      tokenId: 'test-token-id',
      branchId: 'test-branch',
      doctorId: 'test-doctor',
      patientId: 'test-patient-001'
    };

    try {
      const validationResponse = await axios.post(`${API_BASE_URL}/checkin/validate`, checkinData, { headers });
      console.log('✅ Check-in Validation:', validationResponse.data.data);
    } catch (error) {
      console.log('❌ Check-in Validation Failed:', error.response?.data?.message || error.message);
    }

    // Test 6: Analytics
    console.log('\n6. Testing Analytics...');
    try {
      const analyticsResponse = await axios.get(`${API_BASE_URL}/analytics/branch/test-branch`, { headers });
      console.log('✅ Analytics Retrieved:', analyticsResponse.data.data);
    } catch (error) {
      console.log('❌ Analytics Failed:', error.response?.data?.message || error.message);
    }

    // Clean up
    setTimeout(() => {
      socket.disconnect();
      console.log('\n🏁 Test completed. WebSocket disconnected.');
    }, 3000);

  } catch (error) {
    console.error('❌ Test Suite Failed:', error.message);
  }
}

// Integration test with appointment service
async function testAppointmentIntegration() {
  console.log('\n🔗 Testing Appointment Service Integration\n');

  try {
    // Test appointment-based token generation
    const appointmentTokenData = {
      patientId: 'test-patient-002',
      patientName: 'Jane Smith',
      patientPhone: '+1234567891',
      doctorId: 'test-doctor',
      doctorName: 'Dr. Test',
      departmentId: 'dental-dept',
      departmentName: 'Dental Department',
      branchId: 'test-branch',
      tenantId: 'test-tenant',
      tokenType: 'APPOINTMENT',
      appointmentId: 'test-appointment-001',
      scheduledTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    };

    const tokenResponse = await axios.post(`${API_BASE_URL}/tokens/generate`, appointmentTokenData, { headers });
    console.log('✅ Appointment Token Generated:', {
      tokenNumber: tokenResponse.data.data.tokenNumber,
      appointmentId: tokenResponse.data.data.appointmentId,
      scheduledTime: tokenResponse.data.data.scheduledTime
    });

  } catch (error) {
    console.log('❌ Appointment Integration Failed:', error.response?.data?.message || error.message);
  }
}

// Run tests
if (require.main === module) {
  testTokenQueueService()
    .then(() => testAppointmentIntegration())
    .catch(console.error);
}

module.exports = {
  testTokenQueueService,
  testAppointmentIntegration
};