module.exports = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster0.ozkxezh.mongodb.net/dentamate_queue?appName=Cluster0'
  },
  redis: {
    uri: process.env.REDIS_URI || 'redis://localhost:6379'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  queue: {
    tokenResetTime: process.env.TOKEN_RESET_TIME || '00:00', // Daily reset time
    defaultConsultationTime: parseInt(process.env.DEFAULT_CONSULTATION_TIME) || 15, // minutes
    maxWaitingTime: parseInt(process.env.MAX_WAITING_TIME) || 180, // minutes
    skipTimeout: parseInt(process.env.SKIP_TIMEOUT) || 10, // minutes
    priorityTokenPrefix: process.env.PRIORITY_TOKEN_PREFIX || 'P',
    walkInTokenPrefix: process.env.WALKIN_TOKEN_PREFIX || 'W'
  },
  notification: {
    appointmentServiceUrl: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:8080',
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006'
  }
};