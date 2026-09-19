import mongoose from "mongoose";
import Course from "../Models/courseModel.js";
import Semester from "../Models/semesterModel.js";
import CourseRegistration from "../Models/courseRegistrationModel.js";
import { courseRegistrationSchema } from "../lib/validations.js";

// 1. Get all available courses in the catalog
export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ code: 1 });
    return res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("Failed to fetch courses:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load courses. Please try again later.",
    });
  }
};

// 2. Register courses for a semester
export const registerCourses = async (req, res) => {
  // Validate request body
  const result = courseRegistrationSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  const { semesterId, courseIds } = result.data;
  const studentId = req.user.id;

  try {
    // 1. Check if the semester exists and is active
    const semester = await Semester.findById(semesterId);
    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Semester not found.",
      });
    }

    if (!semester.isActive) {
      return res.status(400).json({
        success: false,
        message: "Course registration is closed for this semester.",
      });
    }

    // 2. Verify all submitted courses exist in the system
    const validCourses = await Course.find({ _id: { $in: courseIds } });
    if (validCourses.length !== courseIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more selected courses are invalid or do not exist.",
      });
    }

    // 3. Check if any of these courses are already registered by the student in this semester
    const alreadyRegistered = await CourseRegistration.find({
      student: studentId,
      semester: semesterId,
      course: { $in: courseIds },
    }).populate("course", "code title");

    if (alreadyRegistered.length > 0) {
      const alreadyRegisteredCodes = alreadyRegistered
        .map((reg) => reg.course.code)
        .join(", ");
      return res.status(409).json({
        success: false,
        message: `You have already registered the following course(s) for this semester: ${alreadyRegisteredCodes}`,
      });
    }

    // 4. Prepare registration records
    const registrationDocs = courseIds.map((courseId) => ({
      student: studentId,
      course: courseId,
      semester: semesterId,
    }));

    // 5. Batch insert the course registrations (high performance)
    const savedRegistrations = await CourseRegistration.insertMany(
      registrationDocs,
      { ordered: false },
    );

    return res.status(201).json({
      success: true,
      message: "Courses registered successfully.",
      count: savedRegistrations.length,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate registration detected. One or more courses are already registered.",
      });
    }

    console.error("Course registration error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong during course registration. Please try again.",
    });
  }
};

// 3. View registered courses for a particular semester
export const getMyRegisteredCourses = async (req, res) => {
  const { semesterId } = req.query;

  if (!semesterId || !mongoose.Types.ObjectId.isValid(semesterId)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid semesterId query parameter.",
    });
  }

  try {
    const registrations = await CourseRegistration.find({
      student: req.user.id,
      semester: semesterId,
    })
      .populate("course", "code title units")
      .populate("semester", "name");

    const totalUnits = registrations.reduce(
      (sum, reg) => sum + (reg.course?.units || 0),
      0,
    );

    return res.status(200).json({
      success: true,
      semester: registrations[0]?.semester?.name || null,
      totalCourses: registrations.length,
      totalUnits,
      data: registrations.map((r) => r.course),
    });
  } catch (error) {
    console.error("Failed to load registered courses:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch registered courses.",
    });
  }
};
