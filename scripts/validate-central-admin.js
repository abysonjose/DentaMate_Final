#!/usr/bin/env node

/**
 * Central Admin Validation Script
 * Quick validation to check if central admin was created successfully
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../backend/auth-identity-service/src/models/User');
const Tenant = require('../backend/tenant-organization-service/src/models/Tenant');

const ADMIN_EMAIL = 'admin@dentamate.com';

async function validateCentralAdmin() {
  try {
    console.log('🔍 Validating Central Admin Setup...\n');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dentamate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Check tenant
    const tenant = await Tenant.findOne({ 'owner.email': ADMIN_EMAIL });
    if (!tenant) {
      console.log('❌ Central admin tenant not found');
      return false;
    }
    console.log('✅ Central admin tenant found');
    console.log(`   Tenant ID: ${tenant.tenantId}`);
    console.log(`   Organization: ${tenant.organizationName}`);
    console.log(`   Status: ${tenant.status}`);
    
    // Check user
    const user = await User.findOne({ 
      email: ADMIN_EMAIL,
      tenantId: tenant._id 
    });
    if (!user) {
      console.log('❌ Central admin user not found');
      return false;
    }
    console.log('✅ Central admin user found');
    console.log(`   User ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    
    // Test password
    const isPasswordValid = await user.comparePassword('Admin@123456');
    if (!isPasswordValid) {
      console.log('❌ Password validation failed');
      return false;
    }
    console.log('✅ Password validation successful');
    
    console.log('\n🎉 Central Admin validation completed successfully!');
    console.log('\n📋 Login Information:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: Admin@123456`);
    console.log(`   Tenant ID: ${tenant.tenantId}`);
    console.log(`   Frontend URL: http://localhost:4200/auth/login`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  validateCentralAdmin().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { validateCentralAdmin };