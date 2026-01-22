# Token Queue Realtime Service API Documentation

## Overview

The Token Queue Realtime Service provides comprehensive queue management and real-time token tracking for dental clinics. It supports multiple check-in methods, real-time broadcasting, and role-based access control.

## Base URL
```
http://localhost:3005/api
```

## Authentication

All API endpoints require JWT authentication via the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Token Management Endpoints

### Generate Token
**POST** `/tokens/generate`

Generate a new queue token for a patient.

**Request Body:**
```json
{
  "patientId": "string",
  "patientName": "string", 
  "patientPhone": "string",
  "doctorId": "string",
  "doctorName": "string",
  "departmentId": "string",
  "departmentName": "string",
  "branchId": "string",
  "tenantId": "string",
  "tokenType": "APPOINTMENT|WALK_IN|PRIORITY",
  "appointmentId": "string (optional)",
  "scheduledTime": "ISO date string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "token_id",
    "tokenNumber": "001",
    "displayToken": "W001",
    "tokenType": "WALK_IN",
    "status": "GENERATED",
    "patientName": "John Doe",
    "doctorName": "Dr. Smith",
    "queuePosition": 1,
    "estimatedWaitTime": 15,
    "qrCode": "base64_qr_code",
    "createdAt": "2024-01-22T10:00:00Z"
  }
}
```

### Get Token Details
**GET** `/tokens/:tokenId`

Retrieve details of a specific token.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "token_id",
    "tokenNumber": "001",
    "status": "WAITING",
    "patientName": "John Doe",
    "queuePosition": 3,
    "estimatedWaitTime": 45
  }
}
```

### Get Patient Tokens
**GET** `/tokens/patient/:patientId?branchId=branch_id`

Get all tokens for a specific patient.

### Get Queue Tokens
**GET** `/tokens/queue/:branchId/:doctorId?includeCompleted=false`

Get all tokens in a specific doctor's queue.

### Skip Token
**PATCH** `/tokens/:tokenId/skip`

Skip a token with a reason.

**Request Body:**
```json
{
  "reason": "Patient not present"
}
```

### Complete Token
**PATCH** `/tokens/:tokenId/complete`

Mark a token as completed.

### Mark No-Show
**PATCH** `/tokens/:tokenId/no-show`

Mark a token as no-show.

## Queue Management Endpoints

### Get Queue Status
**GET** `/queues/:branchId/:doctorId`

Get current status of a specific queue.

**Response:**
```json
{
  "success": true,
  "data": {
    "queue": {
      "queueId": "branch_doctor",
      "status": "ACTIVE",
      "totalTokens": 10,
      "waitingTokens": 5,
      "currentTokenNumber": "003",
      "averageConsultationTime": 15
    },
    "tokens": [...],
    "currentToken": {...},
    "queueLength": 5,
    "estimatedWaitTime": 75
  }
}
```

### Get Branch Queues
**GET** `/queues/branch/:branchId`

Get all active queues in a branch.

### Call Next Token
**POST** `/queues/:branchId/:doctorId/call-next`

Call the next token in the queue.

**Response:**
```json
{
  "success": true,
  "data": {
    "token": {...},
    "queue": {...}
  }
}
```

### Pause Queue
**POST** `/queues/:branchId/:doctorId/pause`

Pause a queue with a reason.

**Request Body:**
```json
{
  "reason": "Doctor break"
}
```

### Resume Queue
**POST** `/queues/:branchId/:doctorId/resume`

Resume a paused queue.

### Reorder Queue
**POST** `/queues/:branchId/:doctorId/reorder`

Manually reorder tokens in a queue.

**Request Body:**
```json
{
  "tokenOrder": ["token_id_1", "token_id_2", "token_id_3"]
}
```

### Insert Priority Token
**POST** `/queues/:branchId/:doctorId/priority`

Insert a token as priority at a specific position.

**Request Body:**
```json
{
  "tokenId": "token_id",
  "position": 1
}
```

## Check-in Endpoints

### QR Code Check-in
**POST** `/checkin/qr`

Check-in using QR code scan.

**Request Body:**
```json
{
  "qrData": "JSON string from QR code",
  "location": "Reception",
  "device": "iPad-001"
}
```

### NFC Check-in
**POST** `/checkin/nfc`

Check-in using NFC card/device.

**Request Body:**
```json
{
  "nfcData": "NFC data object or string",
  "location": "Reception",
  "device": "NFC-Reader-001"
}
```

### Manual Check-in
**POST** `/checkin/manual`

Manual check-in by staff.

**Request Body:**
```json
{
  "tokenId": "token_id",
  "patientId": "patient_id",
  "location": "Reception",
  "reason": "Manual check-in"
}
```

### Bulk Check-in
**POST** `/checkin/bulk`

Check-in multiple tokens at once.

**Request Body:**
```json
{
  "tokens": [
    {
      "tokenId": "token_id_1",
      "method": "MANUAL",
      "location": "Reception"
    },
    {
      "tokenId": "token_id_2", 
      "method": "QR",
      "location": "Waiting Area"
    }
  ]
}
```

## Doctor Interface Endpoints

### Get Doctor's Queue
**GET** `/doctor/queue`

Get the authenticated doctor's queue status.

### Call Next Patient
**POST** `/doctor/call-next`

Call the next patient in the doctor's queue.

## Analytics Endpoints

### Queue Analytics
**GET** `/analytics/queue/:branchId/:doctorId?startDate=date&endDate=date`

Get analytics for a specific queue.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTokens": 50,
    "completedTokens": 45,
    "noShowTokens": 3,
    "skippedTokens": 2,
    "appointmentTokens": 30,
    "walkInTokens": 20,
    "averageWaitTime": 25,
    "averageConsultationTime": 18
  }
}
```

### Branch Analytics
**GET** `/analytics/branch/:branchId?date=date`

Get daily analytics for a branch.

## WebSocket Events

### Connection
Connect to WebSocket with JWT token:
```javascript
const socket = io('http://localhost:3005', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Client Events (Emit)

#### Join Queue Room
```javascript
socket.emit('join-queue', {
  branchId: 'branch_id',
  doctorId: 'doctor_id',
  queueType: 'doctor'
});
```

#### Call Next Token
```javascript
socket.emit('call-next-token', {
  branchId: 'branch_id',
  doctorId: 'doctor_id'
});
```

#### Skip Token
```javascript
socket.emit('skip-token', {
  tokenId: 'token_id',
  reason: 'Patient not present'
});
```

### Server Events (Listen)

#### Queue Status
```javascript
socket.on('queue-status', (data) => {
  console.log('Queue status:', data);
});
```

#### Token Called
```javascript
socket.on('token-called', (data) => {
  console.log('Token called:', data.token.displayToken);
});
```

#### Queue Updated
```javascript
socket.on('queue-updated', (data) => {
  console.log('Queue updated:', data);
});
```

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API requests are limited to 1000 requests per 15-minute window per IP address.

## Data Models

### Token Status Flow
```
GENERATED → WAITING → CHECKED_IN → IN_CONSULTATION → COMPLETED
                  ↘ SKIPPED
                  ↘ NO_SHOW
```

### Queue Status
- `ACTIVE` - Queue is running normally
- `PAUSED` - Queue is temporarily paused
- `CLOSED` - Queue is closed for the day

### Token Types
- `APPOINTMENT` - Pre-scheduled appointment
- `WALK_IN` - Walk-in patient
- `PRIORITY` - Priority/emergency case