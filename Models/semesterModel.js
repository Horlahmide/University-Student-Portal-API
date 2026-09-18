import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [
        true,
        "Semester name is required (e.g., 2025/2026 First Semester)",
      ],
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

const Semester = mongoose.model("Semester", semesterSchema);
export default Semester;
