import mongoose from "mongoose";
import Result from "../Models/resultModel.js";
import Course from "../Models/courseModel.js";
import Semester from "../Models/semesterModel.js";
import { uploadResultsSchema } from "../lib/validations.js";
import CourseRegistration from "../Models/courseRegistrationModel.js";

// Helper function to calculate letter grade from score
const calculateGrade = (score) => {
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
};

// 1. Upload results (Lecturers only - supports single & batch)
export const uploadResults = async (req, res) => {
  const validation = uploadResultsSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      errors: validation.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  const { courseId, semesterId, results } = validation.data;
  const lecturerId = req.user.id;

  try {
    // 1. Verify course and semester exist
    const [courseExists, semesterExists] = await Promise.all([
      Course.findById(courseId),
      Semester.findById(semesterId),
    ]);

    if (!courseExists) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    if (!semesterExists) {
      return res.status(404).json({
        success: false,
        message: "Semester not found.",
      });
    }

    // 2. Verify that all submitted students are actually registered for this course & semester
    const studentIds = results.map((r) => r.studentId);
    const registeredRecords = await CourseRegistration.find({
      course: courseId,
      semester: semesterId,
      student: { $in: studentIds },
    });

    const registeredStudentIds = registeredRecords.map((r) =>
      r.student.toString(),
    );
    const unregisteredStudentIds = studentIds.filter(
      (id) => !registeredStudentIds.includes(id),
    );

    if (unregisteredStudentIds.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Some students are not registered for this course in this semester.",
        unregisteredStudents: unregisteredStudentIds,
      });
    }

    // 3. Prepare bulkWrite operations (Upsert: inserts if new, updates if already exists)
    const operations = results.map((item) => ({
      updateOne: {
        filter: {
          student: item.studentId,
          course: courseId,
          semester: semesterId,
        },
        update: {
          $set: {
            score: item.score,
            grade: calculateGrade(item.score),
            uploadedBy: lecturerId,
          },
        },
        upsert: true,
      },
    }));

    // 4. Execute all writes in a single high-performance database batch
    const bulkResult = await Result.bulkWrite(operations);

    return res.status(200).json({
      success: true,
      message: "Results uploaded successfully.",
      summary: {
        inserted: bulkResult.upsertedCount,
        updated: bulkResult.modifiedCount,
        total: results.length,
      },
    });
  } catch (error) {
    console.error("Failed to upload results:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to upload results. Please try again later.",
    });
  }
};

// 2. View my results (Students only - strictly scoped to req.user.id)
export const getMyResults = async (req, res) => {
  const { semesterId } = req.query;

  if (semesterId && !mongoose.Types.ObjectId.isValid(semesterId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid semesterId format.",
    });
  }

  const query = { student: req.user.id };
  if (semesterId) {
    query.semester = semesterId;
  }

  try {
    const results = await Result.find(query)
      .populate("course", "code title units")
      .populate("semester", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Failed to fetch student results:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load results. Please try again later.",
    });
  }
};

// 3. View course result broadsheet (Lecturers only)
export const getCourseResults = async (req, res) => {
  const { courseId, semesterId } = req.query;

  if (!courseId || !semesterId) {
    return res.status(400).json({
      success: false,
      message:
        "Please provide both courseId and semesterId in query parameters.",
    });
  }

  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(semesterId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid courseId or semesterId format.",
    });
  }

  try {
    const results = await Result.find({
      course: courseId,
      semester: semesterId,
    })
      .populate("student", "fullName matricNumber department")
      .populate("course", "code title units")
      .populate("semester", "name")
      .sort({ score: -1 });

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Failed to fetch course results:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load course results. Please try again later.",
    });
  }
};
