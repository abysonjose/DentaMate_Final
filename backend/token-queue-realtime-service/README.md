# Token Queue Realtime Service

A real-time token and queue management service for DentaMate dental clinic automation system.

## Features

- **Token Generation**: Auto-generate tokens for appointments and walk-ins
- **Real-time Queue Management**: Live queue state tracking and broadcasting
- **Multi-channel Check-in**: QR code, NFC, and manual check-in support
- **Doctor Queue Control**: Call next, skip, complete tokens
- **Role-based Access Control**: Secure access based on user roles
- **Real-time Broadcasting**: WebSocket-based live updates
- **Audit Logging**: Complete audit trail of all queue actions
- **Analytics**: Queue performance metrics and statistics

## Tech Stack

- **Runtime**: Node.js v24
- **Framework**: Express.js
- **Database**: MongoDB (primary), Redis (caching/sessions)
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **Validation**: Joi
- **Logging**: Winston

## API Endpoints

### Token Management
- `POST /api/tokens/generate` - Generate new token
- `GET /api/tokens/:tokenId` - Get token details
- `GET /api/tokens/patient/:patientId` - Get patient tokens
- `GET /api/tokens/queue/:branchId/:doctorId` - Get queue tokens
- `PATCH /api/tokens/:tokenId/skip` - Skip token
- `PATCH /api/tokens/:tokenId/complete` - Complete token
- `PATCH /api/tokens/:tokenId/no-show` - Mark as no-show

### Queue Management
- `GET /api/queues/:branchId/:doctorId` - Get queue status
- `GET /api/queues/branch/:branchId` - Get all branch queues
- `POST /api/queues/:branchId/:doctorId/call-next` - Call next token
- `POST /api/queues/:branchId/:doctorId/pause` - Pause queue
- `POST /api/queues/:branchId/:doctorId/resume` - Resume queue
- `POST /api/queues/:branchId/:doctorId/reorder` - Reorder queue
- `PATCH /api/queues/:branchId/:doctorId/settings` - Update settings

### Check-in
- `POST /api/checkin/qr` - QR code check-in
- `POST /api/checkin/nfc` - NFC check-in
- `POST /api/checkin/manual` - Manual check-in
- `POST /api/checkin/bulk` - Bulk check-in

### Doctor Interface
- `GET /api/doctor/queue` - Get doctor's queue
- `POST /api/doctor/call-next` - Call next patient

### Analytics
- `GET /api/analytics/queue/:branchId/:doctorId` - Queue analytics
- `GET /api/analytics/branch/:branchId` - Branch analytics

## WebSocket Events

### Client Events (Emit)
- `join-queue` - Join queue room
- `leave-queue` - Leave queue room
- `get-queue-status` - Request queue status
- `call-next-token` - Call next token
- `pause-queue` - Pause queue
- `resume-queue` - Resume queue
- `skip-token` - Skip token
- `complete-token` - Complete token
- `check-in-token` - Check-in token

### Server Events (Listen)
- `queue-status` - Current queue status
- `queue-updated` - Queue state changed
- `token-called` - Token called for consultation
- `token-skipped` - Token skipped
- `token-completed` - Token consultation completed
- `token-checked-in` - Token checked in
- `queue-paused` - Queue paused
- `queue-resumed` - Queue resumed
- `error` - Error occurred

## Environment Variables

```env
PORT=3005
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dentamate_queue
REDIS_URI=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:4200
LOG_LEVEL=info
TOKEN_RESET_TIME=00:00
DEFAULT_CONSULTATION_TIME=15
MAX_WAITING_TIME=180
SKIP_TIMEOUT=10
APPOINTMENT_SERVICE_URL=http://localhost:8080
NOTIFICATION_SERVICE_URL=http://localhost:3006
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the service:
```bash
# Development
npm run dev

# Production
npm start
```

## Docker

Build and run with Docker:

```bash
# Build image
docker build -t dentamate-queue-service .

# Run container
docker run -p 3005:3005 --env-file .env dentamate-queue-service
```

## Integration

### With Appointment Service
- Receives appointment data for token generation
- Validates appointment existence
- Updates appointment status

### With Notification Service
- Sends queue status updates
- Patient notifications for token calls
- SMS/Email alerts

### With Frontend
- Real-time queue displays
- Doctor dashboards
- Patient mobile apps
- Reception interfaces

## Security

- JWT-based authentication
- Role-based access control
- Tenant isolation
- Rate limiting
- Input validation
- Audit logging

## Monitoring

- Health check endpoint: `GET /health`
- Winston logging with file rotation
- Error tracking and alerting
- Performance metrics
- Queue analytics

## License

MIT License - DentaMate Team