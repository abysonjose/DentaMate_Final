const fs = require('fs');
const path = require('path');

console.log('🔧 Validating JWT Invalidation Fix Implementation\n');

// Test 1: Validate User model changes
console.log('1️⃣ Validating Auth Service User Model Changes');
try {
  const userModelPath = 'backend/auth-identity-service/src/models/User.js';
  const userModelContent = fs.readFileSync(userModelPath, 'utf8');
  
  // Check if role field is removed
  if (!userModelContent.includes('role: {')) {
    console.log('✅ Role field removed from User model');
  } else {
    console.log('❌ Role field still exists in User model');
  }
  
  // Check if tokenVersion field is added
  if (userModelContent.includes('tokenVersion: {')) {
    console.log('✅ TokenVersion field added to User model');
  } else {
    console.log('❌ TokenVersion field missing from User model');
  }
  
  // Check if invalidateTokens method is added
  if (userModelContent.includes('invalidateTokens')) {
    console.log('✅ InvalidateTokens method added to User model');
  } else {
    console.log('❌ InvalidateTokens method missing from User model');
  }
  
} catch (error) {
  console.log('❌ Error reading User model:', error.message);
}

// Test 2: Validate JWT utils changes
console.log('\n2️⃣ Validating JWT Utils Changes');
try {
  const jwtUtilsPath = 'backend/auth-identity-service/src/utils/jwt.js';
  const jwtUtilsContent = fs.readFileSync(jwtUtilsPath, 'utf8');
  
  // Check if verifyAccessToken is async and checks token version
  if (jwtUtilsContent.includes('async') && jwtUtilsContent.includes('tokenVersion')) {
    console.log('✅ JWT verification updated with token version check');
  } else {
    console.log('❌ JWT verification missing token version check');
  }
  
  // Check if User model is imported
  if (jwtUtilsContent.includes("require('../models/User')")) {
    console.log('✅ User model imported for token version validation');
  } else {
    console.log('❌ User model not imported in JWT utils');
  }
  
} catch (error) {
  console.log('❌ Error reading JWT utils:', error.message);
}

// Test 3: Validate Auth routes changes
console.log('\n3️⃣ Validating Auth Routes Changes');
try {
  const authRoutesPath = 'backend/auth-identity-service/src/routes/auth.js';
  const authRoutesContent = fs.readFileSync(authRoutesPath, 'utf8');
  
  // Check if axios is imported for staff service calls
  if (authRoutesContent.includes("require('axios')")) {
    console.log('✅ Axios imported for staff service integration');
  } else {
    console.log('❌ Axios not imported in auth routes');
  }
  
  // Check if USER_STAFF_SERVICE_URL is defined
  if (authRoutesContent.includes('USER_STAFF_SERVICE_URL')) {
    console.log('✅ User staff service URL configured');
  } else {
    console.log('❌ User staff service URL not configured');
  }
  
  // Check if deactivate endpoint exists
  if (authRoutesContent.includes('/users/:userId/deactivate')) {
    console.log('✅ Deactivate endpoint added');
  } else {
    console.log('❌ Deactivate endpoint missing');
  }
  
  // Check if token invalidation endpoint exists
  if (authRoutesContent.includes('/users/:userId/invalidate-tokens')) {
    console.log('✅ Token invalidation endpoint added');
  } else {
    console.log('❌ Token invalidation endpoint missing');
  }
  
  // Check if login fetches staff data
  if (authRoutesContent.includes('/staff/by-auth/')) {
    console.log('✅ Login endpoint fetches staff data from SSOT');
  } else {
    console.log('❌ Login endpoint not updated to fetch staff data');
  }
  
} catch (error) {
  console.log('❌ Error reading auth routes:', error.message);
}

// Test 4: Validate Staff Service changes
console.log('\n4️⃣ Validating Staff Service Changes');
try {
  const staffServicePath = 'backend/user-staff-service/src/services/StaffService.js';
  const staffServiceContent = fs.readFileSync(staffServicePath, 'utf8');
  
  // Check if getStaffByAuthId method exists
  if (staffServiceContent.includes('getStaffByAuthId')) {
    console.log('✅ GetStaffByAuthId method added');
  } else {
    console.log('❌ GetStaffByAuthId method missing');
  }
  
  // Check if invalidateAuthTokens method exists
  if (staffServiceContent.includes('invalidateAuthTokens')) {
    console.log('✅ InvalidateAuthTokens method added');
  } else {
    console.log('❌ InvalidateAuthTokens method missing');
  }
  
  // Check if deactivateAuthIdentity throws errors
  if (staffServiceContent.includes('throw new Error(\'Critical: Failed to deactivate')) {
    console.log('✅ Auth deactivation failures now throw errors (atomic)');
  } else {
    console.log('❌ Auth deactivation failures still ignored (not atomic)');
  }
  
  // Check if role assignment invalidates tokens
  const assignRoleMatch = staffServiceContent.match(/async assignRole[\s\S]*?invalidateAuthTokens/);
  if (assignRoleMatch) {
    console.log('✅ Role assignment invalidates tokens');
  } else {
    console.log('❌ Role assignment does not invalidate tokens');
  }
  
} catch (error) {
  console.log('❌ Error reading staff service:', error.message);
}

// Test 5: Validate Staff Routes changes
console.log('\n5️⃣ Validating Staff Routes Changes');
try {
  const staffRoutesPath = 'backend/user-staff-service/src/routes/staffRoutes.js';
  const staffRoutesContent = fs.readFileSync(staffRoutesPath, 'utf8');
  
  // Check if by-auth endpoint exists
  if (staffRoutesContent.includes('/by-auth/:userAuthId')) {
    console.log('✅ By-auth lookup endpoint added');
  } else {
    console.log('❌ By-auth lookup endpoint missing');
  }
  
} catch (error) {
  console.log('❌ Error reading staff routes:', error.message);
}

// Test 6: Validate Staff Controller changes
console.log('\n6️⃣ Validating Staff Controller Changes');
try {
  const staffControllerPath = 'backend/user-staff-service/src/controllers/StaffController.js';
  const staffControllerContent = fs.readFileSync(staffControllerPath, 'utf8');
  
  // Check if getStaffByAuthId method exists
  if (staffControllerContent.includes('getStaffByAuthId')) {
    console.log('✅ GetStaffByAuthId controller method added');
  } else {
    console.log('❌ GetStaffByAuthId controller method missing');
  }
  
} catch (error) {
  console.log('❌ Error reading staff controller:', error.message);
}

// Test 7: Validate Auth Middleware changes
console.log('\n7️⃣ Validating Auth Middleware Changes');
try {
  const authMiddlewarePath = 'backend/user-staff-service/src/middleware/auth.js';
  const authMiddlewareContent = fs.readFileSync(authMiddlewarePath, 'utf8');
  
  // Check if verifyAccessToken is imported and used
  if (authMiddlewareContent.includes('verifyAccessToken')) {
    console.log('✅ Auth middleware updated to use new JWT verification');
  } else {
    console.log('❌ Auth middleware not updated for new JWT verification');
  }
  
} catch (error) {
  console.log('❌ Error reading auth middleware:', error.message);
}

console.log('\n🎯 Code Validation Complete');
console.log('\n📋 Summary of Required Changes:');
console.log('✅ = Implemented correctly');
console.log('❌ = Needs attention');
console.log('\n🚀 Next Steps:');
console.log('1. Start the services: docker-compose up');
console.log('2. Run integration test: node test-jwt-invalidation-fix.js');
console.log('3. Test staff deactivation and role changes');
console.log('4. Verify JWT invalidation works correctly');