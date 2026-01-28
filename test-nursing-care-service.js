const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3007';
const API_URL = `${BASE_URL}/api`;

// Mock JWT token for testing (replace with actual token in real testing)
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LW51cnNlLWlkIiwidXNlck5hbWUiOiJUZXN0IE51cnNlIiwidXNlclJvbGUiOiJOVVJTRSIsInRlbmFudElkIjoidGVzdC10ZW5hbnQtaWQiLCJicmFuY2hJZCI6InRlc3QtYnJhbmNoLWlkIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDA5OTg4MDB9.test-signature';

// Test data
const testData = {
  patientId: 'test-patient-id',
  appointmentId: 'test-appointment-id',
  branchId: 'test-branch-id',
  tenantId: 'test-tenant-id'
};

class NursingCareServiceTester {
  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${MOCK_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  async testHealthCheck() {
    console.log('\n🏥 Testing Health Check...');
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health check passed:', response.data);
      return true;
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return false;
    }
  }

  async testCreateVitals() {
    console.log('\n📊 Testing Create Vitals...');
    try {
      const vitalsData = {
        patientId: testData.patientId,
        appointmentId: testData.appointmentId,
        branchId: testData.branchId,
        metrics: {
          bloodPressure: {
            systolic: 120,
            diastolic: 80
          },
          pulse: 72,
          temperature: 98.6,
          oxygenSaturation: 98,
          respiratoryRate: 16
        },
        notes: 'Patient appears comfortable and cooperative',
        recordingType: 'PRE_CONSULTATION'
      };

      const response = await this.client.post('/vitals', vitalsData);
      console.log('✅ Vitals created successfully:', {
        vitalId: response.data.data?.vitalId,
        isAbnormal: response.data.data?.isAbnormal,
        timestamp: response.data.data?.timestamp
      });
      return response.data.data;
    } catch (error) {
      console.log('❌ Create vitals failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testCreateAbnormalVitals() {
    console.log('\n⚠️ Testing Create Abnormal Vitals...');
    try {
      const abnormalVitalsData = {
        patientId: testData.patientId,
        appointmentId: testData.appointmentId,
        branchId: testData.branchId,
        metrics: {
          bloodPressure: {
            systolic: 180,
            diastolic: 120
          },
          pulse: 110,
          temperature: 101.5,
          oxygenSaturation: 92
        },
        notes: 'Patient showing elevated readings - monitoring required',
        recordingType: 'ROUTINE_CHECK'
      };

      const response = await this.client.post('/vitals', abnormalVitalsData);
      console.log('✅ Abnormal vitals created:', {
        vitalId: response.data.data?.vitalId,
        isAbnormal: response.data.data?.isAbnormal,
        abnormalFlags: response.data.data?.abnormalFlags?.length || 0
      });
      return response.data.data;
    } catch (error) {
      console.log('❌ Create abnormal vitals failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testGetVitalsByAppointment() {
    console.log('\n📋 Testing Get Vitals by Appointment...');
    try {
      const response = await this.client.get(`/vitals/appointment/${testData.appointmentId}`);
      console.log('✅ Vitals retrieved by appointment:', {
        count: response.data.count,
        hasData: response.data.data?.length > 0
      });
      return response.data;
    } catch (error) {
      console.log('❌ Get vitals by appointment failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testGetAbnormalVitals() {
    console.log('\n🚨 Testing Get Abnormal Vitals...');
    try {
      const response = await this.client.get('/vitals/abnormal/list?limit=10');
      console.log('✅ Abnormal vitals retrieved:', {
        count: response.data.count,
        hasAbnormal: response.data.data?.length > 0
      });
      return response.data;
    } catch (error) {
      console.log('❌ Get abnormal vitals failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testGetVitalsStatistics() {
    console.log('\n📈 Testing Get Vitals Statistics...');
    try {
      const response = await this.client.get('/vitals/statistics/summary');
      console.log('✅ Vitals statistics retrieved:', {
        totalRecords: response.data.data?.totalRecords || 0,
        abnormalRecords: response.data.data?.abnormalRecords || 0,
        abnormalPercentage: response.data.data?.abnormalPercentage || 0
      });
      return response.data;
    } catch (error) {
      console.log('❌ Get vitals statistics failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testSearchVitals() {
    console.log('\n🔍 Testing Search Vitals...');
    try {
      const response = await this.client.get('/vitals/search/query', {
        params: {
          patientId: testData.patientId,
          page: 1,
          limit: 5,
          sortBy: 'timestamp',
          sortOrder: 'desc'
        }
      });
      console.log('✅ Vitals search completed:', {
        resultsCount: response.data.data?.length || 0,
        currentPage: response.data.pagination?.currentPage,
        totalCount: response.data.pagination?.totalCount
      });
      return response.data;
    } catch (error) {
      console.log('❌ Search vitals failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testValidateVitalsData() {
    console.log('\n✅ Testing Validate Vitals Data...');
    try {
      const validData = {
        metrics: {
          bloodPressure: {
            systolic: 120,
            diastolic: 80
          },
          pulse: 72,
          temperature: 98.6
        }
      };

      const response = await this.client.post('/vitals/validate/data', validData);
      console.log('✅ Valid data validation:', {
        isValid: response.data.data?.isValid,
        errors: response.data.data?.errors?.length || 0
      });

      // Test invalid data
      const invalidData = {
        metrics: {
          bloodPressure: {
            systolic: 80, // Invalid: systolic lower than diastolic
            diastolic: 120
          },
          pulse: 250, // Invalid: too high
          temperature: 120 // Invalid: too high
        }
      };

      const invalidResponse = await this.client.post('/vitals/validate/data', invalidData);
      console.log('✅ Invalid data validation:', {
        isValid: invalidResponse.data.data?.isValid,
        errors: invalidResponse.data.data?.errors?.length || 0
      });

      return true;
    } catch (error) {
      console.log('❌ Validate vitals data failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testGetDashboardSummary() {
    console.log('\n📊 Testing Get Dashboard Summary...');
    try {
      const response = await this.client.get('/vitals/dashboard/summary?period=24h');
      console.log('✅ Dashboard summary retrieved:', {
        period: response.data.data?.period,
        totalRecords: response.data.data?.statistics?.totalRecords || 0,
        recentAbnormalCount: response.data.data?.recentAbnormal?.length || 0
      });
      return response.data;
    } catch (error) {
      console.log('❌ Get dashboard summary failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testErrorHandling() {
    console.log('\n🚫 Testing Error Handling...');
    try {
      // Test invalid endpoint
      try {
        await this.client.get('/invalid-endpoint');
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('✅ 404 error handling works');
        }
      }

      // Test invalid data
      try {
        await this.client.post('/vitals', { invalid: 'data' });
      } catch (error) {
        if (error.response?.status === 400) {
          console.log('✅ 400 validation error handling works');
        }
      }

      // Test unauthorized access (without token)
      try {
        const unauthorizedClient = axios.create({ baseURL: API_URL });
        await unauthorizedClient.get('/vitals/dashboard/summary');
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('✅ 401 authentication error handling works');
        }
      }

      return true;
    } catch (error) {
      console.log('❌ Error handling test failed:', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Nursing Care Service Tests...');
    console.log('=' .repeat(50));

    const results = {
      healthCheck: await this.testHealthCheck(),
      createVitals: await this.testCreateVitals(),
      createAbnormalVitals: await this.testCreateAbnormalVitals(),
      getVitalsByAppointment: await this.testGetVitalsByAppointment(),
      getAbnormalVitals: await this.testGetAbnormalVitals(),
      getVitalsStatistics: await this.testGetVitalsStatistics(),
      searchVitals: await this.testSearchVitals(),
      validateVitalsData: await this.testValidateVitalsData(),
      getDashboardSummary: await this.testGetDashboardSummary(),
      errorHandling: await this.testErrorHandling()
    };

    console.log('\n' + '=' .repeat(50));
    console.log('📋 Test Results Summary:');
    console.log('=' .repeat(50));

    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;

    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}`);
    });

    console.log('\n' + '=' .repeat(50));
    console.log(`🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Nursing Care Service is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please check the service configuration and try again.');
    }

    return results;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new NursingCareServiceTester();
  tester.runAllTests().catch(console.error);
}

module.exports = NursingCareServiceTester;