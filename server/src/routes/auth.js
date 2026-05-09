const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body } = require('express-validator');

const { User } = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../utils/validate');
const { HttpError } = require('../utils/httpError');
const { sendOtpEmail } = require('../utils/mailer');

const router = express.Router();

function signToken(user) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: String(user._id),
    expiresIn,
  });
}

function generateOtp() {
  // 6 digit numeric OTP
  const n = crypto.randomInt(100000, 1000000);
  return String(n);
}

async function issueAndSendOtp(user) {
  const otp = generateOtp();
  const hash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  user.emailOtpHash = hash;
  user.emailOtpExpiresAt = expiresAt;
  user.emailOtpLastSentAt = new Date();
  await user.save();

  const result = await sendOtpEmail({ to: user.email, otp });
  return result;
}

router.post(
  '/register',
  [
    body('name').isString().trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isString()
      .isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
      .withMessage('Password must be 8+ chars and include uppercase, lowercase, number, and symbol'),
    body('role').optional().isIn(['admin', 'member']),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new HttpError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'member',
      emailVerified: false,
      emailVerifiedAt: null,
    });

    const otpResult = await issueAndSendOtp(user);

    res.status(201).json({
      user: user.toSafeJSON(),
      verificationRequired: true,
      otpDelivered: otpResult.delivered,
      devOtp: otpResult.dev === true,
    });
  })
);

router.post(
  '/resend-otp',
  [body('email').isEmail().normalizeEmail()],
  validate,
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const user = await User.findOne({ email });
    if (!user) throw new HttpError(404, 'User not found');

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified' });
    }

    if (user.emailOtpLastSentAt) {
      const ms = Date.now() - new Date(user.emailOtpLastSentAt).getTime();
      if (ms < 60 * 1000) {
        throw new HttpError(429, 'Please wait before requesting another OTP');
      }
    }

    const otpResult = await issueAndSendOtp(user);
    res.json({ message: 'OTP sent', otpDelivered: otpResult.delivered, devOtp: otpResult.dev === true });
  })
);

router.post(
  '/verify-email',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isString().trim().isLength({ min: 4, max: 8 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const otp = String(req.body.otp).trim();

    const user = await User.findOne({ email });
    if (!user) throw new HttpError(404, 'User not found');

    if (user.emailVerified) {
      const token = signToken(user);
      return res.json({ token, user: user.toSafeJSON() });
    }

    if (!user.emailOtpHash || !user.emailOtpExpiresAt) {
      throw new HttpError(400, 'OTP not requested');
    }

    if (new Date(user.emailOtpExpiresAt).getTime() < Date.now()) {
      throw new HttpError(400, 'OTP expired');
    }

    const ok = await bcrypt.compare(otp, user.emailOtpHash);
    if (!ok) throw new HttpError(400, 'Invalid OTP');

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailOtpHash = null;
    user.emailOtpExpiresAt = null;
    user.emailOtpLastSentAt = null;
    await user.save();

    const token = signToken(user);
    return res.json({ token, user: user.toSafeJSON() });
  })
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').isString().notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new HttpError(401, 'Invalid credentials');

    if (!user.emailVerified) {
      throw new HttpError(403, 'Email not verified');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');

    const token = signToken(user);

    res.json({ token, user: user.toSafeJSON() });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) throw new HttpError(401, 'User not found');
    res.json({ user: user.toSafeJSON() });
  })
);

module.exports = { authRouter: router };

