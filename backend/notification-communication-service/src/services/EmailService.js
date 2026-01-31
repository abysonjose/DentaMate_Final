const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.oauth2Client = null;
    this.initializeService();
  }

  async initializeService() {
    try {
      if (process.env.EMAIL_SERVICE === 'gmail') {
        await this.initializeGmailOAuth();
      } else {
        await this.initializeSMTP();
      }
    } catch (error) {
      logger.error('Failed to initialize email service', {
        error: error.message,
        service: process.env.EMAIL_SERVICE
      });
    }
  }

  async initializeGmailOAuth() {
    try {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.EMAIL_CLIENT_ID,
        process.env.EMAIL_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
      );

      this.oauth2Client.setCredentials({
        refresh_token: process.env.EMAIL_REFRESH_TOKEN
      });

      // Get access token
      const { token } = await this.oauth2Client.getAccessToken();

      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.EMAIL_USER,
          clientId: process.env.EMAIL_CLIENT_ID,
          clientSecret: process.env.EMAIL_CLIENT_SECRET,
          refreshToken: process.env.EMAIL_REFRESH_TOKEN,
          accessToken: token
        }
      });

      logger.info('Gmail OAuth2 email service initialized');
    } catch (error) {
      logger.error('Failed to initialize Gmail OAuth2', {
        error: error.message
      });
      throw error;
    }
  }

  async initializeSMTP() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      logger.info('SMTP email service initialized');
    } catch (error) {
      logger.error('Failed to initialize SMTP', {
        error: error.message
      });
      throw error;
    }
  }

  async send(notification) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      // Get recipient email from user service or notification preferences
      const recipientEmail = await this.getRecipientEmail(notification);
      if (!recipientEmail) {
        throw new Error('Recipient email not found');
      }

      // Prepare email options
      const mailOptions = {
        from: {
          name: process.env.EMAIL_SENDER_NAME || 'DentaMate',
          address: process.env.EMAIL_USER
        },
        to: recipientEmail,
        subject: notification.subject || 'DentaMate Notification',
        html: this.formatEmailContent(notification),
        text: this.stripHtml(notification.content),
        headers: {
          'X-Notification-ID': notification.notificationId,
          'X-Tenant-ID': notification.tenantId,
          'X-Priority': this.getPriorityHeader(notification.priority)
        }
      };

      // Add tenant branding if available
      const branding = await this.getTenantBranding(notification.tenantId);
      if (branding) {
        if (branding.senderName) {
          mailOptions.from.name = branding.senderName;
        }
        if (branding.senderEmail) {
          mailOptions.from.address = branding.senderEmail;
        }
      }

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        notificationId: notification.notificationId,
        messageId: result.messageId,
        recipientEmail: this.maskEmail(recipientEmail)
      });

      return {
        success: true,
        externalId: result.messageId,
        providerDetails: {
          provider: 'nodemailer',
          providerMessageId: result.messageId,
          response: result.response
        }
      };

    } catch (error) {
      logger.error('Email sending failed', {
        notificationId: notification.notificationId,
        error: error.message,
        stack: error.stack
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

  async getRecipientEmail(notification) {
    try {
      // First check notification preferences
      const NotificationPreference = require('../models/NotificationPreference');
      const preferences = await NotificationPreference.findByUser(
        notification.tenantId, 
        notification.recipientId
      );

      if (preferences && preferences.channels.EMAIL.emailAddress) {
        return preferences.channels.EMAIL.emailAddress;
      }

      // Fallback to user service API call
      const userEmail = await this.fetchUserEmail(
        notification.tenantId,
        notification.recipientId,
        notification.recipientType
      );

      return userEmail;

    } catch (error) {
      logger.error('Failed to get recipient email', {
        notificationId: notification.notificationId,
        recipientId: notification.recipientId,
        error: error.message
      });
      return null;
    }
  }

  async fetchUserEmail(tenantId, recipientId, recipientType) {
    try {
      // This would make an API call to the user-staff-service
      // For now, return null to indicate email not found
      logger.warn('User service integration not implemented for email lookup', {
        tenantId,
        recipientId,
        recipientType
      });
      return null;
    } catch (error) {
      logger.error('Failed to fetch user email from user service', {
        tenantId,
        recipientId,
        error: error.message
      });
      return null;
    }
  }

  formatEmailContent(notification) {
    const content = notification.content.replace(/\n/g, '<br>');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .priority-high { border-left: 4px solid #ff6b6b; }
          .priority-urgent { border-left: 4px solid #ff3838; background-color: #fff5f5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DentaMate</h1>
          </div>
          <div class="content ${this.getPriorityClass(notification.priority)}">
            ${content}
          </div>
          <div class="footer">
            <p>This is an automated message from DentaMate. Please do not reply to this email.</p>
            <p>Notification ID: ${notification.notificationId}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  }

  getPriorityHeader(priority) {
    switch (priority) {
      case 'URGENT': return '1 (Highest)';
      case 'HIGH': return '2 (High)';
      case 'NORMAL': return '3 (Normal)';
      case 'LOW': return '4 (Low)';
      default: return '3 (Normal)';
    }
  }

  getPriorityClass(priority) {
    switch (priority) {
      case 'HIGH': return 'priority-high';
      case 'URGENT': return 'priority-urgent';
      default: return '';
    }
  }

  async getTenantBranding(tenantId) {
    try {
      // This would fetch tenant-specific branding from tenant service
      // For now, return null
      return null;
    } catch (error) {
      logger.error('Failed to get tenant branding', {
        tenantId,
        error: error.message
      });
      return null;
    }
  }

  maskEmail(email) {
    if (!email) return 'unknown';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local}***@${domain}`;
    return `${local.substring(0, 2)}***@${domain}`;
  }

  async verifyConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', {
        error: error.message
      });
      return false;
    }
  }

  async refreshAccessToken() {
    try {
      if (this.oauth2Client) {
        const { token } = await this.oauth2Client.getAccessToken();
        logger.info('OAuth2 access token refreshed');
        return token;
      }
      return null;
    } catch (error) {
      logger.error('Failed to refresh OAuth2 token', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = EmailService;