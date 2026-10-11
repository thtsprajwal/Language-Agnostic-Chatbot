import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import AuditLog from "../models/audit.model.js";
import Session from "../models/session.model.js";
import User from "../models/user.model.js";
import { APPROVAL_STATES, canUserLogin, getApprovalStatusForRole } from "../utils/authPolicy.js";

const ROLES = ["student", "faculty", "admin"];
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

const getAccessTokenSecret = () => process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const getRefreshTokenSecret = () => process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

const getCookieOptions = (maxAgeMs = 7 * 24 * 60 * 60 * 1000) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: maxAgeMs,
});

const ensureSecrets = () => {
  if (!getAccessTokenSecret()) {
    throw new Error("ACCESS_TOKEN_SECRET or JWT_SECRET environment variable is not set");
  }

  if (!getRefreshTokenSecret()) {
    throw new Error("REFRESH_TOKEN_SECRET or JWT_SECRET environment variable is not set");
  }
};

const randomToken = () => crypto.randomBytes(32).toString("hex");

const buildUserPayload = (user) => ({
  id: user._id,
  email: user.email,
  role: user.role,
  approvalStatus: user.approvalStatus || getApprovalStatusForRole(user.role),
  emailVerified: Boolean(user.emailVerified),
  mfaEnabled: Boolean(user.mfaEnabled),
});

const createAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
     approvalStatus: user.approvalStatus || getApprovalStatusForRole(user.role),
     email: user.email,
     emailVerified: Boolean(user.emailVerified),
     mfaEnabled: Boolean(user.mfaEnabled),
     type: "access",
    },
    getAccessTokenSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

const createRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      type: "refresh",
      sessionVersion: user.sessionVersion || 0,
    },
    getRefreshTokenSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

const createAuditLog = async ({ event, user, req, details = {} }) => {
  try {
    await AuditLog.create({
      event,
      userId: user?._id || null,
      email: user?.email || req?.body?.email || "",
      ipAddress: req?.ip || req?.socket?.remoteAddress || "",
      userAgent: req?.headers?.["user-agent"] || "",
      details,
    });
  } catch (error) {
    console.error("Audit logging failed:", error.message);
  }
};

const getMailTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT || 587) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const sendAuthEmail = async ({ to, subject, text, html }) => {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.log(`[email] ${subject} to=${to}`);
    console.log(text);
    return true;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "no-reply@campus.local",
    to,
    subject,
    text,
    html,
  });

  return true;
};

const saveRefreshTokenAndSetCookie = async (req, res, user) => {
  const refreshToken = createRefreshToken(user);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await Session.updateMany(
    { user: user._id, revoked: false },
    { $set: { revoked: true, revokedAt: new Date() } }
  );

  user.refreshTokenHash = refreshTokenHash;
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();

  await Session.create({
    user: user._id,
    refreshTokenHash,
    userAgent: req.headers["user-agent"] || "unknown",
    ipAddress: req.ip || req.socket?.remoteAddress || "",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  res.cookie("refreshToken", refreshToken, getCookieOptions());
};

export const register = async (req, res) => {
  try {
    ensureSecrets();

    const { email, password, role = "student" } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role provided" });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const approvalStatus = getApprovalStatusForRole(role);
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role,
      approvalStatus,
      approvedAt: approvalStatus === APPROVAL_STATES.APPROVED ? new Date() : null,
      emailVerified: false,
    });

    await createAuditLog({ event: "register", user, req, details: { role, approvalStatus } });

    if (approvalStatus === APPROVAL_STATES.PENDING) {
      return res.status(201).json({
        message: "Account created. Awaiting admin approval.",
        approvalStatus,
        user: buildUserPayload(user),
      });
    }

    await saveRefreshTokenAndSetCookie(req, res, user);
    const accessToken = createAccessToken(user);

    return res.status(201).json({
      accessToken,
      user: buildUserPayload(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    ensureSecrets();

    const { email, password, role, mfaCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (role && role !== user.role) {
      return res.status(403).json({ message: "Selected role does not match account role" });
    }

    if (!canUserLogin(user)) {
      return res.status(403).json({
        message:
          user.approvalStatus === APPROVAL_STATES.PENDING
            ? "Your account is awaiting admin approval."
            : "Your account has been rejected. Please contact the administrator.",
        approvalStatus: user.approvalStatus || getApprovalStatusForRole(user.role),
      });
    }

    if (user.mfaEnabled) {
      if (!mfaCode) {
        return res.status(401).json({
          message: "MFA required",
          requiresMfa: true,
          user: buildUserPayload(user),
        });
      }

      const verified = authenticator.verify({
        secret: user.mfaSecret,
        token: String(mfaCode),
      });

      if (!verified) {
        return res.status(401).json({ message: "Invalid MFA code" });
      }
    }

    await saveRefreshTokenAndSetCookie(req, res, user);
    const accessToken = createAccessToken(user);

    await createAuditLog({ event: "login", user, req, details: { role: user.role } });

    return res.status(200).json({
      accessToken,
      user: buildUserPayload(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    ensureSecrets();

    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    const payload = jwt.verify(refreshToken, getRefreshTokenSecret());
    if (payload.type !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (!canUserLogin(user)) {
      return res.status(403).json({
        message:
          user.approvalStatus === APPROVAL_STATES.PENDING
            ? "Your account is awaiting admin approval."
            : "Your account has been rejected. Please contact the administrator.",
        approvalStatus: user.approvalStatus || getApprovalStatusForRole(user.role),
      });
    }

    await saveRefreshTokenAndSetCookie(req, res, user);
    const accessToken = createAccessToken(user);

    await createAuditLog({ event: "refresh_token", user, req, details: { refreshed: true } });

    return res.status(200).json({
      accessToken,
      user: buildUserPayload(user),
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, getRefreshTokenSecret());
        const user = await User.findById(payload.sub);
        if (user) {
          user.refreshTokenHash = null;
          await user.save();
          await Session.updateMany(
            { user: user._id, revoked: false },
            { $set: { revoked: true, revokedAt: new Date() } }
          );
          await createAuditLog({ event: "logout", user, req, details: { revokedSessions: true } });
        }
      } catch {
        // Ignore invalid token; still clear the cookie.
      }
    }

    res.clearCookie("refreshToken", getCookieOptions());
    res.clearCookie("csrfToken", {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getProfile = async (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      approvalStatus: req.user.approvalStatus || getApprovalStatusForRole(req.user.role),
      emailVerified: Boolean(req.user.emailVerified),
      mfaEnabled: Boolean(req.user.mfaEnabled),
    },
  });
};

export const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({
      approvalStatus: { $in: [APPROVAL_STATES.PENDING, APPROVAL_STATES.REJECTED] },
    }).select("_id email role approvalStatus createdAt");

    return res.status(200).json({
      users: users.map((user) => ({
        id: user._id,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateUserApproval = async (req, res) => {
  try {
    const { userId } = req.params;
    const { approvalStatus } = req.body;

    if (!approvalStatus || ![APPROVAL_STATES.APPROVED, APPROVAL_STATES.REJECTED].includes(approvalStatus)) {
      return res.status(400).json({ message: "Valid approvalStatus is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.approvalStatus = approvalStatus;
    user.approvedAt = approvalStatus === APPROVAL_STATES.APPROVED ? new Date() : null;
    user.rejectedAt = approvalStatus === APPROVAL_STATES.REJECTED ? new Date() : null;
    await user.save();

    await createAuditLog({
      event: approvalStatus === APPROVAL_STATES.APPROVED ? "user_approved" : "user_rejected",
      user: req.user,
      req,
      details: { targetUserId: userId, targetEmail: user.email, approvalStatus },
    });

    return res.status(200).json({
      message: approvalStatus === APPROVAL_STATES.APPROVED ? "User approved" : "User rejected",
      user: buildUserPayload(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const approveUser = async (req, res) => {
  req.body = { ...req.body, approvalStatus: APPROVAL_STATES.APPROVED };
  return updateUserApproval(req, res);
};

export const rejectUser = async (req, res) => {
  req.body = { ...req.body, approvalStatus: APPROVAL_STATES.REJECTED };
  return updateUserApproval(req, res);
};

export const requestEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(200).json({ message: "Email already verified" });
    }

    const token = randomToken();
    const tokenHash = await bcrypt.hash(token, 10);
    user.emailVerificationTokenHash = tokenHash;
    user.emailVerificationExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email?token=${token}`;
    await sendAuthEmail({
      to: user.email,
      subject: "Verify your email",
      text: `Verify your email here: ${verificationUrl}`,
      html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
    });

    return res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const users = await User.find({ emailVerificationTokenHash: { $ne: null } });
    const matchedUser = await Promise.all(
      users.map(async (user) => {
        if (!user.emailVerificationExpiresAt || new Date(user.emailVerificationExpiresAt) < new Date()) {
          return null;
        }

        const matches = await bcrypt.compare(token, user.emailVerificationTokenHash);
        return matches ? user : null;
      })
    ).then((results) => results.find(Boolean));

    if (!matchedUser) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    matchedUser.emailVerified = true;
    matchedUser.emailVerificationTokenHash = null;
    matchedUser.emailVerificationExpiresAt = null;
    await matchedUser.save();

    await createAuditLog({ event: "email_verified", user: matchedUser, req, details: { verified: true } });

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = randomToken();
    const tokenHash = await bcrypt.hash(token, 10);
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;
    await sendAuthEmail({
      to: user.email,
      subject: "Password reset request",
      text: `Reset your password here: ${resetUrl}`,
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
    });

    return res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const users = await User.find({ passwordResetTokenHash: { $ne: null } });
    const matchedUser = await Promise.all(
      users.map(async (user) => {
        if (!user.passwordResetExpiresAt || new Date(user.passwordResetExpiresAt) < new Date()) {
          return null;
        }

        const matches = await bcrypt.compare(token, user.passwordResetTokenHash);
        return matches ? user : null;
      })
    ).then((results) => results.find(Boolean));

    if (!matchedUser) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    matchedUser.password = await bcrypt.hash(password, 10);
    matchedUser.passwordResetTokenHash = null;
    matchedUser.passwordResetExpiresAt = null;
    await matchedUser.save();

    await createAuditLog({ event: "password_reset", user: matchedUser, req, details: { reset: true } });

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const setupMfa = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const secret = authenticator.generateSecret();
    user.pendingMfaSecret = secret;
    user.mfaEnabled = false;
    await user.save();

    const otpauthUrl = authenticator.keyuri(user.email, "Campus Intelligence", secret);
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return res.status(200).json({ secret, otpauthUrl, qrCode });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyMfaSetup = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "MFA code is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.pendingMfaSecret) {
      return res.status(400).json({ message: "No MFA setup in progress" });
    }

    const isValid = authenticator.verify({
      secret: user.pendingMfaSecret,
      token: String(code),
    });

    if (!isValid) {
      return res.status(401).json({ message: "Invalid MFA code" });
    }

    user.mfaSecret = user.pendingMfaSecret;
    user.pendingMfaSecret = null;
    user.mfaEnabled = true;
    await user.save();

    await createAuditLog({ event: "mfa_enabled", user, req, details: { enabled: true } });

    return res.status(200).json({ message: "MFA enabled successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getActiveSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      user: req.user.id,
      revoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      sessions: sessions.map((session) => ({
        id: session._id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ _id: sessionId, user: req.user.id });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    session.revoked = true;
    session.revokedAt = new Date();
    await session.save();

    return res.status(200).json({ message: "Session revoked" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const revokeAllSessions = async (req, res) => {
  try {
    await Session.updateMany(
      { user: req.user.id, revoked: false },
      { $set: { revoked: true, revokedAt: new Date() } }
    );

    const user = await User.findById(req.user.id);
    user.refreshTokenHash = null;
    await user.save();

    await createAuditLog({ event: "sessions_revoked_all", user, req, details: { revokedAll: true } });

    return res.status(200).json({ message: "All sessions revoked" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
