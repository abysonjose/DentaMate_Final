/**
 * Lab Staff Dashboard Integration Test
 * Tests the complete lab staff workflow including diagnostic requests,
 * patient verification, report upload, and AI integration
 */

const axios = require('axios');

class LabStaffDashboardTest {
    constructor() {
        this.baseUrl = 'http://localhost:3000/api';
        this.labStaffToken = null;
        this.testData = {
            labStaffUser: {
                email: 'lab.tech@dentamate.com',
                password: 'LabTech123!',
                role: 'LAB_STAFF',
                branchId: 'branch-001'
            },