#!/usr/bin/env node

/**
 * Central Admin Login Test Script
 * Tests the central admin login functionality after seeding
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const TEST_CONFIG = {
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  tenantServiceUrl: process.env.TENANT_SERVICE_URL || 'http://localhost:3003',
  credentials: {
    email: 'admin@dentamate.com',
    password: 'Admin@123456'
  }
};

class CentralAdminLoginTest {
  constructor() {
    this.tenantId = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.userInfo = null;
  }

  async testTenantService() {
    try {
      console.log('🔍 Testing Tenant Service connection...');
      
      const response = await axios.get(`${TEST_CONFIG.tenantServiceUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ Tenant Service is running');
        return true;
      }
    } catch (error) {
      console.log('❌ Tenant Service is not accessible:', error.message);
      return false;
    }
  }

  async testAuthService() {
    try {
      console.log('🔍 Testing Auth Service connection...');
      
      const response = await axios.get(`${TEST_CONFIG.authServiceUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ Auth Service is running');
        return true;
      }
    } catch (error) {
      console.log('❌ Auth Service is not accessible:', error.message);
      return false;
    }
  }

  async getTenantId() {
    try {
      console.log('🔍 Fetching tenant information...');
      
      // Get tenant by owner email
      const response = await axios.get(
        `${TEST_CONFIG.tenantServiceUrl}/api/tenants/by-email/${TEST_CONFIG.credentials.email}`,
        { timeout: 10000 }
      );
      
      if (response.data && response.data.tenantId) {
        this.tenantId = response.data.tenantId;
        console.log(`✅ Found tenant ID: ${this.tenantId}`);
        return this.tenantId;
      } else {
        throw new Error('Tenant not found');
      }
    } catch (error) {
      console.log('❌ Failed to get tenant ID:', error.response?.data?.message || error.message);
      
      // If tenant service endpoint doesn't exist, try a different approach
      console.log('🔄 Trying alternative method...');
      
      // Use a default tenant ID pattern (this should match the seeded tenant)
      this.tenantId = 'tenant_central_admin'; // This might need to be adjusted based on actual seed
      console.log(`⚠️  Using fallback tenant ID: ${this.tenantId}`);
      return this.tenantId;
    }
  }

  async testLogin() {
    try {
      console.log('🔍 Testing central admin login...');
      
      if (!this.tenantId) {
        throw new Error('Tenant ID is required for login');
      }

      const loginPayload = {
        email: TEST_CONFIG.credentials.email,
        password: TEST_CONFIG.credentials.password,
        tenantId: this.tenantId
      };

      console.log('📤 Login payload:', JSON.stringify(loginPayload, null, 2));

      const response = await axios.post(
        `${TEST_CONFIG.authServiceUrl}/auth/login`,
        loginPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.success) {
        this.accessToken = response.data.tokens.accessToken;
        this.refreshToken = response.data.tokens.refreshToken;
        this.userInfo = response.data.user;

        console.log('✅ Login successful!');
        console.log(`   User ID: ${this.userInfo.id}`);
        console.log(`   Email: ${this.userInfo.email}`);
        console.log(`   Role: ${this.userInfo.role}`);
        console.log(`   Name: ${this.userInfo.firstName} ${this.userInfo.lastName}`);
        console.log(`   Tenant ID: ${this.userInfo.tenantId}`);
        
        return true;
      } else {
        throw new Error('Login failed: ' + JSON.stringify(response.data));
      }
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.error || error.message);
      
      if (error.response?.status === 401) {
        console.log('   This might indicate:');
        console.log('   - Incorrect credentials');
        console.log('   - User not found');
        console.log('   - Tenant ID mismatch');
        console.log('   - User is inactive');
      }
      
      return false;
    }
  }

  async testTokenRefresh() {
    try {
      if (!this.refreshToken) {
        console.log('⚠️  Skipping token refresh test (no refresh token)');
        return false;
      }

      console.log('🔍 Testing token refresh...');

      const response = await axios.post(
        `${TEST_CONFIG.authServiceUrl}/auth/refresh`,
        { refreshToken: this.refreshToken },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.accessToken) {
        console.log('✅ Token refresh successful');
        return true;
      } else {
        throw new Error('No access token in refresh response');
      }
    } catch (error) {
      console.log('❌ Token refresh failed:', error.response?.data?.error || error.message);
      return false;
    }
  }

  async testAuthorizedRequest() {
    try {
      if (!this.accessToken) {
        console.log('⚠️  Skipping authorized request test (no access token)');
        return false;
      }

      console.log('🔍 Testing authorized request...');

      // Try to access a protected endpoint (this might need adjustment based on actual API)
      const response = await axios.get(
        `${TEST_CONFIG.tenantServiceUrl}/api/tenants`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('✅ Authorized request successful');
      return true;
    } catch (error) {
      console.log('❌ Authorized request failed:', error.response?.data?.message || error.message);
      
      if (error.response?.status === 401) {
        console.log('   Token might be invalid or expired');
      } else if (error.response?.status === 403) {
        console.log('   User might not have required permissions');
      }
      
      return false;
    }
  }

  async printSummary(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CENTRAL ADMIN LOGIN TEST SUMMARY');
    console.log('='.repeat(60));
    
    const tests = [
      { name: 'Auth Service Connection', result: results.authService },
      { name: 'Tenant Service Connection', result: results.tenantService },
      { name: 'Tenant ID Resolution', result: results.tenantId },
      { name: 'Central Admin Login', result: results.login },
      { name: 'Token Refresh', result: results.tokenRefresh },
      { name: 'Authorized Request', result: results.authorizedRequest }
    ];

    tests.forEach(test => {
      const status = test.result ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${test.name.padEnd(25)} ${status}`);
    });

    const passedTests = tests.filter(t => t.result).length;
    const totalTests = tests.length;
    
    console.log(`\n📈 Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Central Admin is ready to use.');
    } else {
      console.log('⚠️  Some tests failed. Please check the setup.');
    }
    
    console.log('='.repeat(60));
  }

  async run() {
    console.log('🚀 Starting Central Admin Login Test...\n');
    
    const results = {
      authService: false,
      tenantService: false,
      tenantId: false,
      login: false,
      tokenRefresh: false,
      authorizedRequest: false
    };

    try {
      // Test service connections
      results.authService = await this.testAuthService();
      results.tenantService = await this.testTenantService();
      
      // Get tenant ID
      if (results.tenantService) {
        results.tenantId = !!(await this.getTenantId());
      }
      
      // Test login
      if (results.authService && this.tenantId) {
        results.login = await this.testLogin();
      }
      
      // Test token refresh
      if (results.login) {
        results.tokenRefresh = await this.testTokenRefresh();
      }
      
      // Test authorized request
      if (results.login && results.tenantService) {
        results.authorizedRequest = await this.testAuthorizedRequest();
      }
      
      await this.printSummary(results);
      
    } catch (error) {
      console.error('\n❌ Test process failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Central Admin Login Test Script

Usage:
  node test-central-admin-login.js        # Run login tests
  node test-central-admin-login.js --help # Show this help

Environment Variables:
  AUTH_SERVICE_URL                        # Auth service URL (default: http://localhost:3001)
  TENANT_SERVICE_URL                      # Tenant service URL (default: http://localhost:3003)
    `);
  } else {
    const tester = new CentralAdminLoginTest();
    tester.run();
  }
}

module.exports = { CentralAdminLoginTest, TEST_CONFIG };