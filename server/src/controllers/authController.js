const bcrypt = require('bcrypt');
const prisma = require('../config/db');
const { generateToken, generateVerificationToken } = require('../utils/helpers');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const STAFF_ROLES = ['TEACHER', 'UNIVERSITY_ADMIN'];

/**
 * Resolve the account role:
 *   digits@students.riphah.edu.pk → always STUDENT
 *   letters@riphah.edu.pk         → TEACHER or UNIVERSITY_ADMIN (caller-supplied, defaults TEACHER)
 */
const resolveRole = (email, requestedRole) => {
  if (/^\d+@students\.riphah\.edu\.pk$/i.test(email)) return 'STUDENT';
  if (/^[a-zA-Z][^@]*@riphah\.edu\.pk$/i.test(email)) {
    return STAFF_ROLES.includes(requestedRole) ? requestedRole : 'TEACHER';
  }
  return null; // route validator should have already rejected this
};

// POST /api/auth/register
// Self-registration. Role is auto-determined from email; staff can additionally
// choose between TEACHER and UNIVERSITY_ADMIN via the `role` body field.
const register = async (req, res, next) => {
  try {
    const { email, password, name, department, semester, role: requestedRole } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const role = resolveRole(email, requestedRole);
    if (!role) {
      return res.status(400).json({ error: 'Could not determine account type from email address.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const ROLE_LABELS = {
      STUDENT: 'Student',
      TEACHER: 'Teaching Faculty',
      UNIVERSITY_ADMIN: 'Administrative Staff',
    };

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        department,
        // Only students track a semester
        semester: role === 'STUDENT' && semester ? parseInt(semester, 10) : null,
        role,
        isVerified: true,
      },
    });

    res.status(201).json({
      message: `${ROLE_LABELS[role] ?? role} account created successfully! You can now log in.`,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register-user
// Coordination registers a Teacher or Student with a specific role.
const registerUser = async (req, res, next) => {
  try {
    const { email, password, name, department, semester, role } = req.body;

    const allowedRoles = ['STUDENT', 'TEACHER'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Role must be STUDENT or TEACHER.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        department,
        semester: semester ? parseInt(semester, 10) : null,
        role,
        isVerified: true,
      },
    });

    res.status(201).json({
      message: `${role === 'TEACHER' ? 'Teacher' : 'Student'} account created successfully.`,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/verify-email?token=xxx
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid verification token.' });
    }

    if (verificationToken.used) {
      return res.status(400).json({ error: 'This token has already been used.' });
    }

    if (verificationToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired.' });
    }

    if (verificationToken.type !== 'EMAIL_VERIFICATION') {
      return res.status(400).json({ error: 'Invalid token type.' });
    }

    // Activate user and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { isVerified: true },
      }),
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true },
      }),
    ]);

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account has been blocked. Please contact the administration.' });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        semester: user.semester,
        batchYear: user.batchYear,
        avatarUrl: user.avatarUrl,
        skills: user.skills,
        interests: user.interests,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether user exists
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    // Invalidate existing reset tokens
    await prisma.verificationToken.updateMany({
      where: { userId: user.id, type: 'PASSWORD_RESET', used: false },
      data: { used: true },
    });

    const token = generateVerificationToken();
    await prisma.verificationToken.create({
      data: {
        token,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        userId: user.id,
      },
    });

    try {
      await sendPasswordResetEmail(email, token);
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr.message);
    }

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.used || verificationToken.type !== 'PASSWORD_RESET') {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    if (verificationToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true },
      }),
    ]);

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { register, registerUser, verifyEmail, login, forgotPassword, resetPassword, getMe };
