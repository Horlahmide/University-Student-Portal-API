import User from "../Models/userModel.js";
import { updateProfileSchema } from "../lib/validations.js";

// 1. Get logged-in user's profile
export const getProfile = async (req, res) => {
  try {
    // req.user.id comes directly from the verified JWT token (impossible to view another user's profile)
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve profile. Please try again later.",
    });
  }
};

// 2. Update logged-in user's profile (permitted fields only)
export const updateProfile = async (req, res) => {
  // Validate request body against updateProfileSchema
  const result = updateProfileSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  const { fullName, department } = result.data;

  try {
    // Only update the logged-in user's own profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(fullName && { fullName }),
        ...(department && { department }),
      },
      { new: true, runValidators: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Failed to update profile:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update profile. Please try again later.",
    });
  }
};
