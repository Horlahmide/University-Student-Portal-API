# University Student Portal API

A RESTful backend API for a university student portal. It manages the course catalog, student course registration, and academic results, with role-based access control separating **students** and **lecturers**.

**Tech stack:** Node.js · Express 5 · MongoDB (Mongoose) · JWT · Zod · Helmet · CORS · express-rate-limit

---

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [Response & Error Conventions](#response--error-conventions)
- [Endpoints](#endpoints)
  - [Users](#users)
  - [Courses](#courses)
  - [Results](#results)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [HTTP Status Codes](#http-status-codes)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file (see table below)

# 3. Start the development server
npm run dev
```

The server starts on `http://localhost:5000` (or the configured `PORT`).

### Environment Variables

Create a `.env` file in the project root. It is already ignored by git.

| Variable      | Required | Description                                     | Default |
| ------------- | -------- | ----------------------------------------------- | ------- |
| `MONGO_DB_URI` | Yes      | MongoDB connection string (e.g. MongoDB Atlas) | —       |
| `JWT_SECRET`   | Yes      | Secret used to sign JSON Web Tokens             | —       |
| `PORT`         | No       | HTTP port for the server                        | `5000`  |

---

## Authentication

The API uses **JSON Web Tokens (JWT)**. Tokens are issued on login and expire after **1 day**.

1. Register (or login) and receive a token.
2. Send the token on every protected request:

```
Authorization: Bearer <token>
```

Requests without a valid token return `401`. Requests with a valid token but the wrong role return `403`.

> **Note:** Registration is public and the `role` field is self-declared (`"student"` or `"lecturer"`). In this project this works because anyone can take on either role; in a production deployment you would gate lecturer accounts behind admin approval.

### Response & Error Conventions

Every response uses a consistent envelope:

```json
{
  "success": true
}
```

- **Success** responses include a `data` key (plus `message` where relevant).
- **Validation errors** return a `400` with an `errors` array:

```json
{
  "success": false,
  "errors": [
    { "field": "email", "message": "Please provide a valid email" }
  ]
}
```

- **Duplicate entries** (email, matric number, course code, registrations) return `409`.
- Unhandled failures return `500`. Field names are trimmed/lowercased/uppercased where the schema requires, and duplicate protection is enforced both by validation and by MongoDB unique indexes.

---

## Endpoints

### Users

#### Register a User

Creates a new student or lecturer account.

```
POST /api/users/register
```

_Rate limit: 5 requests per 15 minutes · Public_

**Body:**

| Field        | Type   | Required | Notes                                        |
| ------------ | ------ | -------- | -------------------------------------------- |
| `fullName`   | String | Yes      |                                              |
| `email`      | String | Yes      | Must be a valid email, lowercased            |
| `password`   | String | Yes      | At least 6 characters                        |
| `department` | String | Yes      |                                              |
| `role`       | String | No       | `"student"` (default) or `"lecturer"`        |
| `matricNumber` | String | Only for students | Digits only, max 8 characters     |

**Example request:**

```json
{
  "fullName": "John Adeyemi",
  "email": "john.adeyemi@uni.edu",
  "password": "securepass123",
  "department": "Computer Science",
  "role": "student",
  "matricNumber": "190201001"
}
```

**Response `201 Created`:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "fullName": "John Adeyemi",
    "email": "john.adeyemi@uni.edu",
    "matricNumber": "190201001",
    "department": "Computer Science",
    "role": "student",
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "createdAt": "2026-09-23T10:00:00.000Z",
    "updatedAt": "2026-09-23T10:00:00.000Z"
  }
}
```

**Errors:** `400` validation · `409` email or matric number already registered

---

#### Login

Authenticates and returns a JWT.

```
POST /api/users/login
```

_Rate limit: 10 requests per 15 minutes · Public_

You must provide **exactly one** of `email` or `matricNumber`, plus `password`.

**Example request:**

```json
{
  "email": "john.adeyemi@uni.edu",
  "password": "securepass123"
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "fullName": "John Adeyemi",
    "email": "john.adeyemi@uni.edu",
    "matricNumber": "190201001",
    "department": "Computer Science",
    "role": "student",
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1"
  }
}
```

**Errors:** `400` neither/too many identifiers provided · `401` invalid credentials

---

#### Get My Profile

Returns the profile of the currently authenticated user.

```
GET /api/users/profile
```

_Auth required · scoped to the token holder only_

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "fullName": "John Adeyemi",
    "email": "john.adeyemi@uni.edu",
    "matricNumber": "190201001",
    "department": "Computer Science",
    "role": "student",
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1"
  }
}
```

**Errors:** `401` no/invalid token · `404` user not found

---

#### Update My Profile

Updates permitted fields of the currently authenticated user.

```
PATCH /api/users/profile
```

_Auth required · scoped to the token holder only_

**Body:** At least one of `fullName` or `department`.

**Example request:**

```json
{
  "department": "Software Engineering"
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "data": {
    "fullName": "John Adeyemi",
    "email": "john.adeyemi@uni.edu",
    "matricNumber": "190201001",
    "department": "Software Engineering",
    "role": "student",
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1"
  }
}
```

**Errors:** `400` validation · `404` user not found

---

### Courses

#### List All Courses

Returns the course catalog, sorted by code. Both students and lecturers can view it.

```
GET /api/courses
```

_Auth required · both roles_

**Query parameters (optional):**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| `page`    | Int  | Page number, starting at 1 |
| `limit`   | Int  | Items per page, capped at `100` |

When no pagination parameters are supplied, the full list is returned (backward compatible).

**Response `200 OK` — full list:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d2",
      "code": "CSC301",
      "title": "Data Structures",
      "units": 3,
      "createdAt": "2026-09-23T10:00:00.000Z",
      "updatedAt": "2026-09-23T10:00:00.000Z"
    },
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d3",
      "code": "CSC302",
      "title": "Algorithm Design",
      "units": 3,
      "createdAt": "2026-09-23T10:00:00.000Z",
      "updatedAt": "2026-09-23T10:00:00.000Z"
    }
  ]
}
```

**Response `200 OK` — paginated** (`GET /api/courses?page=1&limit=20`):

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

**Errors:** `400` `page`/`limit` not positive whole numbers

---

#### Create a Course

Adds a course to the catalog.

```
POST /api/courses
```

_Auth required · **lecturers only**_

| Field   | Type   | Required | Notes                                             |
| ------- | ------ | -------- | ------------------------------------------------- |
| `code`  | String | Yes      | Uppercased automatically; e.g. `CSC301`, `GES 101` |
| `title` | String | Yes      | 1–100 characters                                  |
| `units` | Number | Yes      | Whole number, 1–6                                  |

**Example request:**

```json
{
  "code": "CSC301",
  "title": "Data Structures",
  "units": 3
}
```

**Response `201 Created`:**

```json
{
  "success": true,
  "message": "Course created successfully.",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d2",
    "code": "CSC301",
    "title": "Data Structures",
    "units": 3,
    "createdAt": "2026-09-23T10:00:00.000Z",
    "updatedAt": "2026-09-23T10:00:00.000Z"
  }
}
```

**Errors:** `400` validation · `403` not a lecturer · `409` course code already exists (any casing)

---

#### Update a Course

Edits an existing course.

```
PATCH /api/courses/:id
```

_Auth required · **lecturers only**_

**Path:**

| Parameter | Type | Description                    |
| --------- | ---- | ------------------------------ |
| `id`      | 24-char ObjectId | Course ID |

**Body:** At least one of `code`, `title`, or `units`.

**Lock rule:** `code` and `units` **cannot** be changed once any student has registered the course or any result has been uploaded for it (would corrupt historical unit totals). `title` is always editable.

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Course updated successfully.",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d2",
    "code": "CSC301",
    "title": "Data Structures & Algorithms",
    "units": 3,
    "createdAt": "2026-09-23T10:00:00.000Z",
    "updatedAt": "2026-09-23T12:30:00.000Z"
  }
}
```

**Errors:** `400` invalid ID or body · `404` course not found · `409` duplicate code, or locked `code`/`units`

---

#### Delete a Course

Removes a course from the catalog.

```
DELETE /api/courses/:id
```

_Auth required · **lecturers only**_

> Deletion is refused while any student registration or uploaded result references the course, to preserve historical integrity.

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Course deleted successfully."
}
```

**Errors:** `400` invalid ID · `404` course not found · `409` course has registrations/results and cannot be deleted

---

#### Register Courses for a Semester

Registers a student for one or more courses in a specific semester.

```
POST /api/courses/register
```

_Auth required · **students only**_

| Field       | Type   | Required | Notes                          |
| ----------- | ------ | -------- | ------------------------------ |
| `semesterId` | 24-char ObjectId | Yes | Must be an **active** semester |
| `courseIds`  | Array of ObjectId | Yes | ≥ 1 unique course IDs |

**Example request:**

```json
{
  "semesterId": "65f1a2b3c4d5e6f7a8b9c0d8",
  "courseIds": ["65f1a2b3c4d5e6f7a8b9c0d2", "65f1a2b3c4d5e6f7a8b9c0d3"]
}
```

**Response `201 Created`:**

```json
{
  "success": true,
  "message": "Courses registered successfully.",
  "count": 2
}
```

**Errors:** `400` validation, invalid courses, or semester registration closed · `403` not a student · `404` semester not found · `409` course(s) already registered for this semester

---

#### View My Registered Courses

Lists the courses the authenticated student registered in a given semester, with the total unit count.

```
GET /api/courses/my-courses?semesterId=...
```

_Auth required · **students only**_

**Query parameters:**

| Parameter    | Type   | Required | Description        |
| ------------ | ------ | -------- | ------------------ |
| `semesterId` | 24-char ObjectId | Yes | Semester to inspect |

**Response `200 OK`:**

```json
{
  "success": true,
  "semester": "2025/2026 First Semester",
  "totalCourses": 2,
  "totalUnits": 6,
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d2",
      "code": "CSC301",
      "title": "Data Structures",
      "units": 3
    },
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d3",
      "code": "CSC302",
      "title": "Algorithm Design",
      "units": 3
    }
  ]
}
```

**Errors:** `400` missing/invalid `semesterId` · `403` not a student

---

### Results

#### Upload Results

Uploads or updates student grades for a course in a semester. Supports single and batch uploads (upserted per student).

```
POST /api/results/upload
```

_Auth required · **lecturers only**_

| Field       | Type                        | Required | Notes                                  |
| ----------- | --------------------------- | -------- | -------------------------------------- |
| `courseId`  | 24-char ObjectId            | Yes      |                                        |
| `semesterId`| 24-char ObjectId            | Yes      |                                        |
| `results`   | Array of `{ studentId, score }` | Yes   | ≥ 1 unique student records, score 0–100 |

**Example request:**

```json
{
  "courseId": "65f1a2b3c4d5e6f7a8b9c0d2",
  "semesterId": "65f1a2b3c4d5e6f7a8b9c0d8",
  "results": [
    { "studentId": "65f1a2b3c4d5e6f7a8b9c0d1", "score": 82 },
    { "studentId": "65f1a2b3c4d5e6f7a8b9c0d4", "score": 47 }
  ]
}
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Results uploaded successfully.",
  "summary": {
    "inserted": 1,
    "updated": 1,
    "total": 2
  }
}
```

> Every student in `results` must be registered for the course in that semester; otherwise the entire request is rejected and the offending student IDs are returned.

**Errors:** `400` validation, or unregistered students (includes their IDs) · `403` not a lecturer · `404` course or semester not found

---

#### View My Results

Returns the authenticated student's results, optionally filtered by semester.

```
GET /api/results/my-results?semesterId=...
```

_Auth required · **students only**_

**Query parameters (optional):**

| Parameter    | Type   | Description        |
| ------------ | ------ | ------------------ |
| `semesterId` | 24-char ObjectId | Filter by semester |

**Response `200 OK`:**

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d9",
      "student": "65f1a2b3c4d5e6f7a8b9c0d1",
      "course": {
        "_id": "65f1a2b3c4d5e6f7a8b9c0d2",
        "code": "CSC301",
        "title": "Data Structures",
        "units": 3
      },
      "semester": {
        "_id": "65f1a2b3c4d5e6f7a8b9c0d8",
        "name": "2025/2026 First Semester"
      },
      "score": 82,
      "grade": "A",
      "uploadedBy": "65f1a2b3c4d5e6f7a8b9c0d5",
      "createdAt": "2026-09-23T10:00:00.000Z",
      "updatedAt": "2026-09-23T10:00:00.000Z"
    }
  ]
}
```

**Errors:** `400` invalid `semesterId` · `403` not a student

---

#### View Course Result Broadsheet

Returns all results for a course in a semester, sorted by score (highest first).

```
GET /api/results/course-results?courseId=...&semesterId=...
```

_Auth required · **lecturers only**_

**Query parameters:**

| Parameter     | Type   | Required | Description         |
| ------------- | ------ | -------- | ------------------- |
| `courseId`    | 24-char ObjectId | Yes |                    |
| `semesterId`  | 24-char ObjectId | Yes |                    |

**Response `200 OK`:**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d9",
      "student": {
        "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
        "fullName": "John Adeyemi",
        "matricNumber": "190201001",
        "department": "Software Engineering"
      },
      "course": {
        "_id": "65f1a2b3c4d5e6f7a8b9c0d2",
        "code": "CSC301",
        "title": "Data Structures",
        "units": 3
      },
      "semester": {
        "_id": "65f1a2b3c4d5e6f7a8b9c0d8",
        "name": "2025/2026 First Semester"
      },
      "score": 82,
      "grade": "A",
      "uploadedBy": "65f1a2b3c4d5e6f7a8b9c0d5"
    },
    {
      "_id": "65f1a2b3c4d5e6f7a8b9c0dA",
      "student": {
        "_id": "65f1a2b3c4d5e6f7a8b9c0d4",
        "fullName": "Mary Okafor",
        "matricNumber": "190201012",
        "department": "Software Engineering"
      },
      "course": {
        "_id": "65f1a2b3c4d5e6f7a8b9c0d2",
        "code": "CSC301",
        "title": "Data Structures",
        "units": 3
      },
      "semester": {
        "_id": "65f1a2b3c4d5e6f7a8b9c0d8",
        "name": "2025/2026 First Semester"
      },
      "score": 47,
      "grade": "D",
      "uploadedBy": "65f1a2b3c4d5e6f7a8b9c0d5"
    }
  ]
}
```

**Errors:** `400` missing or invalid `courseId`/`semesterId` · `403` not a lecturer

---

## Data Models

### User

| Field         | Type   | Constraints                                    |
| ------------- | ------ | ---------------------------------------------- |
| `fullName`    | String | Required                                       |
| `email`       | String | Required, unique, lowercased, valid email      |
| `matricNumber`| String | Unique; required for students only (digits, ≤ 8) |
| `password`    | String | Required, hashed with bcrypt                   |
| `role`        | String | `"student"` \| `"lecturer"`, default `"student"` |
| `department`  | String | Required                                       |

### Course

| Field   | Type   | Constraints                                   |
| ------- | ------ | --------------------------------------------- |
| `code`  | String | Required, unique, uppercased                  |
| `title` | String | Required                                      |
| `units` | Number | Required, 1–6                                 |

### Semester

| Field      | Type    | Constraints                 |
| ---------- | ------- | --------------------------- |
| `name`     | String  | Required, unique            |
| `isActive` | Boolean | Default `false`             |
| `startDate`| Date    | Required                    |
| `endDate`  | Date    | Required                    |

### CourseRegistration

| Field     | Type     | Constraints                       |
| --------- | -------- | --------------------------------- |
| `student` | ObjectId → User   | Required |
| `course`  | ObjectId → Course | Required |
| `semester`| ObjectId → Semester | Required |

Unique compound index `{ student, course, semester }` prevents duplicate registration of the same course in the same semester.

### Result

| Field       | Type     | Constraints                       |
| ----------- | -------- | --------------------------------- |
| `student`   | ObjectId → User   | Required |
| `course`    | ObjectId → Course | Required |
| `semester`  | ObjectId → Semester | Required |
| `score`     | Number   | Required, 0–100                   |
| `grade`     | String   | `A`–`F`                           |
| `uploadedBy`| ObjectId → User   | Required (the lecturer) |

Unique compound index `{ student, course, semester }` ensures a student has at most one grade per course per semester.

---

## Business Rules

- **Grade scale** (derived from score): 70+ = `A`, 60–69 = `B`, 50–59 = `C`, 45–49 = `D`, 40–44 = `E`, below 40 = `F`.
- **Course registration** is only permitted for **active** semesters (`isActive: true`).
- Every student in a result upload **must** be registered for that course and semester, verifying referential integrity before grades are saved.
- **Course edit/delete guards:** `code` and `units` cannot be changed, and a course cannot be deleted, once any registration or result references it.
- **Scope isolation:** students can only ever see/update their own profile, registrations, and results (`req.user.id` from the verified token). JWT roles gate lecturer-only actions.

---

## HTTP Status Codes

| Code | Meaning |
| ---- | ------- |
| `200` | Success (read/update/delete, result upload) |
| `201` | Created (user registration, course creation, course registration) |
| `400` | Validation failure, invalid ID format, closed semester, unregistered students |
| `401` | Missing, invalid, or expired token; invalid login credentials |
| `403` | Authenticated but forbidden by role |
| `404` | Resource not found |
| `409` | Duplicate (email, matric number, course code, registration) or protected change/delete |
| `500` | Internal server error |