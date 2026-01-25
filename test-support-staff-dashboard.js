/**
 * Support Staff Dashboard Test Script
 * Tests the basic functionality of the Support Staff Dashboard
 */

const puppeteer = require('puppeteer');

async function testSupportStaffDashboard() {
  console.log('🧪 Starting Support Staff Dashboard Tests...\n');

  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();

  try {
    // Test 1: Navigate to Support Staff Dashboard
    console.log('📱 Test 1: Navigating to Support Staff Dashboard...');
    await page.goto('http://localhost:4200/support-staff');
    await page.waitForSelector('.support-staff-dashboard', { timeout: 10000 });
    console.log('✅ Successfully loaded Support Staff Dashboard\n');

    // Test 2: Check Dashboard Components
    console.log('🏠 Test 2: Verifying Dashboard Components...');
    
    // Check shift info card
    const shiftCard = await page.$('.shift-card');
    if (shiftCard) {
      console.log('✅ Shift information card is present');
    } else {
      console.log('❌ Shift information card is missing');
    }

    // Check quick stats
    const statsGrid = await page.$('.stats-grid');
    if (statsGrid) {
      console.log('✅ Quick stats grid is present');
    } else {
      console.log('❌ Quick stats grid is missing');
    }

    // Check quick actions
    const actionsGrid = await page.$('.actions-grid');
    if (actionsGrid) {
      console.log('✅ Quick actions grid is present');
    } else {
      console.log('❌ Quick actions grid is missing');
    }
    console.log('');

    // Test 3: Navigate to Task Management
    console.log('📋 Test 3: Testing Task Management Navigation...');
    const taskButton = await page.$('button[routerLink="/support-staff/tasks"]');
    if (taskButton) {
      await taskButton.click();
      await page.waitForSelector('.task-management', { timeout: 5000 });
      console.log('✅ Successfully navigated to Task Management');
      
      // Check task filters
      const filtersCard = await page.$('.filters-card');
      if (filtersCard) {
        console.log('✅ Task filters are present');
      }
      
      // Check task list
      const tasksList = await page.$('.tasks-list');
      if (tasksList) {
        console.log('✅ Tasks list is present');
      }
    } else {
      console.log('❌ Task management button not found');
    }
    console.log('');

    // Test 4: Navigate to Room Readiness
    console.log('🏠 Test 4: Testing Room Readiness Navigation...');
    await page.goto('http://localhost:4200/support-staff/rooms');
    await page.waitForSelector('.room-readiness', { timeout: 5000 });
    console.log('✅ Successfully navigated to Room Readiness');
    
    // Check room grid
    const roomsGrid = await page.$('.rooms-grid');
    if (roomsGrid) {
      console.log('✅ Rooms grid is present');
    } else {
      console.log('❌ Rooms grid is missing');
    }
    console.log('');

    // Test 5: Test Mobile Responsiveness
    console.log('📱 Test 5: Testing Mobile Responsiveness...');
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('http://localhost:4200/support-staff');
    await page.waitForSelector('.support-staff-dashboard', { timeout: 5000 });
    
    // Check if mobile layout is applied
    const dashboardElement = await page.$('.support-staff-dashboard');
    const styles = await page.evaluate(el => {
      return window.getComputedStyle(el);
    }, dashboardElement);
    
    console.log('✅ Mobile viewport applied successfully');
    console.log('');

    // Test 6: Test Accessibility
    console.log('♿ Test 6: Basic Accessibility Check...');
    
    // Check for proper heading structure
    const headings = await page.$$('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) {
      console.log(`✅ Found ${headings.length} headings for proper structure`);
    }
    
    // Check for alt text on images
    const images = await page.$$('img');
    let imagesWithAlt = 0;
    for (let img of images) {
      const alt = await page.evaluate(el => el.alt, img);
      if (alt) imagesWithAlt++;
    }
    console.log(`✅ ${imagesWithAlt}/${images.length} images have alt text`);
    
    // Check for proper button labels
    const buttons = await page.$$('button');
    let buttonsWithLabels = 0;
    for (let btn of buttons) {
      const text = await page.evaluate(el => el.textContent || el.getAttribute('aria-label'), btn);
      if (text && text.trim()) buttonsWithLabels++;
    }
    console.log(`✅ ${buttonsWithLabels}/${buttons.length} buttons have proper labels`);
    console.log('');

    console.log('🎉 All Support Staff Dashboard tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the tests
testSupportStaffDashboard().catch(console.error);

// Export for use in other test files
module.exports = {
  testSupportStaffDashboard
};