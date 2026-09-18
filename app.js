import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { connectDB } from "./Config/db.js";
import userRoutes from "./Routes/userRoutes.js";
import courseRoutes from "./Routes/courseRoutes.js";
import resultRoutes from "./Routes/resultRoutes.js";

const app = express();

// middleware fro incoming request
app.use(express.json());

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
