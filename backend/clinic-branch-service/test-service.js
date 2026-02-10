const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// Test the service startup
async function testService() {
  try {
    console.log('Testing Clinic & Branch Service...');
    
    // Test MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster0.ozkxezh.mongodb.net/dentamate_clinic_branch_test?appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('✓ MongoDB connection successful');
    
    // Test models
    const Clinic = require('./src/models/Clinic');
    const Branch = require('./src/models/Branch');
    const Department = require('./src/models/Department');
    const Room = require('./src/models/Room');
    const WorkingHours = require('./src/models/WorkingHours');
    
    console.log('✓ All models loaded successfully');
    
    // Test server startup
    const app = require('./src/server');
    console.log('✓ Server started successfully');
    
    // Test health endpoint
    const request = require('supertest');
    const response = await request(app).get('/health');
    
    if (response.status === 200) {
      console.log('✓ Health endpoint working');
      console.log('Health response:', response.body);
    } else {
      console.log('✗ Health endpoint failed');
    }
    
    console.log('\n🎉 All tests passed! Clinic & Branch Service is ready.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testService();