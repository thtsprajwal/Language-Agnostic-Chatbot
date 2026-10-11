import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectToDatabase from "./database/mongodb.js";
import authRouter from "./routes/auth.js";
import protectedRouter from "./routes/protected.js";
import { authenticateJWT, authorizeRoles } from "./middleware/authMiddleware.js";

dotenv.config();

const PORT = process.env.PORT || 5500;
const app = express();

const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = (process.env.CORS_ORIGIN || frontendOrigin)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const validateEnvironment = () => {
  const requiredVars = ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET", "DB_URI"];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length) {
    console.warn(`Missing environment variables for production auth: ${missing.join(", ")}`);
  }
};

validateEnvironment();

app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...allowedOrigins],
      },
    },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});

app.use("/api/auth", authRateLimiter);
app.use("/api/auth", authRouter);

app.use("/api/student", authenticateJWT, authorizeRoles("student"), protectedRouter);
app.use("/api/faculty", authenticateJWT, authorizeRoles("faculty"), protectedRouter);
app.use("/api/admin", authenticateJWT, authorizeRoles("admin"), protectedRouter);

app.listen(PORT, async () => {
  console.log(`Chat API running on http://localhost:${PORT}`);
  await connectToDatabase();
});

export default app;
