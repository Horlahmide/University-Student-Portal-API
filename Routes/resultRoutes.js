import { Router } from "express";
import {
  uploadResults,
  getMyResults,
  getCourseResults,
} from "../Controllers/resultController.js";
import { verifyToken, authorizeRoles } from "../Middleware/jwt.js";

const router = Router();

// All results endpoints require being authenticated
router.use(verifyToken);

// 1. Upload results (Lecturer only)
router.post("/upload", authorizeRoles("lecturer"), uploadResults);

// 2. View my personal results (Student only - impossible for students to edit or see others)
router.get("/my-results", authorizeRoles("student"), getMyResults);

// 3. View class broadsheet for a course (Lecturer only)
router.get("/course-results", authorizeRoles("lecturer"), getCourseResults);

export default router;
