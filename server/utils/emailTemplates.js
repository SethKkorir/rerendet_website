/**
 * Standardized Email Templates for Rerendet Coffee
 */

const getBaseTemplate = (title, content, options = {}) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const logoUrl = options.logoUrl || `${frontendUrl}/rerendet-logo.png`;
  const year = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-top: 40px; margin-bottom: 40px; }
        .header { background-color: #1a1a1a; padding: 30px; text-align: center; }
        .logo { max-height: 50px; width: auto; display: block; margin: 0 auto; }
        .logo-text { color: #D4AF37; font-size: 24px; font-weight: 700; margin-top: 10px; display: block; text-decoration: none; }
        .content { padding: 40px 30px; color: #1d1d1f; line-height: 1.6; font-size: 16px; }
        .footer { background-color: #f5f5f7; padding: 30px; text-align: center; font-size: 12px; color: #86868b; border-top: 1px solid #e5e5e5; }
        .footer a { color: #86868b; text-decoration: none; margin: 0 10px; }
        .footer a:hover { text-decoration: underline; color: #1d1d1f; }
        .btn { display: inline-block; background-color: #D4AF37; color: #000000; padding: 14px 28px; border-radius: 99px; text-decoration: none; font-weight: 600; margin-top: 20px; text-align: center; }
        .verification-code { font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #D4AF37; background: #fafafa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px dashed #D4AF37; }
        h1 { font-size: 24px; font-weight: 700; margin-bottom: 20px; color: #1a1a1a; }
        p { margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Rerendet Coffee" class="logo" />` : '<div style="font-size: 30px;">☕</div>'}
          <a href="${frontendUrl}" class="logo-text">Rerendet Coffee</a>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>&copy; ${year} Rerendet Coffee. All rights reserved.</p>
          <div style="margin-top: 10px;">
            <a href="${frontendUrl}/shipping-policy">Shipping Policy</a> •
            <a href="${frontendUrl}/returns">Returns</a> •
            <a href="${frontendUrl}/privacy">Privacy</a>
          </div>
          <p style="margin-top: 20px;">
            You received this email because you are a valued customer of Rerendet Coffee.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getVerificationEmail = (name, code, logoUrl, type = 'register') => {
  let title, intro, body;

  if (type === 'login') {
    title = 'Login Verification Code';
    intro = `Welcome Back, ${name}!`;
    body = 'To complete your login and access your account, please use the verification code below:';
  } else {
    // Default to Register
    title = 'Verify Your Account';
    intro = `Hello ${name},`;
    body = 'Welcome to Rerendet Coffee! To complete your registration and verify your email address, please use the code below:';
  }

  const content = `
    <h1>${title}</h1>
    <p>${intro}</p>
    <p>${body}</p>
    <div class="verification-code">${code}</div>
    <p>This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
  `;
  return getBaseTemplate(`${title} - Rerendet Coffee`, content, { logoUrl });
};

export const getWelcomeEmail = (name, logoUrl) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const content = `
    <h1>Welcome to Rerendet Coffee!</h1>
    <p>Hello ${name},</p>
    <p>Review the art of premium coffee. We're thrilled to have you join our community.</p>
    <p>Your account has been successfully created.</p>
    
    <div style="background-color: #f9f9f9; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1a1a1a;">Join Our Coffee Journey</h3>
      <p style="margin-bottom: 10px;">Stay updated with our latest blends, brewing tips, and exclusive offers.</p>
      <a href="${frontendUrl}/#newsletter" style="color: #D4AF37; text-decoration: none; font-weight: 600;">Subscribe to our Newsletter →</a>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${frontendUrl}/#coffee-shop" class="btn">Start Shopping</a>
    </div>
  `;
  return getBaseTemplate('Welcome to Rerendet Coffee', content, { logoUrl });
};

export const getResetPasswordEmail = (name, code, logoUrl) => {
  const content = `
    <h1>Reset Your Password</h1>
    <p>Hello ${name},</p>
    <p>We received a request to reset your password. Enter the code below to proceed:</p>
    <div class="verification-code">${code}</div>
    <p>If you did not request this change, you can safely ignore this email.</p>
  `;
  return getBaseTemplate('Reset Your Password', content, { logoUrl });
};

export const getRegretEmail = (name, logoUrl) => {
  const content = `
    <h1>We're Sorry to See You Go</h1>
    <p>Hello ${name},</p>
    <p>Your account has been successfully deleted. We hope you enjoyed your time with us.</p>
    <p>If you change your mind, we'll be here with a fresh brew waiting for you.</p>
  `;
  return getBaseTemplate('Account Deleted', content, { logoUrl });
};

export const getMaintenanceEmail = (message, logoUrl) => {
  const content = `
    <h1>System Maintenance Update</h1>
    <p>Dear Customer,</p>
    <p>We are currently performing scheduled maintenance to improve your experience.</p>
    <p><strong>Note from our team:</strong></p>
    <blockquote style="border-left: 4px solid #D4AF37; padding-left: 15px; margin: 20px 0; color: #555;">
      ${message || 'We will be back shortly.'}
    </blockquote>
    <p>We apologize for any inconvenience and appreciate your patience.</p>
  `;
  return getBaseTemplate('Maintenance Update - Rerendet Coffee', content, { logoUrl });
};

export const getMaintenanceResolvedEmail = (logoUrl) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const content = `
    <h1>We Are Back Online!</h1>
    <p>Dear Customer,</p>
    <p>Great news! Rerendet Coffee is back online and better than ever.</p>
    <p>Thank you for your patience during our maintenance period.</p>
    <div style="text-align: center;">
      <a href="${frontendUrl}/#coffee-shop" class="btn">Shop Now</a>
    </div>
  `;
  return getBaseTemplate('We Are Back Online - Rerendet Coffee', content, { logoUrl });
};

export const getNewsletterWelcomeEmail = (logoUrl) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const content = `
    <h1>Welcome to the Journey</h1>
    <p>Thank you for subscribing to the Rerendet Coffee newsletter!</p>
    <p>You'll now be the first to know about:</p>
    <ul style="color: #444; line-height: 1.6;">
      <li>New single-origin releases</li>
      <li>Expert brewing guides</li>
      <li>Exclusive subscriber-only discounts</li>
    </ul>
    <p>We promise to keep our emails fresh and flavorful, never bitter.</p>
    <div style="text-align: center; margin-top: 30px;">
      <a href="${frontendUrl}/#coffee-shop" class="btn">Explore Our Coffees</a>
    </div>
  `;
  return getBaseTemplate('Welcome to Rerendet Coffee Journey', content, { logoUrl });
};

export const getNewsletterEmail = (title, bodyContent, logoUrl) => {
  // bodyContent is expected to be HTML safe
  const content = `
    ${bodyContent}
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
      <p>You received this email because you are subscribed to the Rerendet Coffee newsletter.</p>
      <a href="#" style="color: #999; text-decoration: underline;">Unsubscribe</a>
    </div>
  `;
  return getBaseTemplate(title, content, { logoUrl });
};

export const getOrderStatusEmail = (name, orderNumber, status, trackingNumber, message, logoUrl) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  let statusColor = '#3b82f6'; // Default blue
  if (status === 'shipped') statusColor = '#10b981'; // Green
  if (status === 'delivered') statusColor = '#059669'; // Dark Green
  if (status === 'cancelled') statusColor = '#ef4444'; // Red

  // Status-specific content
  let statusMessage = `Your order #${orderNumber} has been updated to <strong>${status.toUpperCase()}</strong>.`;

  if (status === 'shipped') {
    statusMessage = `Your order #${orderNumber} is on its way! 🚚`;
  } else if (status === 'delivered') {
    statusMessage = `Your order #${orderNumber} has been delivered. Enjoy your coffee! ☕`;
  }

  const content = `
    <h1>Order Update</h1>
    <p>Hello ${name},</p>
    <p>${statusMessage}</p>
    
    <div style="background-color: #f8f9fa; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: ${statusColor};">Current Status: ${status.toUpperCase()}</p>
      ${message ? `<p style="margin-top: 10px; font-style: italic;">"${message}"</p>` : ''}
      ${trackingNumber ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e5e5e5;">
          <p style="margin: 0;"><strong>Tracking Number:</strong></p>
          <p style="font-family: monospace; background: #fff; padding: 5px 10px; display: inline-block; border: 1px solid #ddd; border-radius: 4px;">${trackingNumber}</p>
        </div>
      ` : ''}
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${frontendUrl}/account" class="btn">Track Order</a>
    </div>
  `;
  return getBaseTemplate(`Order Update #${orderNumber} - Rerendet Coffee`, content, { logoUrl });
};

export const getLowStockAlertEmail = (productName, currentStock, threshold, productUrl, logoUrl) => {
  const content = `
    <h1>⚠️ Low Stock Alert</h1>
    <p>The following product has fallen below the inventory threshold:</p>
    
    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #856404;">${productName}</h3>
      <p style="margin-bottom: 5px;"><strong>Current Stock:</strong> ${currentStock}</p>
      <p style="margin-bottom: 0;"><strong>Threshold:</strong> ${threshold}</p>
    </div>

    <p>Please restock this item soon to avoid potential lost sales.</p>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${productUrl}" class="btn">Manage Inventory</a>
    </div>
  `;
  return getBaseTemplate(`Low Stock Alert: ${productName}`, content, { logoUrl });
};
