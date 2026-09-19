import dotenv from "dotenv";
dotenv.config();

import express from "express";
import helmet from "helmet";
import cors from "cors";

import { connectDB } from "./Config/db.js";
import { loginLimiter, registerLimiter } from "./Middleware/rateLimiter.js";
import userRoutes from "./Routes/userRoutes.js";
import courseRoutes from "./Routes/courseRoutes.js";
import resultRoutes from "./Routes/resultRoutes.js";

const app = express();

// 1. Security headers & CORS
app.use(helmet());
app.use(cors());

// 2. Rate limiting on auth endpoints
app.use("/api/users/login", loginLimiter);
app.use("/api/users/register", registerLimiter);

// 3. Body parser
app.use(express.json());

// 4. Routes
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/results", resultRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
