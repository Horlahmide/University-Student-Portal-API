import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please provide a valid email");

const matricNumberSchema = z
  .string()
  .trim()
  .min(1, "Matric number is required")
  .regex(/^\d+$/, "Matric number must contain only digits")
  .max(8, "Matric number must not be greater than 8 digits");

const signupPasswordSchema = z
  .string()
  .trim()
  .min(6, "Password must be at least 6 characters long");

const loginPasswordSchema = z
  .string()
  .min(1, "Password is required");

const sharedUserFields = {
  fullName: z.string().trim().min(1, "Full name is required"),
  email: emailSchema,
  password: signupPasswordSchema,
  department: z.string().trim().min(1, "Department is required"),
};

const createUserSchema = z.pipe(
  z.transform((data) =>
    data && typeof data === "object" && data.role === undefined
      ? { ...data, role: "student" }
      : data,
  ),
  z.discriminatedUnion("role", [
    z
      .object({
        role: z.literal("student"),
        ...sharedUserFields,
        matricNumber: matricNumberSchema.optional(),
      })
      .strict()
      .refine((data) => data.matricNumber !== undefined, {
        message: "Matric number is required",
        path: ["matricNumber"],
      }),
    z
      .object({
        role: z.literal("lecturer"),
        ...sharedUserFields,
      })
      .strict(),
  ]),
);

const loginFields = {
  email: emailSchema.optional(),
  matricNumber: matricNumberSchema.optional(),
  password: loginPasswordSchema,
};

const loginSchema = z
  .object(loginFields)
  .strict()
  .superRefine((data, ctx) => {
    if (!data.email && !data.matricNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Provide either an email or matric number",
      });
    }
    if (data.email && data.matricNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["matricNumber"],
        message: "Provide only one of email or matric number",
      });
    }
  });

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

const courseSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z]{2,4}[- ]?\d{1,4}[A-Z]?$/,
        "Course code format is invalid (e.g., CSC301, GES 101)",
      ),
    title: z.string().trim().min(1, "Course title is required").max(100),
    units: z
      .number({ invalid_type_error: "Units must be a number" })
      .int("Units must be a whole number")
      .min(1, "Units cannot be less than 1")
      .max(6, "Units cannot be greater than 6"),
  })
  .strict();

const updateCourseSchema = courseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Please provide at least one field to update",
  });

const courseRegistrationSchema = z.object({
  semesterId: objectIdSchema,
  courseIds: z
    .array(objectIdSchema)
    .min(1, "Please select at least one course")
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Duplicate courses cannot be submitted in the same registration",
    }),
});

const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name cannot be empty").optional(),
    department: z
      .string()
      .trim()
      .min(1, "Department cannot be empty")
      .optional(),
  })
  .strict("You can only update permitted fields (fullName, department)")
  .refine(
    (data) => data.fullName !== undefined || data.department !== undefined,
    {
      message:
        "Please provide at least one field to update (fullName or department)",
    },
  );

const studentResultItemSchema = z.object({
  studentId: objectIdSchema,
  score: z
    .number({ invalid_type_error: "Score must be a number" })
    .min(0, "Score cannot be less than 0")
    .max(100, "Score cannot be greater than 100"),
});

const uploadResultsSchema = z.object({
  courseId: objectIdSchema,
  semesterId: objectIdSchema,
  results: z
    .array(studentResultItemSchema)
    .min(1, "Please provide at least one student result")
    .refine(
      (items) => {
        const studentIds = items.map((i) => i.studentId);
        return new Set(studentIds).size === studentIds.length;
      },
      { message: "Duplicate student records found in the results array" },
    ),
});

export {
  createUserSchema,
  loginSchema,
  courseSchema,
  updateCourseSchema,
  courseRegistrationSchema,
  updateProfileSchema,
  uploadResultsSchema,
};