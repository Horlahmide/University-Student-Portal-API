import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Course code is required (e.g., CSC301)"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    units: {
      type: Number,
      required: [true, "Course unit is required"],
      min: 1,
      max: 6,
    },
  },
  { timestamps: true },
);

const Course = mongoose.model("Course", courseSchema);
export default Course;
