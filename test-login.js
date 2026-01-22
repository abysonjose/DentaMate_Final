// Test script to verify login functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Test login credentials
const testCredentials = {
  email: 'test@demo.com',
  password: 'password123',
  tenantId: '1'
};

async function testLogin() {
  try {
    console.log('Testing DentaMate Login API...');
    console.log('Credentials:', testCredentials);
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, testCredentials);
    
    console.log('✅ Login successful!');
    console.log('Response:', {
      success: response.data.success,
      user: response.data.user,
      hasTokens: !!response.data.tokens
    });
    
    return response.data;
  } catch (error) {
    console.log('❌ Login failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Network error:', error.message);
    }
    return null;
  }
}

async function testTenants() {
  try {
    console.log('\nTesting Tenants API...');
    const response = await axios.get(`${API_BASE_URL}/tenants`);
    console.log('✅ Tenants loaded:', response.data);
  } catch (error) {
    console.log('❌ Tenants API failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testLogin();
  await testTenants();
}

if (require.main === module) {
  runTests();
}

module.exports = { testLogin, testTenants };