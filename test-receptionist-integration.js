const axios = require('axios');
const WebSocket = require('ws');

// Test configuration
const config = {
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3001',
  testBranchId: 'branch-test-001',
  testUserId: 'receptionist-test-001'
};

// Test data
const testPatient = {
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+1234567890',
  email: 'john.doe@test.com',
  dateOfBirth: '1990-01-01',
  gender: 'male'
};

const testAppointment = {
  patientId: '',
  doctorId: 'doctor-001',
  appointmentDate: new Date().toISOString().split('T')[0],
  startTime: '10:00',
  duration: 30,
  type: 'consultation'
};

class ReceptionistIntegrationTest {
  constructor() {
    this.ws = null;
    this.authToken = null;
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Receptionist Integration Tests...\n');
    
    try {
      await this.authenticate();
      await this.connectWebSocket();
      
      // Core functionality tests
      await this.testPatientRegistration();
      await this.testAppointmentBooking();
      await this.testCheckInProcess();
      await this.testTokenGeneration();
      await this.testQueueManagement();
      
      // Integration tests
      await this.testAppointmentServiceIntegration();
      await this.testTokenQueueServiceIntegration();
      await this.testDoctorModuleIntegration();
      await this.testPatientModuleIntegration();
      await this.testBranchAdminIntegration();
      await this.testHeadNurseIntegration();
      
      // Real-time tests
      await this.testRealTimeUpdates();
      await this.testCrossModuleEvents();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    } finally {
      if (this.ws) {
        this.ws.close();
      }
    }
  }

  async authenticate() {
    console.log('🔐 Authenticating...');
    try {
      const response = await axios.post(`${config.apiUrl}/auth/login`, {
        username: 'receptionist@test.com',
        password: 'test123',
        role: 'receptionist'
      });
      
      this.authToken = response.data.token;
      this.addResult('Authentication', true, 'Successfully authenticated');
    } catch (error) {
      this.addResult('Authentication', false, error.message);
      throw error;
    }
  }

  async connectWebSocket() {
    console.log('🔌 Connecting to WebSocket...');
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${config.wsUrl}?token=${this.authToken}&role=receptionist&branchId=${config.testBranchId}`);
      
      this.ws.on('open', () => {
        this.addResult('WebSocket Connection', true, 'Connected successfully');
        resolve();
      });
      
      this.ws.on('error', (error) => {
        this.addResult('WebSocket Connection', false, error.message);
        reject(error);
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('📨 WebSocket message:', message.type);
      });
    });
  }

  async testPatientRegistration() {
    console.log('👤 Testing Patient Registration...');
    try {
      const response = await axios.post(`${config.apiUrl}/patients/register`, testPatient, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      testAppointment.patientId = response.data.id;
      this.addResult('Patient Registration', true, `Patient registered with ID: ${response.data.id}`);
    } catch (error) {
      this.addResult('Patient Registration', false, error.message);
    }
  }

  async testAppointmentBooking() {
    console.log('📅 Testing Appointment Booking...');
    try {
      const response = await axios.post(`${config.apiUrl}/appointments`, testAppointment, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.testAppointmentId = response.data.id;
      this.addResult('Appointment Booking', true, `Appointment created with ID: ${response.data.id}`);
    } catch (error) {
      this.addResult('Appointment Booking', false, error.message);
    }
  }

  async testCheckInProcess() {
    console.log('✅ Testing Check-In Process...');
    try {
      const response = await axios.post(`${config.apiUrl}/check-in/manual`, {
        patientId: testAppointment.patientId,
        appointmentId: this.testAppointmentId,
        checkInMethod: 'manual',
        branchId: config.testBranchId
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.testCheckInId = response.data.checkInId;
      this.addResult('Check-In Process', true, `Patient checked in successfully`);
    } catch (error) {
      this.addResult('Check-In Process', false, error.message);
    }
  }

  async testTokenGeneration() {
    console.log('🎫 Testing Token Generation...');
    try {
      const response = await axios.post(`${config.apiUrl}/tokens/generate`, {
        patientId: testAppointment.patientId,
        appointmentId: this.testAppointmentId,
        priority: 'normal',
        type: 'appointment'
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.testTokenId = response.data.id;
      this.testTokenNumber = response.data.tokenNumber;
      this.addResult('Token Generation', true, `Token generated: ${response.data.tokenNumber}`);
    } catch (error) {
      this.addResult('Token Generation', false, error.message);
    }
  }

  async testQueueManagement() {
    console.log('🔄 Testing Queue Management...');
    try {
      const response = await axios.get(`${config.apiUrl}/queues/current`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.addResult('Queue Management', true, `Retrieved ${response.data.length} active queues`);
    } catch (error) {
      this.addResult('Queue Management', false, error.message);
    }
  }

  async testAppointmentServiceIntegration() {
    console.log('🔗 Testing Appointment Service Integration...');
    try {
      // Test appointment service status
      const statusResponse = await axios.get(`${config.apiUrl}/integration/appointment-service/status`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      // Test appointment sync
      const syncResponse = await axios.post(`${config.apiUrl}/integration/appointment-service/sync`, {
        branchId: config.testBranchId
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.addResult('Appointment Service Integration', true, 'Service integration working');
    } catch (error) {
      this.addResult('Appointment Service Integration', false, error.message);
    }
  }

  async testTokenQueueServiceIntegration() {
    console.log('🎯 Testing Token Queue Service Integration...');
    try {
      // Test token queue service status
      const statusResponse = await axios.get(`${config.apiUrl}/integration/token-queue-service/status`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      // Test queue sync
      const syncResponse = await axios.post(`${config.apiUrl}/integration/token-queue-service/sync`, {
        branchId: config.testBranchId
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.addResult('Token Queue Service Integration', true, 'Service integration working');
    } catch (error) {
      this.addResult('Token Queue Service Integration', false, error.message);
    }
  }

  async testDoctorModuleIntegration() {
    console.log('👨‍⚕️ Testing Doctor Module Integration...');
    try {
      // Get doctor statuses
      const statusResponse = await axios.get(`${config.apiUrl}/integration/doctor-status`, {
        params: { branchId: config.testBranchId },
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      // Notify doctor of patient arrival
      const notifyResponse = await axios.post(`${config.apiUrl}/integration/notify-doctor`, {
        doctorId: testAppointment.doctorId,
        type: 'patient_arrival',
        data: { patientId: testAppointment.patientId }
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.addResult('Doctor Module Integration', true, 'Doctor integration working');
    } catch (error) {
      this.addResult('Doctor Module Integration', false, error.message);
    }
  }

  async testPatientModuleIntegration() {
    console.log('🤒 Testing Patient Module Integration...');
    try {
      // Get patient statuses
      const statusResponse = await axios.get(`${config.apiUrl}/integration/patient-status`, {
        params: { branchId: config.testBranchId },
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      // Update patient status
      const updateResponse = await axios.patch(`${config.apiUrl}/integration/patient-status/${testAppointment.patientId}`, {
        status: 'checked_in',
        location: 'Waiting Area',
        updatedBy: 'receptionist'
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      // Notify patient
      const notifyResponse = await axios.post(`${config.apiUrl}/integration/notify-patient`, {
        patientId: testAppointment.patientId,
        message: 'You have been checked in successfully',
        type: 'check_in_confirmation',
        source: 'receptionist'
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.addResult('Patient Module Integration', true, 'Patient integration working');
    } catch (error) {
      this.addResult('Patient Module Integration', false, error.message);
    }
  }

  async testBranchAdminIntegration() {
    console.log('🏢 Testing Branch Admin Integration...');
    try {
      // Report to branch admin
      const reportResponse = await axios.post(`${config.apiUrl}/integration/branch-admin/report`, {
        type: 'new_patient_registration',
        data: {
          patientId: testAppointment.patientId,
          registeredAt: new Date()
        },
        reportedBy: 'receptionist',
        timestamp: new Date()
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      // Get branch policies
      const policiesResponse = await axios.get(`${config.apiUrl}/integration/branch-policies`, {
        params: { branchId: config.testBranchId },
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.addResult('Branch Admin Integration', true, 'Branch admin integration working');
    } catch (error) {
      this.addResult('Branch Admin Integration', false, error.message);
    }
  }

  async testHeadNurseIntegration() {
    console.log('👩‍⚕️ Testing Head Nurse Integration...');
    try {
      // Request nurse assistance
      const assistanceResponse = await axios.post(`${config.apiUrl}/integration/nurse-assistance-request`, {
        patientId: testAppointment.patientId,
        assistanceType: 'patient_preparation',
        priority: 'normal',
        requestedBy: 'receptionist',
        timestamp: new Date()
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      // Get nurse availability
      const availabilityResponse = await axios.get(`${config.apiUrl}/integration/nurse-availability`, {
        params: { branchId: config.testBranchId },
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.addResult('Head Nurse Integration', true, 'Head nurse integration working');
    } catch (error) {
      this.addResult('Head Nurse Integration', false, error.message);
    }
  }

  async testRealTimeUpdates() {
    console.log('⚡ Testing Real-Time Updates...');
    return new Promise((resolve) => {
      let updateReceived = false;
      
      // Listen for real-time updates
      this.ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'queue_update' || message.type === 'appointment_update') {
          updateReceived = true;
          this.addResult('Real-Time Updates', true, `Received ${message.type}`);
          resolve();
        }
      });
      
      // Trigger an update
      axios.patch(`${config.apiUrl}/tokens/${this.testTokenId}/call`, {}, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (!updateReceived) {
          this.addResult('Real-Time Updates', false, 'No real-time updates received');
        }
        resolve();
      }, 5000);
    });
  }

  async testCrossModuleEvents() {
    console.log('🔄 Testing Cross-Module Events...');
    return new Promise((resolve) => {
      let eventReceived = false;
      
      // Listen for cross-module events
      this.ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'cross_module_event') {
          eventReceived = true;
          this.addResult('Cross-Module Events', true, `Received event: ${message.data.type}`);
          resolve();
        }
      });
      
      // Send a cross-module event
      this.ws.send(JSON.stringify({
        type: 'broadcast_event',
        data: {
          type: 'appointment_created',
          source: 'receptionist',
          target: ['doctor', 'patient'],
          data: { appointmentId: this.testAppointmentId },
          timestamp: new Date(),
          branchId: config.testBranchId
        }
      }));
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (!eventReceived) {
          this.addResult('Cross-Module Events', false, 'No cross-module events received');
        }
        resolve();
      }, 5000);
    });
  }

  addResult(testName, success, message) {
    this.testResults.push({
      test: testName,
      success,
      message,
      timestamp: new Date()
    });
    
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => r.success === false).length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.success === false)
        .forEach(r => {
          console.log(`  - ${r.test}: ${r.message}`);
        });
    }
    
    console.log('\n🎉 Integration testing completed!');
  }
}

// Run tests
const tester = new ReceptionistIntegrationTest();
tester.runAllTests().catch(console.error);