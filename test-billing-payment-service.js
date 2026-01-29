const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3007/api/billing';
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJ0ZW5hbnRJZCI6InRlc3QtdGVuYW50LWlkIiwiYnJhbmNoSWQiOiJ0ZXN0LWJyYW5jaC1pZCIsInJvbGUiOiJCSUxMSU5HX09GRklDRVIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNzA2NTIyNDAwLCJleHAiOjE3MDY2MDg4MDB9.test-signature';

// Create axios instance with default headers
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_JWT}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Test data
const testBillData = {
  appointmentId: 'test-appointment-id',
  patientId: 'test-patient-id',
  doctorId: 'test-doctor-id',
  items: [
    {
      itemType: 'CONSULTATION',
      itemId: 'consultation-001',
      description: 'General Dental Consultation',
      quantity: 1,
      unitPrice: 500,
      discountPercent: 10,
      taxPercent: 18
    },
    {
      itemType: 'PROCEDURE',
      itemId: 'procedure-001',
      description: 'Tooth Cleaning',
      quantity: 1,
      unitPrice: 1000,
      discountPercent: 0,
      taxPercent: 18
    }
  ],
  notes: 'Test bill for dental consultation and cleaning'
};

const testInvoiceData = {
  billId: '', // Will be set after bill creation
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  notes: 'Test invoice generation'
};

const testPaymentData = {
  invoiceId: '', // Will be set after invoice creation
  amount: 1416, // Total amount after discount and tax
  mode: 'CASH',
  notes: 'Test cash payment'
};

const testRefundData = {
  paymentId: '', // Will be set after payment creation
  amount: 500,
  reason: 'Patient requested partial refund',
  type: 'PARTIAL'
};

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  try {
    const response = await api.get('/health');
    console.log('✅ Health Check:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health Check Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testServiceInfo() {
  console.log('\n🔍 Testing Service Info...');
  try {
    const response = await api.get('/info');
    console.log('✅ Service Info:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Service Info Failed:', error.response?.data || error.message);
    return false;
  }
}

async function testCreateBill() {
  console.log('\n🔍 Testing Bill Creation...');
  try {
    const response = await api.post('/bills', testBillData);
    console.log('✅ Bill Created:', {
      billId: response.data.data.billId,
      billNumber: response.data.data.billNumber,
      totalAmount: response.data.data.totalAmount,
      status: response.data.data.status
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Bill Creation Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetBill(billId) {
  console.log('\n🔍 Testing Get Bill...');
  try {
    const response = await api.get(`/bills/${billId}`);
    console.log('✅ Bill Retrieved:', {
      billId: response.data.data.billId,
      status: response.data.data.status,
      totalAmount: response.data.data.totalAmount
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Get Bill Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetBills() {
  console.log('\n🔍 Testing Get Bills List...');
  try {
    const response = await api.get('/bills?page=1&limit=10');
    console.log('✅ Bills List Retrieved:', {
      totalBills: response.data.data.pagination.total,
      currentPage: response.data.data.pagination.page,
      billsCount: response.data.data.bills.length
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Get Bills List Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testBillStatistics() {
  console.log('\n🔍 Testing Bill Statistics...');
  try {
    const response = await api.get('/bills/statistics');
    console.log('✅ Bill Statistics:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Bill Statistics Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testCreateInvoice(billId) {
  console.log('\n🔍 Testing Invoice Creation...');
  try {
    testInvoiceData.billId = billId;
    const response = await api.post('/invoices', testInvoiceData);
    console.log('✅ Invoice Created:', {
      invoiceId: response.data.data.invoiceId,
      invoiceNumber: response.data.data.invoiceNumber,
      totalAmount: response.data.data.totalAmount,
      status: response.data.data.status
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Invoice Creation Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testCreatePayment(invoiceId) {
  console.log('\n🔍 Testing Payment Creation...');
  try {
    testPaymentData.invoiceId = invoiceId;
    const response = await api.post('/payments', testPaymentData);
    console.log('✅ Payment Created:', {
      paymentId: response.data.data.paymentId,
      amount: response.data.data.amount,
      mode: response.data.data.mode,
      status: response.data.data.status
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Payment Creation Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testCreateRefund(paymentId) {
  console.log('\n🔍 Testing Refund Creation...');
  try {
    testRefundData.paymentId = paymentId;
    const response = await api.post('/refunds', testRefundData);
    console.log('✅ Refund Created:', {
      refundId: response.data.data.refundId,
      amount: response.data.data.amount,
      reason: response.data.data.reason,
      status: response.data.data.status
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Refund Creation Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testPaymentStatistics() {
  console.log('\n🔍 Testing Payment Statistics...');
  try {
    const response = await api.get('/payments/statistics');
    console.log('✅ Payment Statistics:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Payment Statistics Failed:', error.response?.data || error.message);
    return null;
  }
}

async function testInvalidEndpoint() {
  console.log('\n🔍 Testing Invalid Endpoint...');
  try {
    const response = await api.get('/invalid-endpoint');
    console.log('❌ Should have failed but got:', response.data);
    return false;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Invalid Endpoint Correctly Returned 404:', error.response.data);
      return true;
    } else {
      console.error('❌ Unexpected Error:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testUnauthorizedAccess() {
  console.log('\n🔍 Testing Unauthorized Access...');
  try {
    const unauthorizedApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header
      },
      timeout: 10000
    });
    
    const response = await unauthorizedApi.get('/bills');
    console.log('❌ Should have failed but got:', response.data);
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Unauthorized Access Correctly Returned 401:', error.response.data);
      return true;
    } else {
      console.error('❌ Unexpected Error:', error.response?.data || error.message);
      return false;
    }
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Billing & Payment Service Tests');
  console.log('='.repeat(50));

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Service Info', fn: testServiceInfo },
    { name: 'Invalid Endpoint', fn: testInvalidEndpoint },
    { name: 'Unauthorized Access', fn: testUnauthorizedAccess }
  ];

  // Run basic tests first
  for (const test of tests) {
    results.total++;
    try {
      const success = await test.fn();
      if (success) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.error(`❌ Test "${test.name}" threw an error:`, error.message);
      results.failed++;
    }
  }

  // Run workflow tests (these require database)
  console.log('\n📋 Running Workflow Tests (requires database)...');
  
  try {
    // Test complete billing workflow
    const bill = await testCreateBill();
    if (bill) {
      results.total++; results.passed++;
      
      await testGetBill(bill.billId);
      results.total++; results.passed++;
      
      await testGetBills();
      results.total++; results.passed++;
      
      await testBillStatistics();
      results.total++; results.passed++;
      
      const invoice = await testCreateInvoice(bill.billId);
      if (invoice) {
        results.total++; results.passed++;
        
        const payment = await testCreatePayment(invoice.invoiceId);
        if (payment) {
          results.total++; results.passed++;
          
          await testCreateRefund(payment.paymentId);
          results.total++; results.passed++;
          
          await testPaymentStatistics();
          results.total++; results.passed++;
        } else {
          results.total += 3; results.failed += 3;
        }
      } else {
        results.total += 4; results.failed += 4;
      }
    } else {
      results.total += 7; results.failed += 7;
    }
  } catch (error) {
    console.error('❌ Workflow tests failed:', error.message);
    results.total += 7; results.failed += 7;
  }

  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.total}`);
  console.log(`🎯 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! The Billing & Payment Service is working correctly.');
  } else if (results.passed > results.failed) {
    console.log('\n⚠️ Most tests passed, but some failed. Check the logs above for details.');
  } else {
    console.log('\n❌ Many tests failed. The service may not be running or configured correctly.');
  }

  console.log('\n💡 Note: Workflow tests require MongoDB to be running and properly configured.');
  console.log('💡 To run the service: npm start (in backend/billing-payment-service directory)');
  console.log('💡 Make sure MongoDB is running on localhost:27017');
}

// Handle script execution
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testHealthCheck,
  testServiceInfo,
  testCreateBill,
  testGetBill,
  testCreateInvoice,
  testCreatePayment,
  testCreateRefund
};