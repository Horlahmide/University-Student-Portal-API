import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      require: true,
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    matricNumber: {
      type: String,
      required: [
        function () {
          return this.role === "student";
        },
        "A matric number is required for students",
      ],
      sparse: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [6, "Password must be at least 6 characters long"],
      trim: true,
    },

    role: {
      type: String,
      enum: ["student", "lecturer"],
      required: true,
      default: "student",
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);
export default User;
