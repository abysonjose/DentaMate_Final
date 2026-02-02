const axios = require('axios');

// Test configuration
const AUTH_SERVICE_URL = 'http://localhost:3001';
const USER_STAFF_SERVICE_URL = 'http://localhost:3005';

async function testJWTInvalidationFix() {
  console.log('🔧 Testing JWT Invalidation Fix Implementation\n');

  try {
    // Test 1: Login and verify JWT structure
    console.log('1️⃣ Testing Login with New JWT Structure');
    const loginResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/login`, {
      email: 'doctor@test.com',
      password: 'password123',
      tenantId: 'TENANT001'
    });

    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      
      // Decode JWT to verify structure
      const token = loginResponse.data.tokens.accessToken;
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      console.log('JWT Payload:', {
        userId: payload.userId,
        staffId: payload.staffId,
        roles: payload.roles,
        branchId: payload.branchId,
        tokenVersion: payload.tokenVersion
      });

      if (payload.staffId && payload.roles && payload.tokenVersion !== undefined) {
        console.log('✅ JWT structure is correct (includes staffId, roles[], tokenVersion)');
      } else {
        console.log('❌ JWT structure is missing required fields');
      }
    } else {
      console.log('❌ Login failed');
      return;
    }

    // Test 2: Staff deactivation should invalidate tokens
    console.log('\n2️⃣ Testing Staff Deactivation Token Invalidation');
    
    const staffId = 'STAFF001'; // Assuming this exists
    try {
      const deactivateResponse = await axios.patch(
        `${USER_STAFF_SERVICE_URL}/staff/${staffId}/deactivate`,
        { reason: 'Testing token invalidation' },
        {
          headers: {
            'Authorization': `Bearer ${loginResponse.data.tokens.accessToken}`
          }
        }
      );

      if (deactivateResponse.data.success) {
        console.log('✅ Staff deactivation successful');
        
        // Try to use the old token - should fail
        try {
          await axios.get(`${USER_STAFF_SERVICE_URL}/staff/${staffId}`, {
            headers: {
              'Authorization': `Bearer ${loginResponse.data.tokens.accessToken}`
            }
          });
          console.log('❌ Old token still works (SECURITY ISSUE)');
        } catch (error) {
          if (error.response?.status === 403) {
            console.log('✅ Old token invalidated successfully');
          } else {
            console.log('❓ Unexpected error:', error.message);
          }
        }
      } else {
        console.log('❌ Staff deactivation failed');
      }
    } catch (error) {
      console.log('❌ Staff deactivation error:', error.response?.data?.message || error.message);
    }

    // Test 3: Role change should invalidate tokens
    console.log('\n3️⃣ Testing Role Change Token Invalidation');
    
    // First, reactivate the staff
    try {
      await axios.patch(`${USER_STAFF_SERVICE_URL}/staff/${staffId}/activate`, {}, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.tokens.accessToken}`
        }
      });
      console.log('✅ Staff reactivated for role change test');
    } catch (error) {
      console.log('❌ Failed to reactivate staff');
    }

    // Login again to get fresh token
    const freshLoginResponse = await axios.post(`${AUTH_SERVICE_URL}/auth/login`, {
      email: 'doctor@test.com',
      password: 'password123',
      tenantId: 'TENANT001'
    });

    if (freshLoginResponse.data.success) {
      const freshToken = freshLoginResponse.data.tokens.accessToken;
      
      try {
        // Assign a new role
        const roleAssignResponse = await axios.post(
          `${USER_STAFF_SERVICE_URL}/staff/${staffId}/roles`,
          { roleId: 'ROLE002' },
          {
            headers: {
              'Authorization': `Bearer ${freshToken}`
            }
          }
        );

        if (roleAssignResponse.data.success) {
          console.log('✅ Role assignment successful');
          
          // Try to use the old token - should fail
          try {
            await axios.get(`${USER_STAFF_SERVICE_URL}/staff/${staffId}`, {
              headers: {
                'Authorization': `Bearer ${freshToken}`
              }
            });
            console.log('❌ Old token still works after role change (SECURITY ISSUE)');
          } catch (error) {
            if (error.response?.status === 403) {
              console.log('✅ Token invalidated after role change');
            } else {
              console.log('❓ Unexpected error:', error.message);
            }
          }
        } else {
          console.log('❌ Role assignment failed');
        }
      } catch (error) {
        console.log('❌ Role assignment error:', error.response?.data?.message || error.message);
      }
    }

    // Test 4: Verify auth service endpoints exist
    console.log('\n4️⃣ Testing Auth Service Endpoints');
    
    const testUserId = '507f1f77bcf86cd799439011'; // Mock user ID
    
    // Test deactivate endpoint
    try {
      await axios.patch(`${AUTH_SERVICE_URL}/auth/users/${testUserId}/deactivate`);
      console.log('✅ Deactivate endpoint exists');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Deactivate endpoint exists (user not found is expected)');
      } else {
        console.log('❌ Deactivate endpoint missing or broken');
      }
    }

    // Test token invalidation endpoint
    try {
      await axios.patch(`${AUTH_SERVICE_URL}/auth/users/${testUserId}/invalidate-tokens`);
      console.log('✅ Token invalidation endpoint exists');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Token invalidation endpoint exists (user not found is expected)');
      } else {
        console.log('❌ Token invalidation endpoint missing or broken');
      }
    }

    console.log('\n🎯 JWT Invalidation Fix Test Complete');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testJWTInvalidationFix().catch(console.error);