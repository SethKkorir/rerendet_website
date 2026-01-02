// utils/sendEmail.js
import nodemailer from 'nodemailer';
import Settings from '../models/Settings.js';

const sendEmail = async (options) => {
  try {
    console.log('📧 Attempting to send email to:', options.email || options.to);

    // Fetch dynamic settings from DB
    const settings = await Settings.getSettings();
    const emailConfig = settings.email;
    const isMock = options.mock || false;

    // Determine config source: Explicit Config -> DB -> ENV
    let transporterConfig = null;
    let fromEmail = process.env.EMAIL_FROM || '"Rerendet Coffee" <noreply@rerendetcoffee.com>';

    if (options.smtpConfig) {
      // Use Explicit Config (e.g. from Test Connection)
      console.log('🔧 Using Explicit SMTP Configuration for Testing');
      transporterConfig = {
        host: options.smtpConfig.host,
        port: Number(options.smtpConfig.port),
        secure: options.smtpConfig.secure,
        auth: {
          user: options.smtpConfig.auth.user,
          pass: options.smtpConfig.auth.pass,
        },
      };
      if (options.smtpConfig.from) {
        fromEmail = options.smtpConfig.from;
      }
    } else if (emailConfig && emailConfig.enabled && emailConfig.host) {
      // Use DB Settings
      console.log('🔧 Using DB SMTP Configuration:', emailConfig.host);
      transporterConfig = {
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure, // true for 465, false for other ports
        auth: {
          user: emailConfig.auth.user,
          pass: emailConfig.auth.pass,
        },
      };
      if (emailConfig.from) {
        fromEmail = emailConfig.from;
      }
    } else if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      // Use ENV Fallback (Gmail default)
      console.log('🔧 Using ENV SMTP Configuration (Gmail Fallback)');
      transporterConfig = {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      };
    } else {
      // No config available
      console.warn('⚠️ No email credentials found (DB or ENV).');
      transporterConfig = null;
    }

    if (!transporterConfig || isMock) {
      // MOCK MODE
      console.log('📝 [MOCK EMAIL]');
      console.log('   From:', fromEmail);
      console.log('   To:', options.to || options.email);
      console.log('   Subject:', options.subject);

      const codeMatch = options.html ? options.html.match(/>(\d{6})</) : null;
      if (codeMatch) {
        console.log('   🔑 Verification Code:', codeMatch[1]);
      }

      console.log('✅ Mock email "sent" successfully.');
      return { messageId: 'mock-email-id-123' };
    }

    // Create Transporter
    const transporter = nodemailer.createTransport(transporterConfig);

    // Verify connection only if not verified recently (optimization)
    // await transporter.verify(); 

    const mailOptions = {
      from: fromEmail,
      to: options.to || options.email,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments, // Add support for attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ REAL EMAIL SENT SUCCESSFULLY!');
    console.log('📧 Message ID:', info.messageId);

    return info;

  } catch (error) {
    console.error('❌ EMAIL FAILED:', error.message);

    // Fallback: Log the code to console if email fails
    if (options.html) {
      const codeMatch = options.html.match(/>(\d{6})</);
      if (codeMatch) {
        console.log('🔢 FALLBACK CODE (Email Failed):', codeMatch[1]);
      }
    }

    // Rethrow to let caller handle failure
    throw error;
  }
};

export default sendEmail;