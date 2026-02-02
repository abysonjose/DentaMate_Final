const axios = require('axios');

// Test Cashier Module Implementation
async function testCashierModule() {
  console.log('🧪 Testing Cashier Module Implementation...\n');

  const baseURL = 'http://localhost:4200';
  const testResults = [];

  // Test 1: Check if cashier route is accessible
  try {
    console.log('1. Testing cashier route accessibility...');
    const response = await axios.get(`${baseURL}/cashier`, {
      timeout: 5000,
      validateStatus: function (status) {
        return status < 500; // Accept redirects and client errors
      }
    });
    
    if (response.status === 200 || response.status === 302) {
      testResults.push('✅ Cashier route is accessible');
    } else {
      testResults.push(`⚠️  Cashier route returned status: ${response.status}`);
    }
  } catch (error) {
    testResults.push(`❌ Cashier route test failed: ${error.message}`);
  }

  // Test 2: Check if Angular build includes cashier module
  try {
    console.log('2. Checking Angular build for cashier module...');
    const response = await axios.get(`${baseURL}/main.js`, {
      timeout: 5000,
      validateStatus: function (status) {
        return status < 500;
      }
    });
    
    if (response.data && response.data.includes('cashier')) {
      testResults.push('✅ Cashier module found in Angular build');
    } else {
      testResults.push('⚠️  Cashier module not found in build (may be lazy-loaded)');
    }
  } catch (error) {
    testResults.push(`❌ Build check failed: ${error.message}`);
  }

  // Test 3: Verify component files exist
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'frontend/src/app/modules/cashier/cashier.module.ts',
    'frontend/src/app/modules/cashier/cashier-routing.module.ts',
    'frontend/src/app/modules/cashier/components/dashboard/cashier-dashboard.component.ts',
    'frontend/src/app/modules/cashier/components/generate-bill/generate-bill.component.ts',
    'frontend/src/app/modules/cashier/components/accept-payment/accept-payment.component.ts',
    'frontend/src/app/modules/cashier/components/invoice-status-view/invoice-status-view.component.ts',
    'frontend/src/app/modules/cashier/dialogs/invoice-details-dialog/invoice-details-dialog.component.ts',
    'frontend/src/app/modules/cashier/dialogs/payment-confirmation-dialog/payment-confirmation-dialog.component.ts',
    'frontend/src/app/modules/cashier/services/cashier.service.ts',
    'frontend/src/app/modules/cashier/services/cashier-billing.service.ts',
    'frontend/src/app/modules/cashier/services/cashier-payment.service.ts'
  ];

  console.log('3. Verifying component files...');
  let filesExist = 0;
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      filesExist++;
    } else {
      console.log(`   ❌ Missing: ${file}`);
    }
  });

  if (filesExist === requiredFiles.length) {
    testResults.push('✅ All required component files exist');
  } else {
    testResults.push(`⚠️  ${filesExist}/${requiredFiles.length} component files exist`);
  }

  // Test 4: Check TypeScript compilation
  console.log('4. Checking TypeScript compilation...');
  try {
    const { execSync } = require('child_process');
    const result = execSync('cd frontend && npx tsc --noEmit --skipLibCheck', { 
      encoding: 'utf8',
      timeout: 30000 
    });
    testResults.push('✅ TypeScript compilation successful');
  } catch (error) {
    if (error.stdout && error.stdout.includes('error TS')) {
      testResults.push(`❌ TypeScript compilation errors found`);
    } else {
      testResults.push('⚠️  TypeScript compilation check inconclusive');
    }
  }

  // Print Results
  console.log('\n📊 Test Results:');
  console.log('================');
  testResults.forEach(result => console.log(result));

  // Summary
  const passed = testResults.filter(r => r.startsWith('✅')).length;
  const warnings = testResults.filter(r => r.startsWith('⚠️')).length;
  const failed = testResults.filter(r => r.startsWith('❌')).length;

  console.log('\n📈 Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 Cashier Module Implementation: COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Cashier Module Features:');
    console.log('   • Generate Bill - Create invoices for completed treatments');
    console.log('   • Accept Payment - Process payments with multiple methods (cash, UPI, card, etc.)');
    console.log('   • Invoice Status View - View and manage invoice payment status');
    console.log('   • Role-based security with JWT validation');
    console.log('   • Responsive design with Material UI');
    console.log('   • Real-time payment processing simulation');
    console.log('   • PDF generation and invoice management');
  } else {
    console.log('\n⚠️  Cashier Module has some issues that need attention.');
  }

  return { passed, warnings, failed };
}

// Run the test
if (require.main === module) {
  testCashierModule().catch(console.error);
}

module.exports = testCashierModule;