const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:8007';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZG9jdG9yLTEyMyIsInRlbmFudF9pZCI6InRlbmFudC0xMjMiLCJicmFuY2hfaWQiOiJicmFuY2gtMTIzIiwicm9sZSI6ImRvY3RvciIsInBlcm1pc3Npb25zIjpbInByZXNjcmlwdGlvbjpjcmVhdGUiLCJwcmVzY3JpcHRpb246cmVhZCIsInByZXNjcmlwdGlvbjphcHByb3ZlIl0sImV4cCI6MTc0MDc0NDAwMCwiaWF0IjoxNzA5MjA4MDAwfQ.test-signature';

// Test data
const testPrescriptionText = `
Dr. John Smith
Dental Clinic

Patient: Jane Doe
Date: 2024-01-15

Rx:
1. Amoxicillin 500mg
   Take twice daily for 7 days

2. Ibuprofen 400mg
   Take as needed for pain
   Maximum 3 times daily

3. Chlorhexidine mouthwash
   Rinse twice daily for 5 days

Dr. John Smith
License: 12345
`;

class PrescriptionOCRTester {
    constructor() {
        this.baseURL = BASE_URL;
        this.headers = {
            'Authorization': `Bearer ${JWT_TOKEN}`,
            'Content-Type': 'application/json'
        };
    }

    async testHealthCheck() {
        console.log('\n🏥 Testing Health Check...');
        try {
            const response = await axios.get(`${this.baseURL}/health/`);
            console.log('✅ Health Check:', response.data);
            
            const detailedResponse = await axios.get(`${this.baseURL}/health/detailed`);
            console.log('✅ Detailed Health Check:', JSON.stringify(detailedResponse.data, null, 2));
            
            return true;
        } catch (error) {
            console.error('❌ Health Check Failed:', error.response?.data || error.message);
            return false;
        }
    }

    async createTestPrescriptionImage() {
        console.log('\n📄 Creating test prescription image...');
        
        // Create a simple text file as a mock prescription
        const testFilePath = path.join(__dirname, 'test-prescription.txt');
        fs.writeFileSync(testFilePath, testPrescriptionText);
        
        console.log('✅ Test prescription file created:', testFilePath);
        return testFilePath;
    }

    async testProcessPrescription(filePath) {
        console.log('\n🔍 Testing Prescription Processing...');
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(filePath));
            form.append('appointment_id', 'appointment-123');
            form.append('patient_id', 'patient-456');
            form.append('notes', 'Test prescription processing');

            const response = await axios.post(`${this.baseURL}/ocr/process`, form, {
                headers: {
                    ...this.headers,
                    ...form.getHeaders()
                }
            });

            console.log('✅ Prescription Processing Started:', response.data);
            return response.data.request_id;
        } catch (error) {
            console.error('❌ Prescription Processing Failed:', error.response?.data || error.message);
            return null;
        }
    }

    async testGetStatus(requestId) {
        console.log('\n📊 Testing Status Check...');
        try {
            const response = await axios.get(`${this.baseURL}/ocr/status/${requestId}`, {
                headers: this.headers
            });

            console.log('✅ Status Check:', response.data);
            return response.data.status;
        } catch (error) {
            console.error('❌ Status Check Failed:', error.response?.data || error.message);
            return null;
        }
    }

    async testGetResult(requestId) {
        console.log('\n📋 Testing Result Retrieval...');
        try {
            const response = await axios.get(`${this.baseURL}/ocr/result/${requestId}`, {
                headers: this.headers
            });

            console.log('✅ Result Retrieved:', JSON.stringify(response.data, null, 2));
            return response.data.result;
        } catch (error) {
            console.error('❌ Result Retrieval Failed:', error.response?.data || error.message);
            return null;
        }
    }

    async testApprovePrescription(requestId, result) {
        console.log('\n✅ Testing Prescription Approval...');
        try {
            // Mock corrected medicines
            const correctedMedicines = result?.medicines?.map(med => ({
                ...med,
                confidence: Math.min(med.confidence + 0.1, 1.0) // Slightly increase confidence
            })) || [
                {
                    name: "Amoxicillin",
                    dosage: "500mg",
                    frequency: "Twice a day",
                    duration: "7 days",
                    confidence: 0.95,
                    raw_text: "Amoxicillin 500mg BD for 7 days",
                    normalized: true
                }
            ];

            const approvalData = {
                medicines: correctedMedicines,
                doctor_notes: "Reviewed and approved with minor corrections"
            };

            const response = await axios.post(
                `${this.baseURL}/ocr/${requestId}/approve`,
                approvalData,
                { headers: this.headers }
            );

            console.log('✅ Prescription Approved:', response.data);
            return true;
        } catch (error) {
            console.error('❌ Prescription Approval Failed:', error.response?.data || error.message);
            return false;
        }
    }

    async testRejectPrescription(requestId) {
        console.log('\n❌ Testing Prescription Rejection...');
        try {
            const form = new FormData();
            form.append('rejection_reason', 'OCR quality too low, manual entry required');

            const response = await axios.post(
                `${this.baseURL}/ocr/${requestId}/reject`,
                form,
                {
                    headers: {
                        ...this.headers,
                        ...form.getHeaders()
                    }
                }
            );

            console.log('✅ Prescription Rejected:', response.data);
            return true;
        } catch (error) {
            console.error('❌ Prescription Rejection Failed:', error.response?.data || error.message);
            return false;
        }
    }

    async waitForProcessing(requestId, maxWaitTime = 30000) {
        console.log('\n⏳ Waiting for OCR processing to complete...');
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            const status = await this.testGetStatus(requestId);
            
            if (status === 'COMPLETED' || status === 'FAILED') {
                console.log(`✅ Processing completed with status: ${status}`);
                return status;
            }
            
            console.log(`⏳ Still processing... Status: ${status}`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        }
        
        console.log('⏰ Processing timeout reached');
        return 'TIMEOUT';
    }

    async runFullTest() {
        console.log('🚀 Starting Prescription OCR Service Tests...');
        
        // Test 1: Health Check
        const healthOk = await this.testHealthCheck();
        if (!healthOk) {
            console.log('❌ Health check failed, stopping tests');
            return;
        }

        // Test 2: Create test file
        const testFilePath = await this.createTestPrescriptionImage();

        // Test 3: Process prescription
        const requestId = await this.testProcessPrescription(testFilePath);
        if (!requestId) {
            console.log('❌ Failed to start processing, stopping tests');
            return;
        }

        // Test 4: Wait for processing
        const finalStatus = await this.waitForProcessing(requestId);
        
        if (finalStatus === 'COMPLETED') {
            // Test 5: Get result
            const result = await this.testGetResult(requestId);
            
            if (result) {
                // Test 6: Approve prescription
                await this.testApprovePrescription(requestId, result);
            }
        } else if (finalStatus === 'FAILED') {
            console.log('⚠️ OCR processing failed, this is expected for text files');
        }

        // Test 7: Test rejection with a new request (if we have one)
        console.log('\n🔄 Testing rejection workflow...');
        const rejectRequestId = await this.testProcessPrescription(testFilePath);
        if (rejectRequestId) {
            // Wait a bit then reject
            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.testRejectPrescription(rejectRequestId);
        }

        // Cleanup
        try {
            fs.unlinkSync(testFilePath);
            console.log('🧹 Cleaned up test file');
        } catch (error) {
            console.log('⚠️ Could not clean up test file:', error.message);
        }

        console.log('\n🎉 Prescription OCR Service Tests Completed!');
    }

    async testErrorCases() {
        console.log('\n🚨 Testing Error Cases...');

        // Test invalid file type
        try {
            const form = new FormData();
            form.append('file', Buffer.from('invalid content'), 'test.exe');
            
            await axios.post(`${this.baseURL}/ocr/process`, form, {
                headers: {
                    ...this.headers,
                    ...form.getHeaders()
                }
            });
        } catch (error) {
            console.log('✅ Invalid file type rejected:', error.response?.status);
        }

        // Test invalid request ID
        try {
            await axios.get(`${this.baseURL}/ocr/status/invalid-id`, {
                headers: this.headers
            });
        } catch (error) {
            console.log('✅ Invalid request ID rejected:', error.response?.status);
        }

        // Test unauthorized access
        try {
            await axios.get(`${this.baseURL}/ocr/status/some-id`, {
                headers: { 'Authorization': 'Bearer invalid-token' }
            });
        } catch (error) {
            console.log('✅ Unauthorized access rejected:', error.response?.status);
        }
    }
}

// Run tests
async function main() {
    const tester = new PrescriptionOCRTester();
    
    try {
        await tester.runFullTest();
        await tester.testErrorCases();
    } catch (error) {
        console.error('💥 Test suite failed:', error);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = PrescriptionOCRTester;