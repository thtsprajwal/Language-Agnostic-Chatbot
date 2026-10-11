import { Router } from "express";
import {
  approveUser,
  getActiveSessions,
  getPendingUsers,
  getProfile,
  login,
  logout,
  rejectUser,
  requestEmailVerification,
  requestPasswordReset,
  resetPassword,
  revokeAllSessions,
  revokeSession,
  refreshAccessToken,
  register,
  setupMfa,
  verifyEmail,
  verifyMfaSetup,
} from "../controllers/authController.js";
import { authenticateJWT, authorizeRoles } from "../middleware/authMiddleware.js";
import csrfProtection, { getCsrfTokenResponse } from "../middleware/csrfMiddleware.js";

const authRouter = Router();

authRouter.get("/csrf-token", csrfProtection, getCsrfTokenResponse);
authRouter.post("/register", csrfProtection, register);
authRouter.post("/login", csrfProtection, login);
authRouter.post("/refresh", csrfProtection, refreshAccessToken);
authRouter.post("/logout", csrfProtection, logout);
authRouter.get("/me", authenticateJWT, getProfile);
authRouter.get("/admin/pending-users", authenticateJWT, authorizeRoles("admin"), getPendingUsers);
authRouter.post("/admin/users/:userId/approve", authenticateJWT, authorizeRoles("admin"), csrfProtection, approveUser);
authRouter.post("/admin/users/:userId/reject", authenticateJWT, authorizeRoles("admin"), csrfProtection, rejectUser);
authRouter.post("/request-email-verification", csrfProtection, requestEmailVerification);
authRouter.post("/verify-email", csrfProtection, verifyEmail);
authRouter.post("/request-password-reset", csrfProtection, requestPasswordReset);
authRouter.post("/reset-password", csrfProtection, resetPassword);
authRouter.post("/mfa/setup", authenticateJWT, csrfProtection, setupMfa);
authRouter.post("/mfa/verify", authenticateJWT, csrfProtection, verifyMfaSetup);
authRouter.get("/sessions", authenticateJWT, getActiveSessions);
authRouter.post("/sessions/revoke-all", authenticateJWT, csrfProtection, revokeAllSessions);
authRouter.post("/sessions/revoke/:sessionId", authenticateJWT, csrfProtection, revokeSession);

export default authRouter;
