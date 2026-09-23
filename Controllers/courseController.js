import mongoose from "mongoose";
import Course from "../Models/courseModel.js";
import CourseRegistration from "../Models/courseRegistrationModel.js";
import Result from "../Models/resultModel.js";
import { courseSchema, updateCourseSchema } from "../lib/validations.js";

// Creates a new course in the catalog (Lecturers only)
export const createCourse = async (req, res) => {
  const validation = courseSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      errors: validation.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const course = await Course.create(validation.data);

    return res.status(201).json({
      success: true,
      message: "Course created successfully.",
      data: course,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: `Course code ${validation.data.code} already exists.`,
      });
    }

    console.error("Failed to create course:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create course. Please try again later.",
    });
  }
};

// Updates an existing course (Lecturers only)
export const updateCourse = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid course ID format.",
    });
  }

  const validation = updateCourseSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      errors: validation.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  const updates = validation.data;

  try {
    // Prevent editing code/units once a course has registrations or results,
    // otherwise historical unit totals and references silently drift.
    if (updates.code !== undefined || updates.units !== undefined) {
      const [hasRegistrations, hasResults] = await Promise.all([
        CourseRegistration.exists({ course: id }),
        Result.exists({ course: id }),
      ]);

      if (hasRegistrations || hasResults) {
        return res.status(409).json({
          success: false,
          message:
            "Code and units cannot be changed once students have registered or results have been uploaded for this course.",
        });
      }
    }

    const course = await Course.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      data: course,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Course code already exists.",
      });
    }

    console.error("Failed to update course:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update course. Please try again later.",
    });
  }
};

// Deletes a course from the catalog (Lecturers only)
export const deleteCourse = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid course ID format.",
    });
  }

  try {
    // Block deletion while any student registration or result references it
    const [hasRegistrations, hasResults] = await Promise.all([
      CourseRegistration.exists({ course: id }),
      Result.exists({ course: id }),
    ]);

    if (hasRegistrations || hasResults) {
      return res.status(409).json({
        success: false,
        message:
          "This course cannot be deleted because students have registered it or results have been uploaded for it.",
      });
    }

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete course:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to delete course. Please try again later.",
    });
  }
};