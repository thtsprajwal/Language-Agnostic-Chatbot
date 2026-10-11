import jwt from "jsonwebtoken";

const getAccessTokenSecret = () => {
  return process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
};

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];
  const secret = getAccessTokenSecret();

  if (!secret) {
    return res.status(500).json({ message: "Access token secret not configured" });
  }

  try {
    const payload = jwt.verify(token, secret);
    if (payload.type !== "access") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
      approvalStatus: payload.approvalStatus,
      email: payload.email,
      emailVerified: Boolean(payload.emailVerified),
      mfaEnabled: Boolean(payload.mfaEnabled),
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden for this role" });
    }
    return next();
  };
};
