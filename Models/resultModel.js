import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
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
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      required: true,
      enum: ["A", "B", "C", "D", "E", "F"],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Tracks which lecturer/admin uploaded the result
    },
  },
  { timestamps: true },
);

// Ensure a student only has one result per course per semester
resultSchema.index({ student: 1, course: 1, semester: 1 }, { unique: true });

const Result = mongoose.model("Result", resultSchema);
export default Result;
