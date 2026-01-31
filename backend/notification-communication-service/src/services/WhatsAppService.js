const twilio = require('twilio');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.fromNumber = process.env.WHATSAPP_PHONE_NUMBER;
    this.initializeService();
  }

  initializeService() {
    try {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        logger.warn('Twilio credentials not configured, WhatsApp service disabled');
        return;
      }

      if (!this.fromNumber) {
        logger.warn('WhatsApp phone number not configured, service disabled');
        return;
      }

      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      logger.info('Twilio WhatsApp service initialized');
    } catch (error) {
      logger.error('Failed to initialize Twilio WhatsApp service', {
        error: error.message
      });
    }
  }

  async send(notification) {
    try {
      if (!this.client) {
        throw new Error('WhatsApp service not initialized');
      }

      // Get recipient WhatsApp number
      const recipientPhone = await this.getRecipientWhatsAppNumber(notification);
      if (!recipientPhone) {
        throw new Error('Recipient WhatsApp number not found');
      }

      // Format WhatsApp number
      const formattedPhone = this.formatWhatsAppNumber(recipientPhone);
      if (!formattedPhone) {
        throw new Error('Invalid WhatsApp number format');
      }

      // Prepare WhatsApp message content
      const messageContent = this.formatWhatsAppContent(notification);

      const messageOptions = {
        body: messageContent,
        from: this.fromNumber,
        to: formattedPhone,
        statusCallback: `${process.env.BASE_URL}/api/webhooks/twilio/whatsapp`
      };

      const result = await this.client.messages.create(messageOptions);

      logger.info('WhatsApp message sent successfully', {
        notificationId: notification.notificationId,
        messageSid: result.sid,
        recipientPhone: this.maskPhoneNumber(formattedPhone)
      });

      return {
        success: true,
        externalId: result.sid,
        providerDetails: {
          provider: 'twilio-whatsapp',
          providerMessageId: result.sid,
          status: result.status
        }
      };

    } catch (error) {
      logger.error('WhatsApp sending failed', {
        notificationId: notification.notificationId,
        error: error.message,
        errorCode: error.code,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        errorDetails: {
          errorCode: error.code,
          errorDescription: error.message,
          moreInfo: error.moreInfo
        }
      };
    }
  }

  async getRecipientWhatsAppNumber(notification) {
    try {
      // First check notification preferences
      const NotificationPreference = require('../models/NotificationPreference');
      const preferences = await NotificationPreference.findByUser(
        notification.tenantId, 
        notification.recipientId
      );

      if (preferences && preferences.channels.WHATSAPP.phoneNumber) {
        return preferences.channels.WHATSAPP.phoneNumber;
      }

      // Fallback to user service API call
      const userPhone = await this.fetchUserWhatsAppNumber(
        notification.tenantId,
        notification.recipientId,
        notification.recipientType
      );

      return userPhone;

    } catch (error) {
      logger.error('Failed to get recipient WhatsApp number', {
        notificationId: notification.notificationId,
        recipientId: notification.recipientId,
        error: error.message
      });
      return null;
    }
  }

  async fetchUserWhatsAppNumber(tenantId, recipientId, recipientType) {
    try {
      // This would make an API call to the user-staff-service
      // For now, return null to indicate WhatsApp number not found
      logger.warn('User service integration not implemented for WhatsApp lookup', {
        tenantId,
        recipientId,
        recipientType
      });
      return null;
    } catch (error) {
      logger.error('Failed to fetch user WhatsApp number from user service', {
        tenantId,
        recipientId,
        error: error.message
      });
      return null;
    }
  }

  formatWhatsAppNumber(phone) {
    if (!phone) return null;

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // WhatsApp numbers need to be in E.164 format with whatsapp: prefix
    let formattedNumber;
    
    if (cleaned.length === 10) {
      // US number without country code
      formattedNumber = `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      // US number with country code
      formattedNumber = `+${cleaned}`;
    } else if (cleaned.length > 7) {
      // International number
      formattedNumber = `+${cleaned}`;
    } else {
      return null;
    }

    return `whatsapp:${formattedNumber}`;
  }

  formatWhatsAppContent(notification) {
    let content = notification.content;

    // Add tenant branding if available
    const tenantName = this.getTenantName(notification.tenantId);
    if (tenantName) {
      content = `*${tenantName}*\n\n${content}`;
    }

    // Add priority indicator for urgent messages
    if (notification.priority === 'URGENT') {
      content = `🚨 *URGENT* 🚨\n\n${content}`;
    }

    // Format content with WhatsApp markdown
    content = this.applyWhatsAppFormatting(content);

    // Add footer
    content += '\n\n_This is an automated message from DentaMate._';

    return content;
  }

  applyWhatsAppFormatting(content) {
    // Apply basic WhatsApp formatting
    // Bold: *text*
    // Italic: _text_
    // Strikethrough: ~text~
    // Monospace: ```text```

    // Convert HTML-like tags to WhatsApp format
    content = content.replace(/<b>(.*?)<\/b>/g, '*$1*');
    content = content.replace(/<strong>(.*?)<\/strong>/g, '*$1*');
    content = content.replace(/<i>(.*?)<\/i>/g, '_$1_');
    content = content.replace(/<em>(.*?)<\/em>/g, '_$1_');
    content = content.replace(/<code>(.*?)<\/code>/g, '```$1```');

    return content;
  }

  getTenantName(tenantId) {
    // This would fetch tenant name from tenant service
    // For now, return null
    return null;
  }

  maskPhoneNumber(phone) {
    if (!phone) return 'unknown';
    // Remove whatsapp: prefix for masking
    const cleanPhone = phone.replace('whatsapp:', '');
    if (cleanPhone.length <= 4) return phone;
    return `whatsapp:${cleanPhone.substring(0, 3)}***${cleanPhone.substring(cleanPhone.length - 2)}`;
  }

  async verifyWhatsAppNumber(phoneNumber) {
    try {
      if (!this.client) {
        throw new Error('WhatsApp service not initialized');
      }

      const formattedPhone = this.formatWhatsAppNumber(phoneNumber);
      if (!formattedPhone) {
        throw new Error('Invalid WhatsApp number format');
      }

      // Check if the number is WhatsApp enabled
      // Note: Twilio doesn't provide a direct way to verify WhatsApp numbers
      // This would typically require sending a test message or using a third-party service
      
      logger.info('WhatsApp number verification requested', {
        phoneNumber: this.maskPhoneNumber(formattedPhone)
      });

      return {
        valid: true,
        phoneNumber: formattedPhone,
        note: 'WhatsApp verification requires sending a test message'
      };

    } catch (error) {
      logger.error('WhatsApp number verification failed', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error.message
      });

      return {
        valid: false,
        error: error.message
      };
    }
  }

  async getDeliveryStatus(messageSid) {
    try {
      if (!this.client) {
        throw new Error('WhatsApp service not initialized');
      }

      const message = await this.client.messages(messageSid).fetch();
      
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        price: message.price,
        priceUnit: message.priceUnit,
        direction: message.direction,
        from: message.from,
        to: message.to
      };

    } catch (error) {
      logger.error('Failed to get WhatsApp delivery status', {
        messageSid,
        error: error.message
      });
      throw error;
    }
  }

  async sendTemplate(notification, templateName, templateParams = {}) {
    try {
      if (!this.client) {
        throw new Error('WhatsApp service not initialized');
      }

      // Get recipient WhatsApp number
      const recipientPhone = await this.getRecipientWhatsAppNumber(notification);
      if (!recipientPhone) {
        throw new Error('Recipient WhatsApp number not found');
      }

      const formattedPhone = this.formatWhatsAppNumber(recipientPhone);
      if (!formattedPhone) {
        throw new Error('Invalid WhatsApp number format');
      }

      const messageOptions = {
        from: this.fromNumber,
        to: formattedPhone,
        contentSid: templateName, // WhatsApp template SID
        contentVariables: JSON.stringify(templateParams),
        statusCallback: `${process.env.BASE_URL}/api/webhooks/twilio/whatsapp`
      };

      const result = await this.client.messages.create(messageOptions);

      logger.info('WhatsApp template message sent successfully', {
        notificationId: notification.notificationId,
        messageSid: result.sid,
        templateName,
        recipientPhone: this.maskPhoneNumber(formattedPhone)
      });

      return {
        success: true,
        externalId: result.sid,
        providerDetails: {
          provider: 'twilio-whatsapp-template',
          providerMessageId: result.sid,
          templateName,
          status: result.status
        }
      };

    } catch (error) {
      logger.error('WhatsApp template sending failed', {
        notificationId: notification.notificationId,
        templateName,
        error: error.message,
        errorCode: error.code
      });

      return {
        success: false,
        error: error.message,
        errorDetails: {
          errorCode: error.code,
          errorDescription: error.message
        }
      };
    }
  }

  async handleIncomingMessage(payload) {
    try {
      const { From, To, Body, MessageSid, ProfileName } = payload;

      logger.info('Incoming WhatsApp message received', {
        from: this.maskPhoneNumber(From),
        to: To,
        messageSid: MessageSid,
        profileName: ProfileName,
        bodyLength: Body ? Body.length : 0
      });

      // Handle common responses
      const response = this.processIncomingMessage(Body);
      
      if (response) {
        // Send automated response
        const responseMessage = await this.client.messages.create({
          body: response,
          from: To,
          to: From
        });

        logger.info('Automated WhatsApp response sent', {
          originalMessageSid: MessageSid,
          responseMessageSid: responseMessage.sid
        });
      }

      return {
        success: true,
        processed: !!response
      };

    } catch (error) {
      logger.error('Failed to handle incoming WhatsApp message', {
        error: error.message,
        payload
      });
      throw error;
    }
  }

  processIncomingMessage(body) {
    if (!body) return null;

    const message = body.toLowerCase().trim();

    // Handle opt-out requests
    if (['stop', 'unsubscribe', 'opt out', 'quit'].includes(message)) {
      return 'You have been unsubscribed from WhatsApp notifications. Reply START to resubscribe.';
    }

    // Handle opt-in requests
    if (['start', 'subscribe', 'opt in', 'yes'].includes(message)) {
      return 'You have been subscribed to WhatsApp notifications. Reply STOP to unsubscribe.';
    }

    // Handle help requests
    if (['help', 'info', '?'].includes(message)) {
      return 'DentaMate WhatsApp Notifications\n\nReply STOP to unsubscribe\nReply START to resubscribe\n\nFor support, contact your clinic directly.';
    }

    return null; // No automated response needed
  }
}

module.exports = WhatsAppService;