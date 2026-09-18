import mongoose from "mongoose";

const courseRegistrationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: true,
    },
  },
  { timestamps: true },
);

// Enforce rule: A student cannot register the same course twice in the same semester
courseRegistrationSchema.index(
  { student: 1, course: 1, semester: 1 },
  { unique: true },
);

const CourseRegistration = mongoose.model(
  "CourseRegistration",
  courseRegistrationSchema,
);
export default CourseRegistration;
