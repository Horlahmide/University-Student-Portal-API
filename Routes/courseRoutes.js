import { Router } from "express";
import {
  getAllCourses,
  registerCourses,
  getMyRegisteredCourses,
} from "../Controllers/courseRegistration.js";
import {
  createCourse,
  updateCourse,
  deleteCourse,
} from "../Controllers/courseController.js";
import { verifyToken, authorizeRoles } from "../Middleware/jwt.js";

const router = Router();

// All course endpoints require being authenticated
router.use(verifyToken);

// GET /api/courses - List courses to choose from (both students and lecturers can view)
router.get("/", getAllCourses);

// POST/PATCH/DELETE /api/courses - Manage the course catalog (lecturers only)
router.post("/", authorizeRoles("lecturer"), createCourse);
router.patch("/:id", authorizeRoles("lecturer"), updateCourse);
router.delete("/:id", authorizeRoles("lecturer"), deleteCourse);

// POST /api/courses/register - Register selected courses for a semester (students only)
router.post("/register", authorizeRoles("student"), registerCourses);

// GET /api/courses/my-courses?semesterId=... - View registered courses for a semester (students only)
router.get("/my-courses", authorizeRoles("student"), getMyRegisteredCourses);

export default router;
