import bcrypt from "bcrypt";
import User from "../Models/userModel.js";
import { createUserSchema, loginSchema } from "../lib/validations.js";
import { signToken } from "../Middleware/jwt.js";

// Logic for Onboarding or Registering students or lecturers to our system
export const registerUser = async (req, res) => {
  const result = createUserSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  const { fullName, email, password, department, role, matricNumber } =
    result.data;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered. Please use a different email.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      department,
      role,
      matricNumber,
    });

    const { password: _password, ...safeUser } = user.toObject();

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: safeUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicatedField = Object.keys(error.keyPattern ?? {})[0];
      const message =
        duplicatedField === "matricNumber"
          ? "Matric number is already registered"
          : "Email is already registered. Please use a different email.";

      return res.status(409).json({ success: false, message });
    }

    console.error("User registration failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// Logic to login students or lecturers
export const loginUser = async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  const { email, matricNumber, password } = result.data;

  try {
    // Build query based on whichever identifier was provided
    const query = email ? { email } : { matricNumber };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const token = signToken(user);
    const { password: _password, ...safeUser } = user.toObject();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: safeUser,
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};
