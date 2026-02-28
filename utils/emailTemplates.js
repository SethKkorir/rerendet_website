const getBaseTemplate = (title, content, options = {}) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const logoUrl = options.logoUrl; // If provided, use it
  const year = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #F9F7F2; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.12); border: 1px solid #E9EDF2; }
        .header { background: linear-gradient(135deg, #111827, #020617); padding: 50px 40px; text-align: center; position: relative; }
        .logo-box { width: 100px; height: 100px; background: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .logo-box img { max-height: 70px; width: auto; }
        .brand-title { color: #D4AF37; font-size: 28px; font-weight: 800; text-decoration: none; letter-spacing: 2px; text-transform: uppercase; display: block; }
        .divider { height: 1px; width: 60px; background: #D4AF37; margin: 20px auto; }
        .content { padding: 50px 40px; color: #111111; line-height: 1.8; font-size: 16px; background: #ffffff; }
        .content h1 { font-family: Georgia, serif; font-size: 32px; font-weight: 700; margin-bottom: 25px; color: #111111; text-align: center; line-height: 1.2; }
        .content p { margin-bottom: 20px; color: #444444; }
        .verification-code-box { background: #F9F7F2; border: 2px solid #D4AF37; border-radius: 20px; padding: 30px; text-align: center; margin: 30px 0; }
        .code-text { font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #111111; display: block; padding-left: 12px; }
        .code-caption { display: block; color: #D4AF37; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; }
        .premium-btn { display: block; width: 100%; max-width: 280px; margin: 30px auto 0; background: #D4AF37; color: #ffffff; padding: 18px 30px; border-radius: 16px; text-decoration: none; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 10px 30px rgba(212, 175, 55, 0.4); font-size: 14px; }
        .info-card { background: #F1EBE4; border-radius: 20px; padding: 25px; margin: 30px 0; border: 1px solid #D1D9E6; }
        .info-card-title { color: #6f4e37; font-weight: 700; text-transform: uppercase; font-size: 13px; margin-bottom: 12px; display: block; }
        .footer { background-color: #020617; padding: 40px; text-align: center; font-size: 12px; color: #94A3B8; }
        .footer a { color: #D4AF37; text-decoration: none; margin: 0 8px; font-weight: 600; }
        .social-tray { margin-bottom: 25px; font-size: 18px; }
        .unsub-text { opacity: 0.6; margin-top: 25px; display: block; line-height: 1.4; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-box">
             ${logoUrl ? `<img src="${logoUrl}" alt="Rerendet Logo" />` : '<span style="font-size: 40px;">☕</span>'}
          </div>
          <a href="${frontendUrl}" class="brand-title">Rerendet Coffee</a>
          <div class="divider"></div>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <div class="social-tray">
             <a href="#">Instagram</a> • <a href="#">Twitter</a> • <a href="#">Facebook</a>
          </div>
          <p>&copy; ${year} Rerendet Coffees. All rights reserved.</p>
          <div style="margin-top: 15px;">
             <a href="${frontendUrl}/track">Order Status</a>
             <a href="${frontendUrl}/shipping-policy">Shipping</a>
             <a href="${frontendUrl}/returns">Returns</a>
          </div>
          <span class="unsub-text">
            Specializing in high-altitude, sun-dried Arabic coffee. Hand-picked and freshly roasted in Kenya.
          </span>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getVerificationEmail = (name, code, logoUrl) => {
  const content = `
    <h1>Verify Your Presence</h1>
    <p>Dear ${name},</p>
    <p>We are delighted to have you join the world of Rerendet Coffee. To finalize your account and lock in your membership, please enter the exclusive code below:</p>
    <div class="verification-code-box">
      <span class="code-text">${code}</span>
      <span class="code-caption">Valid for 10 minutes</span>
    </div>
    <p>If you did not initiate this registration, please disregard this transmission.</p>
  `;
  return getBaseTemplate('Verify Your Email - Rerendet Coffee', content, { logoUrl });
};

export const getWelcomeEmail = (name, logoUrl) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const content = `
    <h1>Welcome to the Estate</h1>
    <p>Dear ${name},</p>
    <p>Your journey into the finest high-altitude Kenyan coffee begins now. Your account is active, and the door to our exclusive collections is open.</p>
    
    <div class="info-card">
      <span class="info-card-title">MEMBER BENEFIT</span>
      <p style="margin: 0; font-style: italic;">"As a registered member, you'll earn 1 loyalty point for every KES 100 spent. Collect points to redeem for limited-batch reserve releases."</p>
    </div>

    <div style="background: #eef2ff; border-left: 4px solid #4f46e5; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <h4 style="margin: 0 0 10px 0; color: #1e1b4b; display: flex; align-items: center; gap: 8px;">🛡️ Protect Your Account</h4>
      <p style="margin: 0; font-size: 14px; color: #312e81;">For maximum security, we highly recommend enabling <strong>Two-Factor Authentication (2FA)</strong>. This adds an extra layer of protection, ensuring that only you can access your profile and order history.</p>
      <a href="${frontendUrl}/account" style="display: inline-block; margin-top: 15px; color: #4f46e5; font-weight: 700; text-decoration: none; font-size: 14px;">Enable Security →</a>
    </div>

    <p>Our beans are waiting. Start your first order and taste the peak of quality.</p>

    <div style="text-align: center;">
      <a href="${frontendUrl}/#coffee-shop" class="premium-btn">Explore Collections</a>
    </div>
  `;
  return getBaseTemplate('Welcome to Rerendet Coffee', content, { logoUrl });
};

export const getResetPasswordEmail = (name, code, logoUrl) => {
  const content = `
    <h1>Secure Re-entry Request</h1>
    <p>Dear ${name},</p>
    <p>We received a request to update the security credentials for your account. Please use the verification code below to proceed with your password reset:</p>
    <div class="verification-code-box">
      <span class="code-text">${code}</span>
      <span class="code-caption">Authorization Code</span>
    </div>
    <p>If you did not request this, please change your security settings immediately.</p>
  `;
  return getBaseTemplate('Reset Your Password', content, { logoUrl });
};

export const getOrderStatusEmail = (name, orderNumber, status, trackingNumber, message, logoUrl) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  let statusTitle = "Order Update";
  let icon = "📦";
  if (status === 'shipped') { statusTitle = "In Transit"; icon = "🚚"; }
  else if (status === 'delivered') { statusTitle = "Delivered"; icon = "☕"; }
  else if (status === 'cancelled') { statusTitle = "Order Cancelled"; icon = "⚠️"; }

  const content = `
    <h1>${statusTitle} ${icon}</h1>
    <p>Dear ${name},</p>
    <p>Your order <strong>#${orderNumber}</strong> has progressed in its journey to you.</p>
    
    <div class="info-card" style="border-left-color: #D4AF37;">
      <span class="info-card-title">CURRENT STATUS</span>
      <p style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase;">${status}</p>
      ${message ? `<p style="margin-top: 15px; background: #fff; padding: 10px; border-radius: 8px; font-size: 14px;">Team Note: "${message}"</p>` : ''}
    </div>

    ${trackingNumber ? `
      <div style="margin: 30px 0; padding: 20px; border: 1px dashed #D1D9E6; border-radius: 12px; text-align: center;">
        <span class="info-card-title">TRACKING IDENTIFIER</span>
        <span style="font-family: monospace; font-size: 24px; color: #111111; display: block; margin: 10px 0;">${trackingNumber}</span>
      </div>
    ` : ''}

    <div style="text-align: center;">
      <a href="${frontendUrl}/account" class="premium-btn">Track Order Details</a>
    </div>
  `;
  return getBaseTemplate(`Order ${statusTitle} - #${orderNumber}`, content, { logoUrl });
};

export const getOrderConfirmationEmail = (name, orderNumber, items, total, logoUrl) => {
  const content = `
    <h1>Order Selection Confirmed</h1>
    <p>Dear ${name},</p>
    <p>We are delighted to confirm your selection <strong>#${orderNumber}</strong>. Our roasting team is already preparing to bring the fresh aroma of the peak to your door.</p>
    
    <div class="info-card">
      <span class="info-card-title">ACQUISITION SUMMARY</span>
      ${items.map(item => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 12px;">
          <span style="font-weight: 500;">${item.name} (${item.size}) <span style="color: #999;">x${item.quantity}</span></span>
          <strong>KES ${item.price.toLocaleString()}</strong>
        </div>
      `).join('')}
      <div style="display: flex; justify-content: space-between; margin-top: 20px; font-weight: 800; font-size: 22px; color: #D4AF37;">
        <span>Total Investment</span>
        <span>KES ${total.toLocaleString()}</span>
      </div>
    </div>

    <p>You will receive another transmission as soon as your order departs our estate.</p>
  `;
  return getBaseTemplate(`Confirmation #${orderNumber} - Rerendet Coffee`, content, { logoUrl });
};

export const getMaintenanceEmail = (message, logoUrl) => {
  const content = `
    <h1>Polishing the Peak</h1>
    <p>To our valued customer,</p>
    <p>We are currently performing digital maintenance to enhance your experience at the Rerendet Coffee portal.</p>
    <div class="info-card">
      <span class="info-card-title">DISPATCH FROM THE TEAM</span>
      <p style="margin: 0; font-style: italic;">"${message || 'System enhancements in progress. We will return shortly.'}"</p>
    </div>
    <p>We appreciate your patience while we refine the estate.</p>
  `;
  return getBaseTemplate('Maintenance Update - Rerendet Coffee', content, { logoUrl });
};

export const getNewsletterWelcomeEmail = (logoUrl) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const content = `
    <h1>Inside the Brew</h1>
    <p>Thank you for subscribing to our estate transmissions.</p>
    <p>You are now on the inside track for:</p>
    <ul style="color: #444; line-height: 2;">
      <li><strong>Small-Batch Arrivals</strong>: Be the first to secure limited harvests.</li>
      <li><strong>Estates News</strong>: Updates from our high-altitude Kenyan farms.</li>
      <li><strong>Secret Brews</strong>: Subscriber-only discounts and early access.</li>
    </ul>
    <div style="text-align: center; margin-top: 30px;">
      <a href="${frontendUrl}/#coffee-shop" class="premium-btn">Browse Shop</a>
    </div>
  `;
  return getBaseTemplate('Welcome to the Journey - Rerendet Coffee', content, { logoUrl });
};

export const getRegretEmail = (name, logoUrl) => {
  const content = `
    <h1>Farewell from the Peak</h1>
    <p>Dear ${name},</p>
    <p>Your account has been successfully decommissioned. We are genuinely sorry to see your journey with Rerendet Coffee come to a close.</p>
    <div class="info-card">
      <p style="margin: 0; text-align: center;">"If you ever find yourself craving the fresh aroma of the peak again, our doors will always be open for your return."</p>
    </div>
    <p>Safe travels until we brew again.</p>
  `;
  return getBaseTemplate('Account Deleted - Rerendet Coffee', content, { logoUrl });
};

export const getMaintenanceResolvedEmail = (logoUrl) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const content = `
    <h1>Resuming Operations</h1>
    <p>To our valued members,</p>
    <p>The gates to the Rerendet Coffee portal are open once again. We have successfully completed our enhancements and are back online to serve you.</p>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${frontendUrl}" class="premium-btn">Return to Shop</a>
    </div>
  `;
  return getBaseTemplate('We are Back Online - Rerendet Coffee', content, { logoUrl });
};

export const getNewsletterEmail = (title, bodyContent, logoUrl) => {
  const content = `
    <h1>${title}</h1>
    <div style="margin-top: 25px;">
      ${bodyContent}
    </div>
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E9EDF2; text-align: center; font-size: 13px; color: #94A3B8;">
      <p>This transmission was sent to you as a member of our exclusive newsletter circle.</p>
      <a href="#" style="color: #D4AF37; text-decoration: underline;">Unsubscribe from transmissions</a>
    </div>
  `;
  return getBaseTemplate(title, content, { logoUrl });
};
export const getSecurityAlertEmail = (name, action, logoUrl) => {
  const content = `
    <h1>Security Notification</h1>
    <p>Dear ${name},</p>
    <p>This is an automated transmission to inform you that a security-sensitive change was made to your account:</p>
    
    <div class="info-card" style="border-left-color: #ef4444;">
      <span class="info-card-title">ACTION TAKEN</span>
      <p style="margin: 0; font-size: 18px; font-weight: 700;">${action}</p>
      <p style="margin-top: 10px; font-size: 14px;">Timestamp: ${new Date().toLocaleString()}</p>
    </div>

    <p>If you initiated this change, no further action is required. Your account remains protected with our bank-grade encryption protocols.</p>
    
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 12px; margin: 30px 0;">
      <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Not You?</h4>
      <p style="margin: 0; font-size: 14px; color: #666;">If you did <strong>not</strong> authorize this change, please contact our security team immediately or reset your password to regain exclusive control of your account.</p>
    </div>
  `;
  return getBaseTemplate('Security Notification - Rerendet Coffee', content, { logoUrl });
};

// ── Admin Misuse Alert (sent to Super Admin) ─────────────────────────────────
export const getAdminMisuseAlert = ({ adminName, adminEmail, action, entityName, ipAddress, timestamp, details, logoUrl }) => {
  const adminPanelUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const content = `
    <h1 style="color: #dc2626;">🚨 Admin Security Alert</h1>
    <p>This is an automated internal security notification. A <strong>high-risk administrative action</strong> was performed and requires your attention.</p>

    <div class="info-card" style="border-left: 4px solid #dc2626; background: #fef2f2;">
      <span class="info-card-title" style="color: #dc2626;">⚠️ HIGH-RISK ACTION DETECTED</span>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr><td style="padding: 6px 0; color: #666; font-size: 13px; width: 35%;">Admin User</td><td style="font-weight: 700;">${adminName} (${adminEmail})</td></tr>
        <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Action</td><td style="font-weight: 700; color: #dc2626;">${action}</td></tr>
        <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Affected</td><td style="font-weight: 700;">${entityName || '—'}</td></tr>
        <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">IP Address</td><td style="font-family: monospace;">${ipAddress || 'Unknown'}</td></tr>
        <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Timestamp</td><td>${timestamp}</td></tr>
        ${details ? `<tr><td style="padding: 6px 0; color: #666; font-size: 13px; vertical-align: top;">Details</td><td style="font-size: 13px;">${JSON.stringify(details, null, 2)}</td></tr>` : ''}
      </table>
    </div>

    <p>If this action was expected and authorized, no further steps are required. If this activity looks suspicious, please investigate the admin account immediately.</p>

    <div style="text-align: center;">
      <a href="${adminPanelUrl}/admin" class="premium-btn" style="background: #dc2626;">Review Admin Logs</a>
    </div>
  `;
  return getBaseTemplate('🚨 Admin Security Alert - Rerendet', content, { logoUrl });
};

// ── Fraud / Repeated Payment Failure Alert (sent to Super Admin) ─────────────
export const getFraudAlert = ({ userName, userEmail, userId, failureCount, totalAttempted, paymentMethods, timeWindow, logoUrl }) => {
  const adminPanelUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const content = `
    <h1 style="color: #f59e0b;">🕵️ Fraud Risk Detected</h1>
    <p>Our automated monitoring system has flagged a customer showing signs of <strong>suspicious repeated payment failure activity</strong>.</p>

    <div class="info-card" style="border-left: 4px solid #f59e0b; background: #fffbeb;">
      <span class="info-card-title" style="color: #d97706;">⚠️ PAYMENT FRAUD SIGNAL</span>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr><td style="padding: 6px 0; color: #666; font-size: 13px; width: 40%;">Customer</td><td style="font-weight: 700;">${userName}</td></tr>
        <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Email</td><td>${userEmail}</td></tr>
        <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">User ID</td><td style="font-family: monospace; font-size: 12px;">${userId}</td></tr>
        <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Failed Attempts</td><td style="font-weight: 700; color: #dc2626;">${failureCount} failures in ${timeWindow}</td></tr>
        <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Total KES Attempted</td><td style="font-weight: 700;">KES ${(totalAttempted || 0).toLocaleString()}</td></tr>
        <tr><td style="padding: 6px 0; color: #666; font-size: 13px;">Methods Used</td><td>${(paymentMethods || []).join(', ')}</td></tr>
      </table>
    </div>

    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 12px; margin: 30px 0;">
      <h4 style="margin: 0 0 10px 0; color: #856404;">Recommended Action</h4>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #666; line-height: 2;">
        <li>Review this customer's order and payment history</li>
        <li>Consider temporarily freezing their account if the pattern continues</li>
        <li>Contact the customer directly if this appears to be a genuine issue</li>
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="${adminPanelUrl}/admin/users" class="premium-btn" style="background: #d97706;">Review Customer Account</a>
    </div>
  `;
  return getBaseTemplate('🕵️ Fraud Risk Alert - Rerendet', content, { logoUrl });
};

