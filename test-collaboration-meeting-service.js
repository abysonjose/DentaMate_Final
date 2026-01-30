const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3012';
const API_GATEWAY_URL = 'http://localhost:3000';

// Test JWT token - create a simple one for testing
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'dentamate-collaboration-jwt-secret-2024-super-secure-key';

const testUser = {
  userId: 'test-doctor-001',
  tenantId: 'test-tenant-001',
  branchId: 'test-branch-001',
  role: 'DOCTOR',
  name: 'Dr. John Doe',
  email: 'test@example.com'
};

const TEST_TOKEN = jwt.sign(testUser, JWT_SECRET, { expiresIn: '24h' });

// Test data
const testData = {
  collaboration: {
    caseId: 'test-case-001',
    patientId: 'test-patient-001',
    sharedWith: [
      {
        userId: 'test-specialist-001',
        name: 'Dr. Jane Smith',
        role: 'SPECIALIST',
        permissions: 'COMMENT'
      }
    ],
    caseDetails: {
      title: 'Complex Orthodontic Case - Patient John Doe',
      description: 'Patient requires comprehensive orthodontic treatment with possible surgical intervention',
      specialty: 'Orthodontics',
      urgency: 'MEDIUM'
    }
  },
  meeting: {
    caseId: 'test-case-001',
    collaborationId: '', // Will be set after creating collaboration
    meetingDetails: {
      title: 'Case Discussion - John Doe Treatment Plan',
      description: 'Discuss treatment options and surgical requirements',
      agenda: [
        'Review diagnostic images',
        'Discuss treatment timeline',
        'Plan surgical intervention'
      ],
      meetingType: 'VIRTUAL',
      urgency: 'MEDIUM'
    },
    schedule: {
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration: 60, // 1 hour
      timezone: 'UTC'
    },
    participants: [
      {
        userId: 'test-specialist-001',
        name: 'Dr. Jane Smith',
        role: 'SPECIALIST',
        isRequired: true
      }
    ]
  },
  discussion: {
    caseId: 'test-case-001',
    collaborationId: '', // Will be set after creating collaboration
    content: 'I have reviewed the diagnostic images and believe we should consider a two-phase treatment approach.',
    discussionType: 'SUGGESTION',
    metadata: {
      priority: 'MEDIUM',
      tags: ['treatment-plan', 'orthodontics']
    }
  }
};

// HTTP client with default headers
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Test functions
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  try {
    const response = await client.get('/health');
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.response?.data || error.message);
    return false;
  }
}

async function testShareCase() {
  console.log('\n📤 Testing Case Sharing...');
  try {
    const response = await client.post('/api/collaboration/cases/share', testData.collaboration);
    console.log('✅ Case shared successfully:', {
      collaborationId: response.data.data.collaborationId,
      caseId: response.data.data.caseId,
      participants: response.data.data.sharedWith.length
    });
    
    // Store collaboration ID for other tests
    testData.meeting.collaborationId = response.data.data.collaborationId;
    testData.discussion.collaborationId = response.data.data.collaborationId;
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Case sharing failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetCollaboration(collaborationId) {
  console.log('\n📋 Testing Get Collaboration...');
  try {
    const response = await client.get(`/api/collaboration/cases/${collaborationId}`);
    console.log('✅ Collaboration retrieved:', {
      collaborationId: response.data.data.collaborationId,
      status: response.data.data.collaborationStatus,
      participants: response.data.data.sharedWith.length,
      userPermissions: response.data.data.userPermissions
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Get collaboration failed:', error.response?.data || error.message);
    return null;
  }
}

async function testCreateDiscussion() {
  console.log('\n💬 Testing Discussion Creation...');
  try {
    const response = await client.post('/api/discussions', testData.discussion);
    console.log('✅ Discussion created:', {
      discussionId: response.data.data.discussionId,
      type: response.data.data.discussionType,
      author: response.data.data.author.name
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Discussion creation failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetDiscussions(caseId) {
  console.log('\n📖 Testing Get Discussions...');
  try {
    const response = await client.get(`/api/discussions/case/${caseId}`);
    console.log('✅ Discussions retrieved:', {
      count: response.data.data.length,
      discussions: response.data.data.map(d => ({
        id: d.discussionId,
        type: d.discussionType,
        author: d.author.name
      }))
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Get discussions failed:', error.response?.data || error.message);
    return null;
  }
}

async function testScheduleMeeting() {
  console.log('\n📅 Testing Meeting Scheduling...');
  try {
    const response = await client.post('/api/meetings', testData.meeting);
    console.log('✅ Meeting scheduled:', {
      meetingId: response.data.data.meetingId,
      scheduledAt: response.data.data.schedule.scheduledAt,
      participants: response.data.data.participants.length,
      status: response.data.data.status
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Meeting scheduling failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetUserMeetings() {
  console.log('\n📋 Testing Get User Meetings...');
  try {
    const response = await client.get('/api/meetings');
    console.log('✅ User meetings retrieved:', {
      count: response.data.data.length,
      meetings: response.data.data.map(m => ({
        id: m.meetingId,
        title: m.meetingDetails.title,
        status: m.status,
        scheduledAt: m.schedule.scheduledAt
      }))
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Get user meetings failed:', error.response?.data || error.message);
    return null;
  }
}

async function testMeetingResponse(meetingId) {
  console.log('\n✅ Testing Meeting Response...');
  try {
    const response = await client.post(`/api/meetings/${meetingId}/response`, {
      responseStatus: 'ACCEPTED'
    });
    console.log('✅ Meeting response recorded:', {
      meetingId: response.data.data.meetingId,
      status: response.data.data.status
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Meeting response failed:', error.response?.data || error.message);
    return null;
  }
}

async function testCreateMeetingNote(meetingId) {
  console.log('\n📝 Testing Meeting Note Creation...');
  try {
    const noteData = {
      noteContent: {
        title: 'Treatment Plan Discussion Summary',
        content: 'We discussed the comprehensive treatment approach for the patient. Key decisions made include proceeding with Phase 1 treatment and scheduling surgical consultation.',
        noteType: 'SUMMARY',
        priority: 'HIGH'
      },
      actionItems: [
        {
          description: 'Schedule surgical consultation with Dr. Wilson',
          assignedTo: {
            userId: 'test-specialist-001',
            name: 'Dr. Jane Smith',
            role: 'SPECIALIST'
          },
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
          priority: 'HIGH'
        }
      ],
      decisions: [
        {
          decision: 'Proceed with two-phase orthodontic treatment',
          rationale: 'Patient age and complexity of case support phased approach',
          impact: 'HIGH'
        }
      ]
    };

    const response = await client.post(`/api/meetings/${meetingId}/notes`, noteData);
    console.log('✅ Meeting note created:', {
      noteId: response.data.data.noteId,
      title: response.data.data.noteContent.title,
      actionItems: response.data.data.actionItems.length,
      decisions: response.data.data.decisions.length
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Meeting note creation failed:', error.response?.data || error.message);
    return null;
  }
}

async function testCollaborationStats() {
  console.log('\n📊 Testing Collaboration Statistics...');
  try {
    const response = await client.get('/api/collaboration/stats?period=30d');
    console.log('✅ Collaboration stats retrieved:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Collaboration stats failed:', error.response?.data || error.message);
    return null;
  }
}

async function testMeetingStats() {
  console.log('\n📈 Testing Meeting Statistics...');
  try {
    const response = await client.get('/api/meetings/stats/overview?period=30d');
    console.log('✅ Meeting stats retrieved:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Meeting stats failed:', error.response?.data || error.message);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Collaboration & Meeting Service Tests...');
  console.log('='.repeat(60));

  let collaborationId, meetingId;

  // Test 1: Health Check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Service is not healthy. Stopping tests.');
    return;
  }

  // Test 2: Share Case
  const collaboration = await testShareCase();
  if (collaboration) {
    collaborationId = collaboration.collaborationId;
  }

  // Test 3: Get Collaboration
  if (collaborationId) {
    await testGetCollaboration(collaborationId);
  }

  // Test 4: Create Discussion
  if (collaborationId) {
    await testCreateDiscussion();
  }

  // Test 5: Get Discussions
  if (collaborationId) {
    await testGetDiscussions(testData.collaboration.caseId);
  }

  // Test 6: Schedule Meeting
  if (collaborationId) {
    const meeting = await testScheduleMeeting();
    if (meeting) {
      meetingId = meeting.meetingId;
    }
  }

  // Test 7: Get User Meetings
  await testGetUserMeetings();

  // Test 8: Meeting Response
  if (meetingId) {
    await testMeetingResponse(meetingId);
  }

  // Test 9: Create Meeting Note
  if (meetingId) {
    await testCreateMeetingNote(meetingId);
  }

  // Test 10: Collaboration Statistics
  await testCollaborationStats();

  // Test 11: Meeting Statistics
  await testMeetingStats();

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Collaboration & Meeting Service Tests Completed!');
  console.log('\n📋 Test Summary:');
  console.log(`- Service Health: ${healthOk ? '✅' : '❌'}`);
  console.log(`- Case Sharing: ${collaboration ? '✅' : '❌'}`);
  console.log(`- Meeting Scheduling: ${meetingId ? '✅' : '❌'}`);
  console.log('\n💡 Next Steps:');
  console.log('1. Test real-time collaboration features with Socket.IO');
  console.log('2. Test file attachment functionality');
  console.log('3. Test integration with notification service');
  console.log('4. Test meeting join/leave functionality');
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});