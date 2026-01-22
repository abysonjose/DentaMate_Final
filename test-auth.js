const axios = require('axios');

// Test configuration
const API_BASE = 'http://localhost:3000/api';
const AUTH_BASE = 'http://localhost:3001';

// Test data
const testUser = {
  email: 'test@demo.com',
  password: 'password123',
  firstName: 'Test',
  lastName: 'User',
  role: 'patient',
  tenantId: '1'
};

async function testServices() {
  console.log('🚀 Testing DentaMate Services with Latest Versions...\n');

  try {
    // Test 1: Check if services are running
    console.log('1. Testing service health...');
    
    try {
      const apiGatewayHealth = await axios.get(`${API_BASE}/health`);
      console.log('✅ API Gateway (Node.js 22 + Express 5):', apiGatewayHealth.data);
    } catch (error) {
      console.log('❌ API Gateway not responding');
    }

    try {
      const authHealth = await axios.get(`${AUTH_BASE}/health`);
      console.log('✅ Auth Service (Node.js 22 + Express 5):', authHealth.data);
    } catch (error) {
      console.log('❌ Auth Service not responding');
    }

    // Test 2: Register a new user
    console.log('\n2. Testing user registration...');
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
      console.log('✅ User registration successful:', {
        success: registerResponse.data.success,
        userId: registerResponse.data.user.id,
        role: registerResponse.data.user.role
      });
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  User already exists, proceeding with login test...');
      } else {
        console.log('❌ Registration failed:', error.response?.data || error.message);
      }
    }

    // Test 3: Login with the user
    console.log('\n3. Testing user login...');
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: testUser.password,
        tenantId: testUser.tenantId
      });
      
      console.log('✅ Login successful:', {
        success: loginResponse.data.success,
        user: loginResponse.data.user.firstName + ' ' + loginResponse.data.user.lastName,
        role: loginResponse.data.user.role,
        hasTokens: !!loginResponse.data.tokens
      });

      // Test 4: Test token refresh
      console.log('\n4. Testing token refresh...');
      try {
        const refreshResponse = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken: loginResponse.data.tokens.refreshToken
        });
        console.log('✅ Token refresh successful');
      } catch (error) {
        console.log('❌ Token refresh failed:', error.response?.data || error.message);
      }

    } catch (error) {
      console.log('❌ Login failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 Authentication system test completed!');
    console.log('\n📋 System Status:');
    console.log('- Node.js: v22.x (Latest LTS)');
    console.log('- Express: v5.x (Latest)');
    console.log('- MongoDB: v7.0 (Latest)');
    console.log('- Python: v3.12 (Latest)');
    console.log('- Angular: v18.x (Stable)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testServices();