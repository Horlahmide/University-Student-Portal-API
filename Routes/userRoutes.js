import { Router } from "express";
import { registerUser, loginUser } from "../Controllers/userController.js";
import { getProfile, updateProfile } from "../Controllers/profileView.js";
import { verifyToken } from "../Middleware/jwt.js";

const router = Router();

// Public auth routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected user profile routes (strictly scoped to the logged-in user's own token)
router.get("/profile", verifyToken, getProfile);
router.patch("/profile", verifyToken, updateProfile);

export default router;