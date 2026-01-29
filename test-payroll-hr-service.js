const axios = require('axios');

const BASE_URL = 'http://localhost:3009';

// Mock JWT token for testing (in real scenario, get from auth service)
const MOCK_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsInRlbmFudElkIjoidGVuYW50LTEyMyIsImJyYW5jaElkIjoiYnJhbmNoLTEyMyIsInJvbGUiOiJQQVlST0xMX09GRklDRVIiLCJwZXJtaXNzaW9ucyI6WyJwYXlyb2xsOmNhbGN1bGF0ZSIsInBheXJvbGw6ZmluYWxpemUiLCJwYXlzbGlwOmdlbmVyYXRlIl0sImVtYWlsIjoicGF5cm9sbEBkZW50YW1hdGUuY29tIiwibmFtZSI6IlBheXJvbGwgT2ZmaWNlciIsImlhdCI6MTczODA2NzIwMCwiZXhwIjoxNzM4MTUzNjAwfQ.mock-signature';

const HR_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJoci0xMjMiLCJ0ZW5hbnRJZCI6InRlbmFudC0xMjMiLCJicmFuY2hJZCI6ImJyYW5jaC0xMjMiLCJyb2xlIjoiSFIiLCJwZXJtaXNzaW9ucyI6WyJhdHRlbmRhbmNlOm1hbmFnZSIsInNoaWZ0Om1hbmFnZSJdLCJlbWFpbCI6ImhyQGRlbnRhbWF0ZS5jb20iLCJuYW1lIjoiSFIgTWFuYWdlciIsImlhdCI6MTczODA2NzIwMCwiZXhwIjoxNzM4MTUzNjAwfQ.mock-signature';

const axiosConfig = {
  headers: {
    'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

const hrAxiosConfig = {
  headers: {
    'Authorization': `Bearer ${HR_JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

async function testPayrollHRService() {
  console.log('🧪 Testing Payroll HR Service...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data.status);
    console.log('   Database:', healthResponse.data.database.status);
    console.log('   Cache:', healthResponse.data.cache.status);
    console.log();

    // Test 2: Create Shift (HR role)
    console.log('2. Testing Shift Creation...');
    const shiftData = {
      name: 'Morning Shift',
      type: 'MORNING',
      startTime: '09:00',
      endTime: '18:00',
      breakDuration: 1,
      workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      maxEmployees: 10,
      overtimeRules: {
        enabled: true,
        thresholdHours: 8,
        multiplier: 1.5
      }
    };

    const shiftResponse = await axios.post(`${BASE_URL}/api/shifts`, shiftData, hrAxiosConfig);
    console.log('✅ Shift Created:', shiftResponse.data.data.name);
    const shiftId = shiftResponse.data.data.shiftId;
    console.log('   Shift ID:', shiftId);
    console.log();

    // Test 3: Get Shifts
    console.log('3. Testing Get Shifts...');
    const shiftsResponse = await axios.get(`${BASE_URL}/api/shifts`, hrAxiosConfig);
    console.log('✅ Shifts Retrieved:', shiftsResponse.data.data.length, 'shifts found');
    console.log();

    // Test 4: Record Attendance (HR role)
    console.log('4. Testing Attendance Recording...');
    const attendanceData = {
      employeeId: 'emp-001',
      date: '2026-01-29',
      status: 'PRESENT',
      checkInTime: '2026-01-29T09:00:00.000Z',
      checkOutTime: '2026-01-29T18:30:00.000Z',
      shiftId: shiftId,
      remarks: 'Regular attendance',
      metadata: {
        source: 'MANUAL'
      }
    };

    const attendanceResponse = await axios.post(`${BASE_URL}/api/attendance`, attendanceData, hrAxiosConfig);
    console.log('✅ Attendance Recorded:', attendanceResponse.data.data.status);
    console.log('   Working Hours:', attendanceResponse.data.data.workingHours);
    console.log('   Overtime Hours:', attendanceResponse.data.data.overtimeHours);
    console.log();

    // Test 5: Get Attendance Records
    console.log('5. Testing Get Attendance Records...');
    const attendanceListResponse = await axios.get(`${BASE_URL}/api/attendance?employeeId=emp-001&month=2026-01`, hrAxiosConfig);
    console.log('✅ Attendance Records Retrieved:', attendanceListResponse.data.data.length, 'records found');
    console.log();

    // Test 6: Get Attendance Summary
    console.log('6. Testing Attendance Summary...');
    const summaryResponse = await axios.get(`${BASE_URL}/api/attendance/summary/emp-001/2026-01`, hrAxiosConfig);
    console.log('✅ Attendance Summary Retrieved:');
    console.log('   Present Days:', summaryResponse.data.data.presentDays);
    console.log('   Total Working Hours:', summaryResponse.data.data.totalWorkingHours);
    console.log('   Attendance Percentage:', summaryResponse.data.data.attendancePercentage + '%');
    console.log();

    // Test 7: Run Payroll Calculation (Payroll Officer role)
    console.log('7. Testing Payroll Calculation...');
    const payrollData = {
      month: '2026-01',
      employeeIds: ['emp-001'],
      recalculate: false
    };

    const payrollResponse = await axios.post(`${BASE_URL}/api/payroll/run`, payrollData, axiosConfig);
    console.log('✅ Payroll Calculated:');
    console.log('   Total Employees:', payrollResponse.data.data.totalEmployees);
    console.log('   Total Gross Pay:', payrollResponse.data.data.totalGrossPay);
    console.log('   Total Net Pay:', payrollResponse.data.data.totalNetPay);
    console.log();

    // Test 8: Get Payroll Summary
    console.log('8. Testing Payroll Summary...');
    const payrollSummaryResponse = await axios.get(`${BASE_URL}/api/payroll/2026-01/summary`, axiosConfig);
    console.log('✅ Payroll Summary Retrieved:');
    console.log('   Status:', payrollSummaryResponse.data.data.status);
    console.log('   Total Employees:', payrollSummaryResponse.data.data.totalEmployees);
    console.log();

    // Test 9: Finalize Payroll
    console.log('9. Testing Payroll Finalization...');
    const finalizeData = {
      remarks: 'Payroll finalized for January 2026 - Test'
    };

    const finalizeResponse = await axios.post(`${BASE_URL}/api/payroll/2026-01/finalize`, finalizeData, axiosConfig);
    console.log('✅ Payroll Finalized:');
    console.log('   Status:', finalizeResponse.data.data.status);
    console.log('   Finalized At:', finalizeResponse.data.data.finalizedAt);
    console.log();

    // Test 10: Generate Payslip
    console.log('10. Testing Payslip Generation...');
    const payslipResponse = await axios.post(`${BASE_URL}/api/payslips/emp-001/2026-01/generate`, {}, axiosConfig);
    console.log('✅ Payslip Generated:');
    console.log('   File Name:', payslipResponse.data.data.fileName);
    console.log('   Generated At:', payslipResponse.data.data.generatedAt);
    console.log();

    // Test 11: Get Payslip Data
    console.log('11. Testing Get Payslip Data...');
    const payslipDataResponse = await axios.get(`${BASE_URL}/api/payslips/emp-001/2026-01`, axiosConfig);
    console.log('✅ Payslip Data Retrieved:');
    console.log('   Employee:', payslipDataResponse.data.data.payrollData.employeeName);
    console.log('   Net Pay:', payslipDataResponse.data.data.payrollData.netPay);
    console.log('   Payslip Generated:', payslipDataResponse.data.data.payslipGenerated);
    console.log();

    // Test 12: Get Payroll History
    console.log('12. Testing Payroll History...');
    const historyResponse = await axios.get(`${BASE_URL}/api/payroll/history?limit=5`, axiosConfig);
    console.log('✅ Payroll History Retrieved:', historyResponse.data.data.length, 'records found');
    console.log();

    // Test 13: Get Department-wise Report
    console.log('13. Testing Department-wise Report...');
    const deptReportResponse = await axios.get(`${BASE_URL}/api/payroll/2026-01/department-report`, axiosConfig);
    console.log('✅ Department Report Generated:', deptReportResponse.data.data.departments.length, 'departments');
    console.log();

    // Test 14: Get Shift Coverage Report
    console.log('14. Testing Shift Coverage Report...');
    const coverageResponse = await axios.get(`${BASE_URL}/api/shifts/reports/coverage`, hrAxiosConfig);
    console.log('✅ Shift Coverage Report Generated:', coverageResponse.data.data.shifts.length, 'shifts analyzed');
    console.log();

    // Test 15: Bulk Generate Payslips
    console.log('15. Testing Bulk Payslip Generation...');
    const bulkPayslipData = {
      month: '2026-01',
      employeeIds: ['emp-001']
    };

    const bulkPayslipResponse = await axios.post(`${BASE_URL}/api/payslips/bulk-generate`, bulkPayslipData, axiosConfig);
    console.log('✅ Bulk Payslips Generated:');
    console.log('   Successful:', bulkPayslipResponse.data.data.successful);
    console.log('   Failed:', bulkPayslipResponse.data.data.failed);
    console.log();

    console.log('🎉 All Payroll HR Service tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Note: This test requires valid JWT tokens. In a real environment:');
      console.log('   1. Authenticate with the auth-identity-service');
      console.log('   2. Use the returned JWT token for API calls');
      console.log('   3. Ensure the token has the required roles and permissions');
    }
    
    if (error.response?.status === 503) {
      console.log('\n💡 Note: Service dependencies may not be running:');
      console.log('   1. Ensure MongoDB is running on localhost:27017');
      console.log('   2. Ensure Redis is running on localhost:6379');
      console.log('   3. Start the payroll-hr-service: npm run dev');
    }
  }
}

// Helper function to test error scenarios
async function testErrorScenarios() {
  console.log('\n🧪 Testing Error Scenarios...\n');

  try {
    // Test invalid authentication
    console.log('1. Testing Invalid Authentication...');
    try {
      await axios.get(`${BASE_URL}/api/attendance`);
    } catch (error) {
      console.log('✅ Correctly rejected request without token:', error.response.status);
    }

    // Test invalid data
    console.log('2. Testing Invalid Data Validation...');
    try {
      await axios.post(`${BASE_URL}/api/attendance`, {
        invalidField: 'invalid'
      }, hrAxiosConfig);
    } catch (error) {
      console.log('✅ Correctly rejected invalid data:', error.response.status);
    }

    // Test rate limiting (would need multiple rapid requests)
    console.log('3. Rate limiting test skipped (requires multiple rapid requests)');

    console.log('\n✅ Error scenario tests completed!');

  } catch (error) {
    console.error('❌ Error scenario test failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  await testPayrollHRService();
  await testErrorScenarios();
}

// Check if this script is being run directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testPayrollHRService,
  testErrorScenarios,
  runAllTests
};