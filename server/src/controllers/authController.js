const bcrypt = require('bcrypt');
const prisma = require('../config/db');
const { generateToken, generateVerificationToken } = require('../utils/helpers');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const ALLOWED_REGISTER_ROLES = ['STUDENT', 'TEACHER', 'UNIVERSITY_ADMIN'];

/**
 * Resolve the account role:
 *   *@students.riphah.edu.pk → always STUDENT
 *   *@riphah.edu.pk          → STUDENT, TEACHER, or UNIVERSITY_ADMIN (defaults STUDENT if numeric prefix, else requestedRole or TEACHER)
 */
const resolveRole = (email, requestedRole) => {
  const lower = (email || '').trim().toLowerCase();
  if (lower.endsWith('@students.riphah.edu.pk')) return 'STUDENT';
  if (lower.endsWith('@riphah.edu.pk')) {
    if (ALLOWED_REGISTER_ROLES.includes(requestedRole)) return requestedRole;
    return /^\d+@/.test(lower) ? 'STUDENT' : 'TEACHER';
  }
  return null;
};

async function autoJoinStudentGroups(user) {
  if (user.role !== 'STUDENT' || !user.department || !user.semester) return;
  try {
    const matchingGroups = await prisma.semesterGroup.findMany({
      where: {
        department: user.department,
        semester: user.semester,
        isActive: true,
      },
    });
    for (const grp of matchingGroups) {
      await prisma.groupMember.upsert({
        where: { userId_groupId: { userId: user.id, groupId: grp.id } },
        update: {},
        create: { userId: user.id, groupId: grp.id },
      });
      if (grp.conversationId) {
        await prisma.conversationParticipant.upsert({
          where: {
            userId_conversationId: { userId: user.id, conversationId: grp.conversationId },
          },
          update: {},
          create: { userId: user.id, conversationId: grp.conversationId },
        });
      }
    }
  } catch (err) {
    console.warn('Auto-join semester group skipped:', err.message);
  }
}

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { email, password, name, department, semester, role: requestedRole } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const role = resolveRole(normalizedEmail, requestedRole);
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
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
        department,
        semester: role === 'STUDENT' && semester ? parseInt(semester, 10) : null,
        role,
        isVerified: true,
      },
    });

    await autoJoinStudentGroups(user);

    res.status(201).json({
      message: `${ROLE_LABELS[role] ?? role} account created successfully! You can now log in.`,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register-user
// Coordination or System Admin registers a user with a specific role.
const registerUser = async (req, res, next) => {
  try {
    const { email, password, name, department, semester, role } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const allowedRoles = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
        department,
        semester: role === 'STUDENT' && semester ? parseInt(semester, 10) : null,
        role,
        isVerified: true,
      },
    });

    await autoJoinStudentGroups(user);

    res.status(201).json({
      message: `${role} account created successfully.`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        semester: user.semester,
        isBlocked: user.isBlocked,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
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

    let isMatch = false;
    if (user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Plain text check for legacy users
      isMatch = (password === user.password);
      if (isMatch) {
        // Auto-upgrade password to bcrypt
        const hashed = await bcrypt.hash(password, 12);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashed }
        });
      }
    }

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
