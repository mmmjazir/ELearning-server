require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";

import sendMail from "../utils/sendMail";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import {
  getAllUsersService,
  getUserById,
  updateUserRoleService,
} from "../services/user.service";

// register user
interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password } = req.body;

    const isEmailExist = await userModel.findOne({ email });
    if (!name || !email || !password) {
      return next(new ErrorHandler("Please enter all fields", 400));
    }
    if (isEmailExist) {
      return next(new ErrorHandler("Email already exist", 400));
    }
    if (!validator.isEmail(email)) {
      return next(new ErrorHandler("Enter a valid email address", 400));
    }
    if (!validator.isStrongPassword(password)) {
      return next(
        new ErrorHandler(
          "Weak password. Please choose a stronger password!",
          400
        )
      );
    }

    const user: IRegistrationBody = {
      name,
      email,
      password,
    };

    const activationToken = createActivationToken(user);

    const activationCode = activationToken.activationCode;

    const data = { user: { name: user.name }, activationCode };

    try {
      await sendMail({
        email: user.email,
        subject: "Activate your account",
        template: "activation-mail.ejs",
        data,
      });

      res.status(201).json({
        success: true,
        message: `Please check your email: ${user.email} to activate your account`,
        activationToken: activationToken.token,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: "5m" }
  );

  return { token, activationCode };
};

// activate user
interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { activation_token, activation_code } =
      req.body as IActivationRequest;

    if (!activation_code) {
      return next(new ErrorHandler("Enter your activation code", 400));
    }

    const newUser: { user: IUser; activationCode: string } = jwt.verify(
      activation_token,
      process.env.ACTIVATION_SECRET as Secret
    ) as { user: IUser; activationCode: string };

    if (newUser.activationCode !== activation_code) {
      return next(new ErrorHandler("Invalid activation code", 400));
    }

    const { name, email, password } = newUser.user;

    const existUser = await userModel.findOne({ email });

    if (existUser) {
      return next(new ErrorHandler("Email already exist", 400));
    }

    const user = await userModel.create({
      name,
      email,
      password,
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: "Account created successfully",
    });
  }
);

// Login user
interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      if (!email || !password) {
        return next(new ErrorHandler("Please enter email and password", 400));
      }

      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("Invalid email or password", 400));
      }

      const isPasswordMatch = await user.comparePassword(password);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid email or password", 400));
      }

      // user without password
      // const userWithoutPassword = await userModel.findOne({ email });

      // if (!userWithoutPassword) {
      //   return next(new ErrorHandler("Invalid email or password", 400));
      // }
      req.user = user;
      return sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// logout user
export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });

      // const userId = req.user?._id || "";
      // await redis.del(userId);
      // delete req.user 

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const forgotPassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email) {
        return next(new ErrorHandler("Please enter you email!", 400));
      }
      if (!validator.isEmail(email)) {
        return next(new ErrorHandler("Enter a valid email address", 400));
      }

      const isEmailExist = await userModel.findOne({ email });

      if (!isEmailExist) {
        return next(new ErrorHandler("User not found, invalid request", 400));
      }

      const name = isEmailExist.name;

      const ResetPasswordToken = createResetPasswordToken(email);

      const ResetPasswordOtp = ResetPasswordToken.forgotPasswordOtp;

      const data = { user: name, ResetPasswordOtp };

      try {
        await sendMail({
          email,
          subject: "Reset your password ",
          template: "resetpassword-mail.ejs",
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check your email: ${email} to reset your password`,
          ResetPasswordToken: ResetPasswordToken.forgotPasswordToken,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface ICreateResetPasswordToken {
  forgotPasswordToken: string;
  forgotPasswordOtp: string;
}

export const createResetPasswordToken = (
  email: string
): ICreateResetPasswordToken => {
  const forgotPasswordOtp = Math.floor(1000 + Math.random() * 9000).toString();

  const forgotPasswordToken = jwt.sign(
    { email, forgotPasswordOtp },
    process.env.FORGOT_PASSWORD_SECRET as Secret,
    { expiresIn: "5m" }
  );

  return { forgotPasswordToken, forgotPasswordOtp };
};

interface IAcceptResetPasswordOtp {
  resetPassword_Token: string;
  resetPassword_Otp: string;
}

export const acceptResetPasswordOtp = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { resetPassword_Token, resetPassword_Otp } =
      req.body as IAcceptResetPasswordOtp;

    if (!resetPassword_Otp) {
      return next(
        new ErrorHandler("Enter the code from your email to verify", 400)
      );
    }

    const OtpCheck: { email: string; forgotPasswordOtp: string } = jwt.verify(
      resetPassword_Token,
      process.env.FORGOT_PASSWORD_SECRET as Secret
    ) as { email: string; forgotPasswordOtp: string };

    if (OtpCheck.forgotPasswordOtp !== resetPassword_Otp) {
      return next(new ErrorHandler("Invalid verification code", 400));
    }

    const ResetToken = jwt.sign(
      { email: OtpCheck.email },
      process.env.RESET_PASSWORD_SECRET as Secret,
      { expiresIn: "5m" }
    );

    res.status(201).json({
      success: true,
      ResetToken,
    });
  }
);

interface IResetPasswordBody {
  newPassword: string;
  confirmPassword: string;
  resetPassword_token: string;
}

export const resetPassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { newPassword, confirmPassword, resetPassword_token } =
      req.body as IResetPasswordBody;

    if (!newPassword || !confirmPassword) {
      return next(new ErrorHandler("Please enter all fields to continue", 400));
    }

    if (newPassword !== confirmPassword) {
      return next(new ErrorHandler("Passwords does not match", 400));
    }
    if (!validator.isStrongPassword(newPassword)) {
      return next(
        new ErrorHandler(
          "Weak password. Please choose a stronger password!",
          400
        )
      );
    }
    let logoutUser = false;
    try {
      const { email } = jwt.verify(
        resetPassword_token,
        process.env.RESET_PASSWORD_SECRET as Secret
      ) as { email: string };

      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      const isSamePassword = await user.comparePassword(newPassword);

      if (isSamePassword) {
        return next(
          new ErrorHandler(
            "New password must be different from the old password",
            400
          )
        );
      }

      user.password = newPassword;
      await user.save();

      if (req.user?._id === user._id) {
        res.cookie("access_token", "", { maxAge: 1 });
        res.cookie("refresh_token", "", { maxAge: 1 });
        logoutUser = true;
      }

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
        logoutUser,
      });
    } catch (error) {
      return next(new ErrorHandler("Invalid or expired token", 400));
    }
  }
);

// update access token
// export const updateAccessToken = CatchAsyncError(
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const refresh_token = req.cookies.refresh_token as string;
//       if (!refresh_token) {
//         return next(
//           new ErrorHandler("Please login to access this resource", 400)
//         );
//       }
//       const decoded = jwt.verify(
//         refresh_token,
//         process.env.REFRESH_TOKEN as Secret
//       ) as JwtPayload;

//       const user = await userModel.findById(decoded.id);
//       if (!user) {
//         return next(new ErrorHandler("User not found!", 400));
//       }
//       const accessToken = jwt.sign(
//         { id: user._id },
//         process.env.ACCESS_TOKEN as Secret,
//         {
//           expiresIn: "5m",
//         }
//       );

//       const refreshToken = jwt.sign(
//         { id: user._id },
//         process.env.REFRESH_TOKEN as Secret,
//         {
//           expiresIn: "3d",
//         }
//       );

//       res.cookie("access_token", accessToken, accessTokenOptions);
//       res.cookie("refresh_token", refreshToken, refreshTokenOptions);
     
//        next();
     
//     } catch (error: any) {
//       return next(new ErrorHandler(error.message, 400));
//     }
//   }
// );

// get user info
export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      getUserById(userId, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface ISocialAuthBody {
  email: string;
  name: string;
  avatar: string;
}

// social auth
export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthBody;
      const user = await userModel.findOne({ email });

      if (!user) {
        const newUser = await userModel.create({ email, name, avatar });
        req.user = newUser;
       return sendToken(newUser, 200, res);
      } 
       req.user = user;
       sendToken(user, 200, res);
      
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const changeUserEmail = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { newEmail } = req.body;
      const userEmail = req.user?.email;
     
      const isEmailExist = await userModel.findOne({ newEmail });
      if (!newEmail) {
        return next(new ErrorHandler("Please enter your new email", 400));
      }
      if (!validator.isEmail(newEmail)) {
        return next(new ErrorHandler("Enter a valid email address", 400));
      }
      if (newEmail === userEmail) {
        return next(
          new ErrorHandler(
            "You are already connected with this email id, try a different one!",
            400
          )
        );
      }

      if (isEmailExist) {
        return next(new ErrorHandler("Email already been used!", 400));
      }

      const updateEmail = createUpdateEmailToken(newEmail);
      const updateEmailOtp = updateEmail.updateEmailOtp;

      const data = { updateEmailOtp };

      try {
        await sendMail({
          email: newEmail,
          subject: "Verify your email ",
          template: "updateEmail-mail.ejs",
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check your email: ${newEmail} to verify`,
          updateEmailToken: updateEmail.updateEmailToken,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// send new email token to update the user's email
interface ICreateUpdateEmailToken {
  updateEmailToken: string;
  updateEmailOtp: string;
}

export const createUpdateEmailToken = (
  email: string
): ICreateUpdateEmailToken => {
  const updateEmailOtp = Math.floor(1000 + Math.random() * 9000).toString();

  const updateEmailToken = jwt.sign(
    { email, updateEmailOtp },
    process.env.UPDATE_EMAIL_SECRET as Secret,
    { expiresIn: "5m" }
  );

  return { updateEmailToken, updateEmailOtp };
};

// Accept new email otp and change the current email to new email
interface IUpdateUserEmail {
  updateEmail_Otp: string;
  updateEmail_Token: string;
  currentEmail: string;
  newEmail: string;
  password: string;
}

export const updateUserEmail = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      updateEmail_Otp,
      updateEmail_Token,
      currentEmail,
      newEmail,
      password,
    } = req.body as IUpdateUserEmail;
    
    const userId = req.user?._id;

    if (!updateEmail_Otp || !currentEmail || !newEmail || !password) {
      return next(new ErrorHandler("Enter all the fields", 400));
    }

    const user = await userModel.findById(userId).select("+password");

    if (!user) {
      return next(new ErrorHandler("User not found", 400));
    }

    try {
      const updateEmail: { email: string; updateEmailOtp: string } = jwt.verify(
        updateEmail_Token,
        process.env.UPDATE_EMAIL_SECRET as Secret
      ) as { email: string; updateEmailOtp: string };

      if (updateEmail.email !== newEmail) {
        return next(
          new ErrorHandler(
            "Invalid request. Please verify the new email and try again!",
            400
          )
        );
      }

      if (updateEmail.updateEmailOtp !== updateEmail_Otp) {
        return next(new ErrorHandler("Invalid Verification code!", 400));
      }

      if (currentEmail !== user.email) {
        return next(
          new ErrorHandler(
            "Invalid request. Please verify your credentials and try again.",
            400
          )
        );
      }

      const isPasswordMatch = await user.comparePassword(password);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid email or password", 400));
      }

      user.email = newEmail;
      await user.save();

      // const userWithoutPassword = await userModel.findById(user._id);

      // await redis.set(userId, JSON.stringify(userWithoutPassword));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update password

interface IUpdateUserPassword {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export const updateUserPassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword, confirmNewPassword } =
        req.body as IUpdateUserPassword;

      const userId = req.user?._id;

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return next(new ErrorHandler("Please enter all fields!", 400));
      }

      if (currentPassword === newPassword) {
        return next(
          new ErrorHandler(
            "The new password must be different from the current password",
            400
          )
        );
      }

      if (newPassword !== confirmNewPassword) {
        return next(
          new ErrorHandler(
            "The new and confirm passwords must be the same!",
            400
          )
        );
      }

      const user = await userModel.findById(userId).select("+password");

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      const isPasswordMatch = await user.comparePassword(currentPassword);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Current password is incorrect", 400));
      }

      // Update user's password in the database
      user.password = newPassword;
      await user.save();

      res.status(201).json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);


// update user info
interface IUpdateUserInfo {
  name?: string;
  avatar?: string;
}

export const updateUserName = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body as IUpdateUserInfo;
      const userId = req.user?._id;
      const user = await userModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      if (!name) {
        return next(new ErrorHandler("Name cannot be Empty!", 404));
      }

      if (user.name === name) {
        return next(new ErrorHandler("You can't use your previous name!", 404));
      }

      user.name = name;

      await user.save();

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const updateUserAvatar = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUpdateUserInfo;
      const userId = req.user?._id;
      const user = await userModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      if (!avatar) {
        return next(new ErrorHandler("Please upload your new avatar", 404));
      }

      if (user.avatar.public_id) {
        await cloudinary.uploader.destroy(user.avatar.public_id);
      }
      const myCloud = await cloudinary.uploader.upload(avatar, {
        folder: "avatars",
        width: 150,
      });
      user.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };

      await user?.save();

      // await redis.set(userId, JSON.stringify(user));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get all users --- only for admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
       const {page, limit=12} = req.query as any;
       
       const totalCourses = await userModel.countDocuments();
       const totalPages = Math.ceil(totalCourses / limit);

       const users = await userModel.find()
       .sort({ createdAt: -1 })
       .skip((page -1) * limit )
       .limit(limit);
 
       res.status(201).json({
        success: true,
        totalPages,
        users,
      });
      // getAllUsersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update user role --- only for admin
export const updateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, role } = req.body;
      const isUserExist = await userModel.findOne({ email });

      if (!isUserExist) {
        return next(new ErrorHandler("User not found", 400));
      }
      if(role === isUserExist.role){
        return next(new ErrorHandler(`${role} role is already assigned to the user`,400))
      }
      const id = isUserExist._id;
      updateUserRoleService(res, id, role);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Delete user --- only for admin
export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const user = await userModel.findById(id);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      await user.deleteOne({ id });

      // await redis.del(id);

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
