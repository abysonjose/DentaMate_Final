#!/usr/bin/env node

/**
 * Central Admin Seed Script
 * Creates a default tenant organization and central admin user for initial system access
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models (assuming they're available in the script context)
const User = require('../backend/auth-identity-service/src/models/User');
const Tenant = require('../backend/tenant-organization-service/src/models/Tenant');

// Configuration
const SEED_CONFIG = {
  tenant: {
    organizationName: 'DentaMate Central Administration',
    industryType: 'DENTAL',
    status: 'ACTIVE',
    subscriptionType: 'ENTERPRISE',
    owner: {
      name: 'Central Administrator',
      email: 'admin@dentamate.com',
      phone: '+91-9999999999',
      roles: ['CENTRAL_ADMIN', 'OWNER']
    },
    contactInfo: {
      address: {
        street: 'DentaMate Headquarters',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        zipCode: '560001'
      },
      website: 'https://dentamate.com',
      taxId: 'GSTIN123456789',
      registrationNumber: 'REG123456789'
    },
    configuration: {
      enabledModules: [
        'APPOINTMENTS', 'QUEUE_MANAGEMENT', 'AI_DIAGNOSIS', 
        'OCR_PRESCRIPTION', 'BILLING', 'INVENTORY', 
        'ANALYTICS', 'NOTIFICATIONS', 'AUDIT_LOGS'
      ],
      featureFlags: new Map([
        ['AI_ENABLED', true],
        ['OCR_ENABLED', true],
        ['ANALYTICS_ENABLED', true],
        ['NOTIFICATIONS_ENABLED', true],
        ['MULTI_TENANT_ADMIN', true],
        ['SYSTEM_MONITORING', true]
      ])
    },
    limits: {
      maxBranches: 999,
      maxUsers: 9999,
      maxAppointmentsPerMonth: 999999,
      storageQuotaGB: 1000
    }
  },
  centralAdmin: {
    email: 'admin@dentamate.com',
    password: 'Admin@123456', // Should be changed after first login
    firstName: 'Central',
    lastName: 'Administrator',
    role: 'central-admin',
    isActive: true,
    permissions: [
      {
        resource: 'tenants',
        actions: ['create', 'read', 'update', 'delete', 'manage']
      },
      {
        resource: 'users',
        actions: ['create', 'read', 'update', 'delete', 'manage']
      },
      {
        resource: 'branches',
        actions: ['create', 'read', 'update', 'delete', 'manage']
      },
      {
        resource: 'system',
        actions: ['monitor', 'configure', 'backup', 'restore']
      },
      {
        resource: 'analytics',
        actions: ['read', 'export', 'configure']
      },
      {
        resource: 'billing',
        actions: ['read', 'manage', 'configure']
      }
    ]
  }
};

class CentralAdminSeeder {
  constructor() {
    this.tenant = null;
    this.centralAdmin = null;
  }

  async connect() {
    try {
      // Connect to MongoDB
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dentamate';
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }

  async createTenant() {
    try {
      // Check if central admin tenant already exists
      const existingTenant = await Tenant.findOne({ 
        'owner.email': SEED_CONFIG.tenant.owner.email 
      });

      if (existingTenant) {
        console.log('⚠️  Central admin tenant already exists');
        this.tenant = existingTenant;
        return existingTenant;
      }

      // Create new tenant
      const tenantData = {
        ...SEED_CONFIG.tenant,
        auditInfo: {
          createdBy: 'system-seed',
          createdAt: new Date(),
          activatedAt: new Date()
        }
      };

      this.tenant = new Tenant(tenantData);
      await this.tenant.save();

      console.log('✅ Central admin tenant created successfully');
      console.log(`   Tenant ID: ${this.tenant.tenantId}`);
      console.log(`   Organization: ${this.tenant.organizationName}`);
      
      return this.tenant;
    } catch (error) {
      console.error('❌ Failed to create tenant:', error.message);
      throw error;
    }
  }

  async createCentralAdmin() {
    try {
      if (!this.tenant) {
        throw new Error('Tenant must be created first');
      }

      // Check if central admin user already exists
      const existingUser = await User.findOne({ 
        email: SEED_CONFIG.centralAdmin.email,
        tenantId: this.tenant._id
      });

      if (existingUser) {
        console.log('⚠️  Central admin user already exists');
        this.centralAdmin = existingUser;
        return existingUser;
      }

      // Create central admin user
      const adminData = {
        ...SEED_CONFIG.centralAdmin,
        tenantId: this.tenant._id
      };

      this.centralAdmin = new User(adminData);
      await this.centralAdmin.save();

      console.log('✅ Central admin user created successfully');
      console.log(`   Email: ${this.centralAdmin.email}`);
      console.log(`   Role: ${this.centralAdmin.role}`);
      console.log(`   Tenant ID: ${this.centralAdmin.tenantId}`);
      
      return this.centralAdmin;
    } catch (error) {
      console.error('❌ Failed to create central admin user:', error.message);
      throw error;
    }
  }

  async validateSeed() {
    try {
      // Validate tenant
      const tenant = await Tenant.findById(this.tenant._id);
      if (!tenant) {
        throw new Error('Tenant validation failed');
      }

      // Validate user
      const user = await User.findById(this.centralAdmin._id);
      if (!user) {
        throw new Error('User validation failed');
      }

      // Test password
      const isPasswordValid = await user.comparePassword(SEED_CONFIG.centralAdmin.password);
      if (!isPasswordValid) {
        throw new Error('Password validation failed');
      }

      console.log('✅ Seed validation successful');
      return true;
    } catch (error) {
      console.error('❌ Seed validation failed:', error.message);
      throw error;
    }
  }

  async printLoginInstructions() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CENTRAL ADMIN SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log(`   Email: ${SEED_CONFIG.centralAdmin.email}`);
    console.log(`   Password: ${SEED_CONFIG.centralAdmin.password}`);
    console.log(`   Tenant ID: ${this.tenant.tenantId}`);
    console.log(`   Role: ${SEED_CONFIG.centralAdmin.role}`);
    
    console.log('\n🔗 LOGIN ENDPOINTS:');
    console.log('   Auth Service: http://localhost:3001/auth/login');
    console.log('   Frontend: http://localhost:4200/auth/login');
    
    console.log('\n📝 LOGIN PAYLOAD EXAMPLE:');
    console.log(JSON.stringify({
      email: SEED_CONFIG.centralAdmin.email,
      password: SEED_CONFIG.centralAdmin.password,
      tenantId: this.tenant.tenantId
    }, null, 2));

    console.log('\n⚠️  SECURITY NOTES:');
    console.log('   - Change the default password after first login');
    console.log('   - Enable two-factor authentication');
    console.log('   - Review and update permissions as needed');
    console.log('   - Monitor audit logs regularly');
    
    console.log('\n' + '='.repeat(60));
  }

  async run() {
    try {
      console.log('🚀 Starting Central Admin Seed Process...\n');
      
      await this.connect();
      await this.createTenant();
      await this.createCentralAdmin();
      await this.validateSeed();
      await this.printLoginInstructions();
      
      console.log('\n✅ Central Admin seed completed successfully!');
    } catch (error) {
      console.error('\n❌ Seed process failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Additional utility functions
async function resetCentralAdmin() {
  try {
    console.log('🔄 Resetting Central Admin...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dentamate';
    await mongoose.connect(mongoUri);
    
    // Remove existing central admin user
    await User.deleteOne({ email: SEED_CONFIG.centralAdmin.email });
    
    // Remove existing central admin tenant
    await Tenant.deleteOne({ 'owner.email': SEED_CONFIG.tenant.owner.email });
    
    console.log('✅ Central Admin reset completed');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--reset')) {
    resetCentralAdmin();
  } else if (args.includes('--help')) {
    console.log(`
Central Admin Seed Script

Usage:
  node seed-central-admin.js          # Create central admin
  node seed-central-admin.js --reset  # Reset central admin
  node seed-central-admin.js --help   # Show this help

Environment Variables:
  MONGODB_URI                         # MongoDB connection string
    `);
  } else {
    const seeder = new CentralAdminSeeder();
    seeder.run();
  }
}

module.exports = { CentralAdminSeeder, SEED_CONFIG };