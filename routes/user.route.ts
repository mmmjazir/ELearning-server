import express from "express";
import {
  updateUserPassword,
  acceptResetPasswordOtp,
  activateUser,
  changeUserEmail,
  forgotPassword,
  getUserInfo,
  loginUser,
  logoutUser,
  registrationUser,
  resetPassword,
  socialAuth,
  updateUserEmail,
  updateUserName,
  updateUserAvatar,
  getAllUsers,
  deleteUser,
  updateUserRole,
} from "../controllers/user.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";

const userRouter = express.Router();


userRouter.post("/registration", registrationUser);

userRouter.post("/activate-user", activateUser);

userRouter.post("/login", loginUser);

userRouter.post("/logout", isAuthenticated, logoutUser);

// userRouter.post("/refreshtoken", updateAccessToken);

userRouter.post("/forgot-password", forgotPassword);

userRouter.post("/accept-reset-password-otp", acceptResetPasswordOtp);

userRouter.put("/reset-password", resetPassword);

userRouter.get("/me", isAuthenticated, getUserInfo);

userRouter.post("/social-auth", socialAuth);

userRouter.post("/change-user-email", isAuthenticated, changeUserEmail);

userRouter.put("/update-user-email", isAuthenticated, updateUserEmail);

userRouter.put("/update-user-password", isAuthenticated, updateUserPassword);

userRouter.put("/update-user-name", isAuthenticated, updateUserName);

userRouter.put("/update-user-avatar", isAuthenticated, updateUserAvatar);

userRouter.get(
  "/get-users",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllUsers
);

userRouter.put(
    "/update-user",
    isAuthenticated,
    authorizeRoles("admin"),
    updateUserRole
  );
  
  userRouter.delete(
    "/delete-user/:id",
    isAuthenticated,
    authorizeRoles("admin"),
    deleteUser
  );

export default userRouter;
