import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import { getVerificationEmail, getWelcomeEmail, getResetPasswordEmail, getRegretEmail } from '../utils/emailTemplates.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ==================== CUSTOMER AUTH ====================

// @desc    Verify 2FA Code and Login
// @route   POST /api/auth/verify-2fa
// @access  Public
const verify2FALogin = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email }).select('+verificationCode +verificationCodeExpires +role +isVerified +wallet +shippingInfo +cart +twoFactorEnabled +adminPermissions');

  if (!user || user.verificationCode !== code || user.verificationCodeExpires < Date.now()) {
    res.status(400);
    throw new Error('Invalid or expired verification code');
  }

  // Clear code
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        role: user.role,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture,
        shippingInfo: user.shippingInfo || {},
        wallet: user.wallet || {},
        cart: user.cart || [],

        twoFactorEnabled: user.twoFactorEnabled,
        permissions: user.adminPermissions // Crucial for Admin UI
      },
      token
    }
  });
});

// @desc    Toggle 2FA
// @route   PUT /api/auth/toggle-2fa
// @access  Private
const toggle2FA = asyncHandler(async (req, res) => {
  const { enabled, password } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!await user.comparePassword(password)) {
    res.status(401);
    throw new Error('Incorrect password');
  }

  user.twoFactorEnabled = enabled;
  await user.save();

  res.json({
    success: true,
    message: `Two-Factor Authentication ${enabled ? 'enabled' : 'disabled'}`
  });
});

// Customer registration
const registerCustomer = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone, gender, dateOfBirth, userType = 'customer' } = req.body;

  console.log(`👤 Customer registration attempt:`, email);

  // Validate required fields
  if (!firstName || !lastName || !email || !password) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }

  // Validate age if dateOfBirth provided
  if (dateOfBirth) {
    const age = Math.floor((new Date() - new Date(dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 13) {
      res.status(400);
      throw new Error('You must be at least 13 years old to create an account');
    }
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // Create customer user
  const userData = {
    firstName,
    lastName,
    email,
    password,
    phone,
    gender,
    dateOfBirth,
    userType: 'customer', // Force customer type
    role: 'customer'
  };

  const newUser = await User.create(userData);

  // Generate verification code
  const verificationCode = newUser.generateVerificationCode();
  await newUser.save({ validateBeforeSave: false });

  try {


    // Fetch store logo for email
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (error) {
      console.error('Error fetching settings for email logo:', error);
    }

    // Send verification email
    const emailHtml = getVerificationEmail(firstName, verificationCode, logoUrl);

    await sendEmail({
      to: newUser.email,
      subject: `Verify Your Email - Rerendet Coffee`,
      html: emailHtml
    });



    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for verification.',
      data: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phone: newUser.phone,
        userType: newUser.userType
      }
    });

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    await User.findByIdAndDelete(newUser._id);
    res.status(500);
    throw new Error('Registration failed: Could not send verification email. Please try again.');
  }
});

// Google Login
// Google Login
import { OAuth2Client } from 'google-auth-library';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400);
    throw new Error('Google credential is required');
  }

  try {
    // Verify Google Token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { email, given_name: firstName, family_name: lastName, picture, sub: googleId } = payload;

    // Check if user exists
    let user = await User.findOne({ email }).populate('cart.product');

    if (user) {
      // SECURITY CHECK: Prevent Admin Login via Customer Google Auth
      if (user.userType === 'admin' || user.role === 'admin' || user.role === 'super-admin') {
        res.status(403);
        throw new Error('Administrators must log in via the Admin Portal using a password.');
      }

      // If user exists, update googleId if missing
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.profilePicture) user.profilePicture = picture;
        // Auto-verify if trusting Google
        if (!user.isVerified) user.isVerified = true;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        firstName,
        lastName: lastName || firstName, // Handle missing last name
        email,
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!", // Secure random password
        googleId,
        userType: 'customer',
        role: 'customer',
        // Mark as verified since Google vouches for email, but we still force 2FA login
        isVerified: true,
        profilePicture: picture
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // ENFORCE 2FA: Generate Verification Code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save();

      // Fetch store logo for email
      let logoUrl;
      try {
        const settings = await Settings.getSettings();
        logoUrl = settings?.store?.logo;
      } catch (error) {
        console.error('Error fetching settings for email logo:', error);
      }

      // Send detailed 2FA Email
      try {
        await sendEmail({
          to: email,
          subject: 'Google Login Verification - Rerendet Coffee',
          html: getVerificationEmail(firstName, verificationCode, logoUrl)
        });
        console.log('📧 2FA code sent to Google user:', email);
      } catch (err) {
        console.error('❌ Failed to send 2FA email:', err);
        res.status(500);
        throw new Error('Failed to send verification email');
      }

      // Return 2FA Required response (NO TOKEN)
      return res.json({
        success: true,
        message: 'Verification code sent to your email',
        requires2FA: true,
        email: user.email // Needed for frontend context
      });
    }

    // Direct Login (No 2FA)
    user.lastLoginAt = new Date();
    // Ensure verified if they came from Google
    if (!user.isVerified) user.isVerified = true;
    await user.save();

    const token = generateToken(user._id);

    console.log(`✅ Google Login successful for ${email}`);

    res.json({
      success: true,
      message: 'Google login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          role: user.role,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture,
          shippingInfo: user.shippingInfo || {},
          wallet: user.wallet || {},
          cart: user.cart || [],
          twoFactorEnabled: user.twoFactorEnabled
        },
        token
      }
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401);
    throw new Error(error.message || 'Invalid Google Token');
  }
});

// Customer login
const loginCustomer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log('👤 Customer login attempt:', email);

  // First, find user by email to do a proper check
  const user = await User.findOne({ email }).select('+password +isVerified +loginAttempts +lockUntil +verificationCode +verificationCodeExpires +twoFactorEnabled +userType');

  if (!user) {
    console.log('❌ Customer not found:', email);
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Security Check: is this an admin?
  if (user.userType === 'admin' || user.role === 'admin' || user.role === 'super-admin') {
    console.log('⚠️ Admin attempted login via customer portal:', email);
    res.status(403);
    throw new Error('This account is an Administrator. Please use the Admin Login Portal.');
  }

  // Check if account is locked
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const lockTime = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
    res.status(423);
    throw new Error(`Account temporarily locked. Try again in ${lockTime} minutes.`);
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    console.log('❌ Invalid password for customer:', email);

    // Increment login attempts
    await User.findByIdAndUpdate(user._id, {
      $inc: { loginAttempts: 1 }
    });

    // Check if we should lock the account
    const updatedUser = await User.findById(user._id).select('+loginAttempts');
    if (updatedUser.loginAttempts + 1 >= 5) {
      await User.findByIdAndUpdate(user._id, {
        lockUntil: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
      });
      res.status(423);
      throw new Error('Too many failed attempts. Account locked for 2 hours.');
    }

    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check for 2FA specifically for the user (ignoring Google auth flow here, this is email/pass)
  if (user.twoFactorEnabled) {
    // Generate code
    const verificationCode = user.generateVerificationCode();
    await user.save(); // Save code to DB

    // Fetch store logo for email
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (error) {
      console.error('Error fetching settings for email logo:', error);
    }

    // Send email
    try {
      await sendEmail({
        to: email,
        subject: 'Login Verification Code - Rerendet Coffee',
        html: getVerificationEmail(user.firstName, verificationCode, logoUrl)
      });
    } catch (error) {
      console.error('Failed to send 2FA email:', error);
      res.status(500);
      throw new Error('Failed to send verification email');
    }

    return res.json({
      success: true,
      message: 'Verification code sent to email',
      requires2FA: true,
      email: user.email
    });
  }

  // If no 2FA, proceed with normal login
  // Reset login attempts on successful login
  if (user.loginAttempts > 0 || user.lockUntil) {
    await User.findByIdAndUpdate(user._id, {
      $set: { loginAttempts: 0 },
      $unset: { lockUntil: 1 }
    });
  }

  // Check if account is verified
  if (!user.isVerified) {
    console.log('❌ Customer account not verified:', email);

    // Resend verification code
    const verificationCode = user.generateVerificationCode();
    await user.save({ validateBeforeSave: false });

    try {
      await sendEmail({
        to: user.email,
        subject: 'Verification Required - Rerendet Coffee',
        html: `Your verification code: <strong>${verificationCode}</strong>`
      });
    } catch (emailError) {
      console.error('Failed to resend verification:', emailError);
    }

    res.status(403);
    throw new Error('Account not verified. A new verification code has been sent to your email.');
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Populate cart after save
  await user.populate('cart.product');

  // Generate token
  const token = generateToken(user._id);

  console.log('✅ Customer login successful:', email);

  res.json({
    success: true,
    message: 'Login successful! Welcome back!',
    data: {
      user: {
        id: user._id,
        _id: user._id, // Add for consistency
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        role: user.role,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture,
        shippingInfo: user.shippingInfo || {},
        wallet: user.wallet || {},
        cart: user.cart || [],
        twoFactorEnabled: user.twoFactorEnabled
      },
      token
    }
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    // Validate age if updating dateOfBirth
    if (req.body.dateOfBirth) {
      const age = Math.floor((new Date() - new Date(req.body.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 13) {
        res.status(400);
        throw new Error('You must be at least 13 years old');
      }
    }

    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.phone = req.body.phone || user.phone;
    user.gender = req.body.gender || user.gender;
    user.dateOfBirth = req.body.dateOfBirth || user.dateOfBirth;

    // Handle shipping info update
    if (req.body.shippingInfo) {
      if (!user.shippingInfo) user.shippingInfo = {};

      // Explicitly merge to ensure Mongoose change tracking works
      const newInfo = { ...user.shippingInfo, ...req.body.shippingInfo };
      // Mongoose sometimes struggles with direct assignment of subdocuments if it thinks it's the same object reference
      // So we assign it new object
      user.shippingInfo = newInfo;
      user.markModified('shippingInfo');
    }

    // Handle wallet update
    if (req.body.wallet) {
      if (!user.wallet) user.wallet = {};

      const newWallet = { ...user.wallet, ...req.body.wallet };
      user.wallet = newWallet;
      user.markModified('wallet');
    }

    // Handle newsletter preference if sent
    if (req.body.preferences) {
      user.preferences = { ...user.preferences, ...req.body.preferences };
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      data: {
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        userType: updatedUser.userType,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        profilePicture: updatedUser.profilePicture,
        profilePicture: updatedUser.profilePicture,
        shippingInfo: updatedUser.shippingInfo,
        wallet: updatedUser.wallet,
        twoFactorEnabled: updatedUser.twoFactorEnabled,
        preferences: updatedUser.preferences
      }
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
// Change password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (newPassword && newPassword.length < 8) {
    res.status(400);
    throw new Error('New password must be at least 8 characters long');
  }

  const user = await User.findById(req.user._id).select('+password');

  if (user && (await bcrypt.compare(currentPassword, user.password))) {
    user.password = newPassword;
    await user.save();

    // Clear sensitive data
    user.password = undefined;

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } else {
    res.status(401);
    throw new Error('Invalid current password');
  }
});

// @desc    Delete user account
// @route   DELETE /api/auth/profile
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const userEmail = user.email;
    const firstName = user.firstName;

    await User.deleteOne({ _id: user._id });

    // Fetch store logo for email
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (error) {
      console.error('Error fetching settings for email logo:', error);
    }

    // Send regret email
    try {
      await sendEmail({
        to: userEmail,
        subject: "Account Deleted - We'll Miss You! ☕",
        html: getRegretEmail(firstName, logoUrl)
      });
      console.log('📧 Regret email sent to:', userEmail);
    } catch (emailError) {
      console.error('❌ Failed to send regret email:', emailError);
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// ==================== ADMIN AUTH ====================

// Admin login (separate endpoint)
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log('👑 Admin login attempt:', email);

  try {
    // Find admin user ONLY
    const user = await User.findOne({
      email,
      userType: 'admin'
    }).select('+password +adminPermissions +role +isVerified +isActive +loginAttempts +lockUntil');

    if (!user) {
      console.log('❌ Admin not found:', email);
      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      res.status(423);
      throw new Error(`Account temporarily locked. Try again in ${lockTime} minutes.`);
    }

    // Check if admin account is active
    if (user.isActive === false) {
      console.log('❌ Admin account inactive:', email);
      res.status(401);
      throw new Error('Admin account is deactivated. Please contact system administrator.');
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log('❌ Invalid password for admin:', email);

      // Increment login attempts
      const attempts = (user.loginAttempts || 0) + 1;
      await User.findByIdAndUpdate(user._id, {
        $set: { loginAttempts: attempts }
      });

      // Check if we should lock the account (threshold: 5)
      if (attempts >= 5) {
        await User.findByIdAndUpdate(user._id, {
          $set: { lockUntil: Date.now() + (2 * 60 * 60 * 1000) } // 2 hours
        });
        res.status(423);
        throw new Error('Too many failed attempts. Account locked for 2 hours.');
      }

      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      await User.findByIdAndUpdate(user._id, {
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
      });
    }

    // Check if admin account is verified
    if (!user.isVerified) {
      console.log('❌ Admin account not verified:', email);
      res.status(403);
      throw new Error('Admin account requires verification. Please contact system administrator.');
    }



    // Direct Login without 2FA
    user.lastLoginAt = new Date();
    await user.save();

    // Generate Token
    const token = generateToken(user._id);

    console.log('✅ Admin login successful (2FA Disabled):', email);

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.adminPermissions,
          profilePicture: user.profilePicture
        },
        token
      }
    });

  } catch (error) {
    console.error('❌ Admin login error:', error.message);
    // Ensure we don't expose 500 details unless needed
    if (res.statusCode === 200) res.status(500);
    throw new Error(error.message || 'Server error during admin login');
  }
});

// Create admin (protected - super-admin only)
const createAdmin = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role = 'admin', permissions = {} } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !password) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }

  console.log(`⚡ Super-admin ${req.user.email} creating admin:`, email);

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // Set default permissions based on role
  const defaultPermissions = {
    canManageUsers: role === 'super-admin',
    canManageProducts: true,
    canManageOrders: true,
    canManageContent: true,
    ...permissions
  };

  // Create admin
  const admin = await User.create({
    firstName,
    lastName,
    email,
    password,
    userType: 'admin',
    role: role,
    isVerified: true,
    isActive: true,
    adminPermissions: defaultPermissions
  });

  console.log('✅ Admin created:', email, 'Role:', role);

  // Send welcome email to new admin
  try {
    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #7c2d12); color: white; padding: 30px; text-align: center;">
          <h1>⚡ Rerendet Coffee Admin</h1>
          <p>Administrator Account Activated</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2>Welcome ${firstName}!</h2>
          <p>Your administrator account has been successfully created and activated.</p>
          <div style="background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3>🔧 Admin Permissions</h3>
            <ul>
              ${defaultPermissions.canManageUsers ? '<li>✅ Manage Users</li>' : ''}
              ${defaultPermissions.canManageProducts ? '<li>✅ Manage Products</li>' : ''}
              ${defaultPermissions.canManageOrders ? '<li>✅ Manage Orders</li>' : ''}
              ${defaultPermissions.canManageContent ? '<li>✅ Manage Content</li>' : ''}
            </ul>
            <p><strong>Role:</strong> ${role}</p>
          </div>
          <p>You can now access the admin dashboard.</p>
          <p><strong>Admin Dashboard:</strong> <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/login">Access Admin Panel</a></p>
        </div>
      </div>
    `;

    await sendEmail({
      to: admin.email,
      subject: `🎯 Admin Account Activated - Rerendet Coffee ${role.toUpperCase()}`,
      templateName: 'adminWelcomeEmail',
      data: {
        firstName: firstName,
        permissions: defaultPermissions,
        role: role,
        adminUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/login`
      }
    });

    console.log('✅ Admin welcome email sent to:', email);
  } catch (emailError) {
    console.error('❌ Failed to send admin welcome email:', emailError);
  }

  res.status(201).json({
    success: true,
    message: `${role} account created successfully`,
    data: {
      id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      permissions: admin.adminPermissions
    }
  });
});

// ==================== COMMON AUTH ====================

// Verify email
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({
    email,
    verificationCode: code,
    verificationCodeExpires: { $gt: Date.now() }
  });

  if (!user) {
    // Clean up unverified users with expired codes
    const maybeUser = await User.findOne({ email });
    if (maybeUser && !maybeUser.isVerified && maybeUser.userType === 'customer') {
      console.log(`Deleting unverified customer ${email} due to invalid/expired code`);
      await User.deleteOne({ _id: maybeUser._id });
    }
    res.status(400);
    throw new Error('Invalid or expired verification code');
  }

  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  await user.save();

  const token = generateToken(user._id);

  // Send welcome email
  try {
    // Fetch store logo for email
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (error) {
      console.error('Error fetching settings for email logo:', error);
    }

    await sendEmail({
      to: user.email,
      subject: 'Welcome to Rerendet Coffee! 🎉',
      html: getWelcomeEmail(user.firstName, logoUrl)
    });
  } catch (welcomeError) {
    // Email failure doesn't stop flow
    console.error('Failed to send welcome email:', welcomeError);
  }

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      role: user.role,
      isVerified: user.isVerified,
      cart: user.cart || [],
      token
    }
  });
});

// Get current user profile
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('cart.product');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const userData = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    userType: user.userType,
    role: user.role,
    isVerified: user.isVerified,
    profilePicture: user.profilePicture,
    shippingInfo: user.shippingInfo || {}
  };

  // Add permissions if admin
  if (user.userType === 'admin') {
    userData.permissions = user.adminPermissions;
  }

  res.json({
    success: true,
    data: userData
  });
});

// Update user profile


// Logout
const logout = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Check email availability
const checkEmail = asyncHandler(async (req, res) => {
  const { email } = req.query;

  if (!email) {
    res.status(400);
    throw new Error('Email parameter is required');
  }

  const user = await User.findOne({ email });

  res.json({
    success: true,
    data: {
      exists: !!user,
      userType: user?.userType
    }
  });
});

// Forgot password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('User not found with this email');
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordToken = resetCode;
  user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save({ validateBeforeSave: false });

  try {
    // Fetch store logo for email
    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (error) {
      console.error('Error fetching settings for email logo:', error);
    }

    // Send reset email
    const emailHtml = getResetPasswordEmail(user.firstName, resetCode, logoUrl);

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: emailHtml
    });
    console.log('📧 Reset email sent to:', user.email);

    res.json({
      success: true,
      message: 'Password reset code sent to your email'
    });


  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500);
    throw new Error('Email could not be sent');
  }
});

// Reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    res.status(400);
    throw new Error('Email, code, and new password are required');
  }

  if (newPassword.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters long');
  }

  const user = await User.findOne({
    email,
    resetPasswordToken: code,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset code');
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
});

// Change password


// Resend verification code
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await User.findOne({ email, userType: 'customer' });

  if (!user) {
    res.status(404);
    throw new Error('User not found with this email');
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error('Email is already verified');
  }

  const verificationCode = user.generateVerificationCode();
  await user.save({ validateBeforeSave: false });

  try {
    const emailHtml = `
  < div style = "font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;" >
        <div style="background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; text-align: center;">
          <h1>☕ Rerendet Coffee</h1>
          <p>New Verification Code</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2>Hello ${user.firstName}!</h2>
          <p>You requested a new verification code:</p>
          <div style="background: white; padding: 20px; text-align: center; margin: 20px 0; border: 2px dashed #10b981;">
            <div style="font-size: 2.5rem; font-weight: bold; color: #10b981; letter-spacing: 5px;">${verificationCode}</div>
          </div>
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 15px 0;">
            <strong>⚠️ This code will expire in 10 minutes.</strong>
          </div>
        </div>
      </div >
  `;

    await sendEmail({
      to: user.email,
      subject: 'New Verification Code - Rerendet Coffee',
      templateName: 'verificationEmail',
      data: {
        firstName: user.firstName,
        verificationCode: verificationCode
      }
    });

    console.log('✅ Verification email resent to:', email);

    res.json({
      success: true,
      message: 'Verification code sent to your email'
    });

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    res.status(500);
    throw new Error('Failed to send verification email');
  }
});

export {
  // Customer auth
  registerCustomer,
  loginCustomer,
  verify2FALogin,
  toggle2FA,
  googleLogin,

  // Admin auth
  loginAdmin,
  createAdmin,

  // Common auth
  verifyEmail,
  getCurrentUser,
  updateProfile,
  logout,
  checkEmail,
  forgotPassword,
  resetPassword,
  resendVerification,
  changePassword,
  deleteAccount
};

/**
 * @desc    Get user's saved cart
 * @route   GET /api/auth/cart
 * @access  Private
 */
export const getCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('cart.product');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    data: user.cart || []
  });
});

/**
 * @desc    Sync user's cart with database
 * @route   POST /api/auth/cart
 * @access  Private
 */
export const syncCart = asyncHandler(async (req, res) => {
  const { cart } = req.body;

  if (!Array.isArray(cart)) {
    res.status(400);
    throw new Error('Invalid cart data');
  }

  // Map frontend cart to database structure
  const formattedCart = cart.map(item => ({
    product: item.productId || item._id,
    quantity: item.quantity,
    size: item.size || '250g'
  }));

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { cart: formattedCart },
    { new: true, runValidators: true }
  ).populate('cart.product');

  res.status(200).json({
    success: true,
    data: user.cart
  });
});