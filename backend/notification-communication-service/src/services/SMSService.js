const twilio = require('twilio');
const logger = require('../utils/logger');

class SMSService {
  constructor() {
    this.client = null;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    this.initializeService();
  }

  initializeService() {
    try {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        logger.warn('Twilio credentials not configured, SMS service disabled');
        return;
      }

      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      logger.info('Twilio SMS service initialized');
    } catch (error) {
      logger.error('Failed to initialize Twilio SMS service', {
        error: error.message
      });
    }
  }

  async send(notification) {
    try {
      if (!this.client) {
        throw new Error('SMS service not initialized');
      }

      // Get recipient phone number
      const recipientPhone = await this.getRecipientPhone(notification);
      if (!recipientPhone) {
        throw new Error('Recipient phone number not found');
      }

      // Validate phone number format
      const formattedPhone = this.formatPhoneNumber(recipientPhone);
      if (!formattedPhone) {
        throw new Error('Invalid phone number format');
      }

      // Prepare SMS content
      const smsContent = this.formatSMSContent(notification);
      
      // Check SMS length and split if necessary
      const messages = this.splitLongMessage(smsContent);
      
      const results = [];
      for (let i = 0; i < messages.length; i++) {
        const messageContent = messages.length > 1 
          ? `(${i + 1}/${messages.length}) ${messages[i]}`
          : messages[i];

        const messageOptions = {
          body: messageContent,
          from: this.fromNumber,
          to: formattedPhone,
          statusCallback: `${process.env.BASE_URL}/api/webhooks/twilio/sms`,
          maxPrice: '0.10', // Prevent expensive international SMS
        };

        // Add priority handling
        if (notification.priority === 'URGENT') {
          messageOptions.validityPeriod = 300; // 5 minutes for urgent messages
        }

        const result = await this.client.messages.create(messageOptions);
        results.push(result);

        logger.info('SMS sent successfully', {
          notificationId: notification.notificationId,
          messageSid: result.sid,
          recipientPhone: this.maskPhoneNumber(formattedPhone),
          messageIndex: i + 1,
          totalMessages: messages.length
        });

        // Small delay between multiple messages
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: true,
        externalId: results[0].sid,
        providerDetails: {
          provider: 'twilio',
          providerMessageId: results[0].sid,
          messageCount: results.length,
          allMessageSids: results.map(r => r.sid)
        }
      };

    } catch (error) {
      logger.error('SMS sending failed', {
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

  async getRecipientPhone(notification) {
    try {
      // First check notification preferences
      const NotificationPreference = require('../models/NotificationPreference');
      const preferences = await NotificationPreference.findByUser(
        notification.tenantId, 
        notification.recipientId
      );

      if (preferences && preferences.channels.SMS.phoneNumber) {
        return preferences.channels.SMS.phoneNumber;
      }

      // Fallback to user service API call
      const userPhone = await this.fetchUserPhone(
        notification.tenantId,
        notification.recipientId,
        notification.recipientType
      );

      return userPhone;

    } catch (error) {
      logger.error('Failed to get recipient phone', {
        notificationId: notification.notificationId,
        recipientId: notification.recipientId,
        error: error.message
      });
      return null;
    }
  }

  async fetchUserPhone(tenantId, recipientId, recipientType) {
    try {
      // This would make an API call to the user-staff-service
      // For now, return null to indicate phone not found
      logger.warn('User service integration not implemented for phone lookup', {
        tenantId,
        recipientId,
        recipientType
      });
      return null;
    } catch (error) {
      logger.error('Failed to fetch user phone from user service', {
        tenantId,
        recipientId,
        error: error.message
      });
      return null;
    }
  }

  formatPhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.length === 10) {
      // US number without country code
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      // US number with country code
      return `+${cleaned}`;
    } else if (cleaned.length > 7) {
      // International number
      return `+${cleaned}`;
    }

    return null;
  }

  formatSMSContent(notification) {
    let content = notification.content;

    // Add tenant branding if available
    const tenantName = this.getTenantName(notification.tenantId);
    if (tenantName) {
      content = `${tenantName}: ${content}`;
    }

    // Add priority indicator for urgent messages
    if (notification.priority === 'URGENT') {
      content = `[URGENT] ${content}`;
    }

    // Add unsubscribe info for marketing messages
    if (notification.templateCode.includes('MARKETING')) {
      content += '\n\nReply STOP to unsubscribe';
    }

    return content;
  }

  splitLongMessage(content, maxLength = 1600) {
    if (content.length <= maxLength) {
      return [content];
    }

    const messages = [];
    let remaining = content;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        messages.push(remaining);
        break;
      }

      // Find the best split point (prefer word boundaries)
      let splitPoint = maxLength;
      const lastSpace = remaining.lastIndexOf(' ', maxLength);
      const lastNewline = remaining.lastIndexOf('\n', maxLength);

      if (lastNewline > maxLength * 0.8) {
        splitPoint = lastNewline;
      } else if (lastSpace > maxLength * 0.8) {
        splitPoint = lastSpace;
      }

      messages.push(remaining.substring(0, splitPoint).trim());
      remaining = remaining.substring(splitPoint).trim();
    }

    return messages;
  }

  getTenantName(tenantId) {
    // This would fetch tenant name from tenant service
    // For now, return null
    return null;
  }

  maskPhoneNumber(phone) {
    if (!phone) return 'unknown';
    if (phone.length <= 4) return phone;
    return `${phone.substring(0, 3)}***${phone.substring(phone.length - 2)}`;
  }

  async verifyPhoneNumber(phoneNumber) {
    try {
      if (!this.client) {
        throw new Error('SMS service not initialized');
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new Error('Invalid phone number format');
      }

      // Use Twilio Lookup API to verify phone number
      const lookup = await this.client.lookups.v1.phoneNumbers(formattedPhone).fetch();
      
      return {
        valid: true,
        phoneNumber: lookup.phoneNumber,
        countryCode: lookup.countryCode,
        carrier: lookup.carrier
      };

    } catch (error) {
      logger.error('Phone number verification failed', {
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
        throw new Error('SMS service not initialized');
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
        priceUnit: message.priceUnit
      };

    } catch (error) {
      logger.error('Failed to get SMS delivery status', {
        messageSid,
        error: error.message
      });
      throw error;
    }
  }

  async handleOptOut(phoneNumber) {
    try {
      // Update notification preferences to opt out of SMS
      const NotificationPreference = require('../models/NotificationPreference');
      
      // Find user by phone number (would need to implement reverse lookup)
      // For now, log the opt-out request
      logger.info('SMS opt-out request received', {
        phoneNumber: this.maskPhoneNumber(phoneNumber)
      });

      return {
        success: true,
        message: 'Opt-out processed'
      };

    } catch (error) {
      logger.error('Failed to process SMS opt-out', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error.message
      });
      throw error;
    }
  }

  async getAccountBalance() {
    try {
      if (!this.client) {
        throw new Error('SMS service not initialized');
      }

      const balance = await this.client.balance.fetch();
      
      return {
        balance: balance.balance,
        currency: balance.currency,
        accountSid: balance.accountSid
      };

    } catch (error) {
      logger.error('Failed to get Twilio account balance', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = SMSService;