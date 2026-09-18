import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_DB_URI;

  if (!uri) {
    throw new Error("MONGO_DB_URI is not defined in the .env file");
  }

  // Prevent duplicate listener attachments if connectDB is called multiple times
  if (mongoose.connection.readyState === 0) {
    mongoose.connection.on("connected", () => {
      console.log("MongoDB connected successfully");
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
    });
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Fail fast if DB is down
      maxPoolSize: 500, // Increased to handle high concurrent traffic spikes (adjust based on your Atlas tier)
      minPoolSize: 20, // Keeps a baseline pool warm for instant response
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed due to app termination");
      process.exit(0);
    });

    return conn.connection;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
};
