const express = require('express');
const NotificationService = require('../services/NotificationService');
const SMSService = require('../services/SMSService');
const WhatsAppService = require('../services/WhatsAppService');
const logger = require('../utils/logger');

const router = express.Router();
const notificationService = new NotificationService();
const smsService = new SMSService();
const whatsappService = new WhatsAppService();

/**
 * @route POST /api/webhooks/twilio/sms
 * @desc Handle Twilio SMS delivery status webhooks
 * @access Public (Webhook)
 */
router.post('/twilio/sms', async (req, res) => {
  try {
    logger.info('Twilio SMS webhook received', {
      messageSid: req.body.MessageSid,
      messageStatus: req.body.MessageStatus,
      from: req.body.From,
      to: req.body.To
    });

    await notificationService.handleDeliveryWebhook('twilio', req.body);

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Failed to process Twilio SMS webhook', {
      error: error.message,
      body: req.body
    });

    // Still return 200 to prevent Twilio from retrying
    res.status(200).send('ERROR');
  }
});

/**
 * @route POST /api/webhooks/twilio/whatsapp
 * @desc Handle Twilio WhatsApp delivery status webhooks
 * @access Public (Webhook)
 */
router.post('/twilio/whatsapp', async (req, res) => {
  try {
    logger.info('Twilio WhatsApp webhook received', {
      messageSid: req.body.MessageSid,
      messageStatus: req.body.MessageStatus,
      from: req.body.From,
      to: req.body.To
    });

    await notificationService.handleDeliveryWebhook('twilio', req.body);

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Failed to process Twilio WhatsApp webhook', {
      error: error.message,
      body: req.body
    });

    // Still return 200 to prevent Twilio from retrying
    res.status(200).send('ERROR');
  }
});

/**
 * @route POST /api/webhooks/twilio/whatsapp/incoming
 * @desc Handle incoming WhatsApp messages
 * @access Public (Webhook)
 */
router.post('/twilio/whatsapp/incoming', async (req, res) => {
  try {
    logger.info('Incoming WhatsApp message webhook received', {
      from: req.body.From,
      to: req.body.To,
      messageSid: req.body.MessageSid,
      profileName: req.body.ProfileName
    });

    await whatsappService.handleIncomingMessage(req.body);

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Failed to process incoming WhatsApp message', {
      error: error.message,
      body: req.body
    });

    // Still return 200 to prevent Twilio from retrying
    res.status(200).send('ERROR');
  }
});

/**
 * @route POST /api/webhooks/sendgrid/events
 * @desc Handle SendGrid email event webhooks
 * @access Public (Webhook)
 */
router.post('/sendgrid/events', async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    logger.info('SendGrid webhook received', {
      eventCount: events.length
    });

    for (const event of events) {
      logger.debug('SendGrid event', {
        event: event.event,
        email: event.email,
        timestamp: event.timestamp,
        messageId: event.sg_message_id
      });

      // Process each event
      await notificationService.handleDeliveryWebhook('sendgrid', event);
    }

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Failed to process SendGrid webhook', {
      error: error.message,
      body: req.body
    });

    // Still return 200 to prevent SendGrid from retrying
    res.status(200).send('ERROR');
  }
});

/**
 * @route POST /api/webhooks/gmail/push
 * @desc Handle Gmail push notifications (for email delivery tracking)
 * @access Public (Webhook)
 */
router.post('/gmail/push', async (req, res) => {
  try {
    logger.info('Gmail push notification received', {
      subscription: req.body.subscription,
      message: req.body.message
    });

    // Decode the message if it's base64 encoded
    let messageData = {};
    if (req.body.message && req.body.message.data) {
      const decodedData = Buffer.from(req.body.message.data, 'base64').toString();
      messageData = JSON.parse(decodedData);
    }

    logger.debug('Gmail push message data', messageData);

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Failed to process Gmail push notification', {
      error: error.message,
      body: req.body
    });

    res.status(200).send('ERROR');
  }
});

/**
 * @route GET /api/webhooks/test
 * @desc Test webhook endpoint
 * @access Public (for testing)
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
    query: req.query,
    headers: {
      'user-agent': req.get('User-Agent'),
      'x-forwarded-for': req.get('X-Forwarded-For'),
      'x-real-ip': req.get('X-Real-IP')
    }
  });
});

/**
 * @route POST /api/webhooks/test
 * @desc Test webhook endpoint with POST data
 * @access Public (for testing)
 */
router.post('/test', (req, res) => {
  logger.info('Test webhook POST received', {
    body: req.body,
    headers: req.headers,
    query: req.query
  });

  res.json({
    success: true,
    message: 'Test webhook POST received',
    timestamp: new Date().toISOString(),
    receivedData: {
      body: req.body,
      query: req.query,
      contentType: req.get('Content-Type')
    }
  });
});

/**
 * @route POST /api/webhooks/generic/:provider
 * @desc Generic webhook handler for other providers
 * @access Public (Webhook)
 */
router.post('/generic/:provider', async (req, res) => {
  try {
    const provider = req.params.provider;
    
    logger.info('Generic webhook received', {
      provider,
      contentType: req.get('Content-Type'),
      bodySize: JSON.stringify(req.body).length
    });

    // Log the webhook for debugging
    logger.debug('Generic webhook data', {
      provider,
      body: req.body,
      headers: req.headers
    });

    // You can add specific handling for different providers here
    switch (provider) {
      case 'mailgun':
        // Handle Mailgun webhooks
        break;
      case 'postmark':
        // Handle Postmark webhooks
        break;
      case 'firebase':
        // Handle Firebase push notification webhooks
        break;
      default:
        logger.warn('Unknown webhook provider', { provider });
    }

    res.status(200).json({
      success: true,
      message: 'Webhook received',
      provider
    });

  } catch (error) {
    logger.error('Failed to process generic webhook', {
      provider: req.params.provider,
      error: error.message,
      body: req.body
    });

    res.status(200).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
});

// Webhook verification middleware for specific providers
const verifyTwilioSignature = (req, res, next) => {
  // Implement Twilio signature verification
  // This is important for production security
  next();
};

const verifySendGridSignature = (req, res, next) => {
  // Implement SendGrid signature verification
  next();
};

// Apply verification middleware to specific routes
router.use('/twilio/*', verifyTwilioSignature);
router.use('/sendgrid/*', verifySendGridSignature);

module.exports = router;