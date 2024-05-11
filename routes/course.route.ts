import express from "express";
import { isAuthenticated, authorizeRoles } from "../middleware/auth";
import { addAnswer, addQuestion, addReplyToReview, addReview, deleteCourse, editCourse, generateVideoUrl, getAdminAllCourses, getAdminCourseById, getAllCourses, getCourseByUser, getSingleCourse, uploadCourse } from "../controllers/course.controller";
const courseRouter = express.Router();

courseRouter.post(
  "/create-course",
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourse
);

courseRouter.put(
  "/edit-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  editCourse
);

courseRouter.get(
  "/get-course/:id",
  getSingleCourse
);

courseRouter.get(
  "/get-courses",
  getAllCourses
);

courseRouter.get(
  "/get-admin-courses",
  isAuthenticated,
  authorizeRoles("admin"),
  getAdminAllCourses
);

courseRouter.get(
  "/get-admin-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  getAdminCourseById
);

courseRouter.get(
  "/get-course-content/:id",
  isAuthenticated,
  getCourseByUser
);

courseRouter.put(
  "/add-question",
  isAuthenticated,
  addQuestion
);

courseRouter.put(
  "/add-answer",
  isAuthenticated,
  addAnswer
);

courseRouter.put(
  "/add-review/:id",
  isAuthenticated,
  addReview
);

courseRouter.put(
  "/add-reply",
  isAuthenticated,
  authorizeRoles("admin"),
  addReplyToReview
);

courseRouter.delete(
  "/delete-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  deleteCourse
);

courseRouter.post("/getVdoCipherOTP", generateVideoUrl)

export default courseRouter;
