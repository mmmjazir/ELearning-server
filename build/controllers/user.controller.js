"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUserRole = exports.getAllUsers = exports.updateUserAvatar = exports.updateUserName = exports.updateUserPassword = exports.updateUserEmail = exports.createUpdateEmailToken = exports.changeUserEmail = exports.socialAuth = exports.getUserInfo = exports.resetPassword = exports.acceptResetPasswordOtp = exports.createResetPasswordToken = exports.forgotPassword = exports.logoutUser = exports.loginUser = exports.activateUser = exports.createActivationToken = exports.registrationUser = void 0;
require("dotenv").config();
const user_model_1 = __importDefault(require("../models/user.model"));
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const validator_1 = __importDefault(require("validator"));
const cloudinary_1 = require("cloudinary");
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const jwt_1 = require("../utils/jwt");
const user_service_1 = require("../services/user.service");
exports.registrationUser = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    const { name, email, password } = req.body;
    const isEmailExist = await user_model_1.default.findOne({ email });
    if (!name || !email || !password) {
        return next(new ErrorHandler_1.default("Please enter all fields", 400));
    }
    if (isEmailExist) {
        return next(new ErrorHandler_1.default("Email already exist", 400));
    }
    if (!validator_1.default.isEmail(email)) {
        return next(new ErrorHandler_1.default("Enter a valid email address", 400));
    }
    if (!validator_1.default.isStrongPassword(password)) {
        return next(new ErrorHandler_1.default("Weak password. Please choose a stronger password!", 400));
    }
    const user = {
        name,
        email,
        password,
    };
    const activationToken = (0, exports.createActivationToken)(user);
    const activationCode = activationToken.activationCode;
    const data = { user: { name: user.name }, activationCode };
    try {
        await (0, sendMail_1.default)({
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
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
const createActivationToken = (user) => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const token = jsonwebtoken_1.default.sign({ user, activationCode }, process.env.ACTIVATION_SECRET, { expiresIn: "5m" });
    return { token, activationCode };
};
exports.createActivationToken = createActivationToken;
exports.activateUser = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    const { activation_token, activation_code } = req.body;
    if (!activation_code) {
        return next(new ErrorHandler_1.default("Enter your activation code", 400));
    }
    const newUser = jsonwebtoken_1.default.verify(activation_token, process.env.ACTIVATION_SECRET);
    if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler_1.default("Invalid activation code", 400));
    }
    const { name, email, password } = newUser.user;
    const existUser = await user_model_1.default.findOne({ email });
    if (existUser) {
        return next(new ErrorHandler_1.default("Email already exist", 400));
    }
    const user = await user_model_1.default.create({
        name,
        email,
        password,
    });
    await user.save();
    res.status(201).json({
        success: true,
        message: "Account created successfully",
    });
});
exports.loginUser = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new ErrorHandler_1.default("Please enter email and password", 400));
        }
        const user = await user_model_1.default.findOne({ email }).select("+password");
        if (!user) {
            return next(new ErrorHandler_1.default("Invalid email or password", 400));
        }
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler_1.default("Invalid email or password", 400));
        }
        // user without password
        // const userWithoutPassword = await userModel.findOne({ email });
        // if (!userWithoutPassword) {
        //   return next(new ErrorHandler("Invalid email or password", 400));
        // }
        req.user = user;
        return (0, jwt_1.sendToken)(user, 200, res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// logout user
exports.logoutUser = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
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
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.forgotPassword = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return next(new ErrorHandler_1.default("Please enter you email!", 400));
        }
        if (!validator_1.default.isEmail(email)) {
            return next(new ErrorHandler_1.default("Enter a valid email address", 400));
        }
        const isEmailExist = await user_model_1.default.findOne({ email });
        if (!isEmailExist) {
            return next(new ErrorHandler_1.default("User not found, invalid request", 400));
        }
        const name = isEmailExist.name;
        const ResetPasswordToken = (0, exports.createResetPasswordToken)(email);
        const ResetPasswordOtp = ResetPasswordToken.forgotPasswordOtp;
        const data = { user: name, ResetPasswordOtp };
        try {
            await (0, sendMail_1.default)({
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
        }
        catch (error) {
            return next(new ErrorHandler_1.default(error.message, 400));
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
const createResetPasswordToken = (email) => {
    const forgotPasswordOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const forgotPasswordToken = jsonwebtoken_1.default.sign({ email, forgotPasswordOtp }, process.env.FORGOT_PASSWORD_SECRET, { expiresIn: "5m" });
    return { forgotPasswordToken, forgotPasswordOtp };
};
exports.createResetPasswordToken = createResetPasswordToken;
exports.acceptResetPasswordOtp = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    const { resetPassword_Token, resetPassword_Otp } = req.body;
    if (!resetPassword_Otp) {
        return next(new ErrorHandler_1.default("Enter the code from your email to verify", 400));
    }
    const OtpCheck = jsonwebtoken_1.default.verify(resetPassword_Token, process.env.FORGOT_PASSWORD_SECRET);
    if (OtpCheck.forgotPasswordOtp !== resetPassword_Otp) {
        return next(new ErrorHandler_1.default("Invalid verification code", 400));
    }
    const ResetToken = jsonwebtoken_1.default.sign({ email: OtpCheck.email }, process.env.RESET_PASSWORD_SECRET, { expiresIn: "5m" });
    res.status(201).json({
        success: true,
        ResetToken,
    });
});
exports.resetPassword = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    const { newPassword, confirmPassword, resetPassword_token } = req.body;
    if (!newPassword || !confirmPassword) {
        return next(new ErrorHandler_1.default("Please enter all fields to continue", 400));
    }
    if (newPassword !== confirmPassword) {
        return next(new ErrorHandler_1.default("Passwords does not match", 400));
    }
    if (!validator_1.default.isStrongPassword(newPassword)) {
        return next(new ErrorHandler_1.default("Weak password. Please choose a stronger password!", 400));
    }
    let logoutUser = false;
    try {
        const { email } = jsonwebtoken_1.default.verify(resetPassword_token, process.env.RESET_PASSWORD_SECRET);
        const user = await user_model_1.default.findOne({ email }).select("+password");
        if (!user) {
            return next(new ErrorHandler_1.default("User not found", 404));
        }
        const isSamePassword = await user.comparePassword(newPassword);
        if (isSamePassword) {
            return next(new ErrorHandler_1.default("New password must be different from the old password", 400));
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
    }
    catch (error) {
        return next(new ErrorHandler_1.default("Invalid or expired token", 400));
    }
});
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
exports.getUserInfo = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const userId = req.user?._id;
        (0, user_service_1.getUserById)(userId, res, next);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// social auth
exports.socialAuth = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { email, name, avatar } = req.body;
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            const newUser = await user_model_1.default.create({ email, name, avatar });
            req.user = newUser;
            return (0, jwt_1.sendToken)(newUser, 200, res);
        }
        req.user = user;
        (0, jwt_1.sendToken)(user, 200, res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.changeUserEmail = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { newEmail } = req.body;
        const userEmail = req.user?.email;
        const isEmailExist = await user_model_1.default.findOne({ newEmail });
        if (!newEmail) {
            return next(new ErrorHandler_1.default("Please enter your new email", 400));
        }
        if (!validator_1.default.isEmail(newEmail)) {
            return next(new ErrorHandler_1.default("Enter a valid email address", 400));
        }
        if (newEmail === userEmail) {
            return next(new ErrorHandler_1.default("You are already connected with this email id, try a different one!", 400));
        }
        if (isEmailExist) {
            return next(new ErrorHandler_1.default("Email already been used!", 400));
        }
        const updateEmail = (0, exports.createUpdateEmailToken)(newEmail);
        const updateEmailOtp = updateEmail.updateEmailOtp;
        const data = { updateEmailOtp };
        try {
            await (0, sendMail_1.default)({
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
        }
        catch (error) {
            return next(new ErrorHandler_1.default(error.message, 400));
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
const createUpdateEmailToken = (email) => {
    const updateEmailOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const updateEmailToken = jsonwebtoken_1.default.sign({ email, updateEmailOtp }, process.env.UPDATE_EMAIL_SECRET, { expiresIn: "5m" });
    return { updateEmailToken, updateEmailOtp };
};
exports.createUpdateEmailToken = createUpdateEmailToken;
exports.updateUserEmail = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    const { updateEmail_Otp, updateEmail_Token, currentEmail, newEmail, password, } = req.body;
    const userId = req.user?._id;
    if (!updateEmail_Otp || !currentEmail || !newEmail || !password) {
        return next(new ErrorHandler_1.default("Enter all the fields", 400));
    }
    const user = await user_model_1.default.findById(userId).select("+password");
    if (!user) {
        return next(new ErrorHandler_1.default("User not found", 400));
    }
    try {
        const updateEmail = jsonwebtoken_1.default.verify(updateEmail_Token, process.env.UPDATE_EMAIL_SECRET);
        if (updateEmail.email !== newEmail) {
            return next(new ErrorHandler_1.default("Invalid request. Please verify the new email and try again!", 400));
        }
        if (updateEmail.updateEmailOtp !== updateEmail_Otp) {
            return next(new ErrorHandler_1.default("Invalid Verification code!", 400));
        }
        if (currentEmail !== user.email) {
            return next(new ErrorHandler_1.default("Invalid request. Please verify your credentials and try again.", 400));
        }
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler_1.default("Invalid email or password", 400));
        }
        user.email = newEmail;
        await user.save();
        // const userWithoutPassword = await userModel.findById(user._id);
        // await redis.set(userId, JSON.stringify(userWithoutPassword));
        res.status(201).json({
            success: true,
            user,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updateUserPassword = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        const userId = req.user?._id;
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return next(new ErrorHandler_1.default("Please enter all fields!", 400));
        }
        if (currentPassword === newPassword) {
            return next(new ErrorHandler_1.default("The new password must be different from the current password", 400));
        }
        if (newPassword !== confirmNewPassword) {
            return next(new ErrorHandler_1.default("The new and confirm passwords must be the same!", 400));
        }
        const user = await user_model_1.default.findById(userId).select("+password");
        if (!user) {
            return next(new ErrorHandler_1.default("User not found", 404));
        }
        const isPasswordMatch = await user.comparePassword(currentPassword);
        if (!isPasswordMatch) {
            return next(new ErrorHandler_1.default("Current password is incorrect", 400));
        }
        // Update user's password in the database
        user.password = newPassword;
        await user.save();
        res.status(201).json({
            success: true,
            message: "Password updated successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updateUserName = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { name } = req.body;
        const userId = req.user?._id;
        const user = await user_model_1.default.findById(userId);
        if (!user) {
            return next(new ErrorHandler_1.default("User not found", 404));
        }
        if (!name) {
            return next(new ErrorHandler_1.default("Name cannot be Empty!", 404));
        }
        if (user.name === name) {
            return next(new ErrorHandler_1.default("You can't use your previous name!", 404));
        }
        user.name = name;
        await user.save();
        res.status(201).json({
            success: true,
            user,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updateUserAvatar = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { avatar } = req.body;
        const userId = req.user?._id;
        const user = await user_model_1.default.findById(userId);
        if (!user) {
            return next(new ErrorHandler_1.default("User not found", 404));
        }
        if (!avatar) {
            return next(new ErrorHandler_1.default("Please upload your new avatar", 404));
        }
        if (user.avatar.public_id) {
            await cloudinary_1.v2.uploader.destroy(user.avatar.public_id);
        }
        const myCloud = await cloudinary_1.v2.uploader.upload(avatar, {
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
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// get all users --- only for admin
exports.getAllUsers = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { page, limit = 12 } = req.query;
        const totalCourses = await user_model_1.default.countDocuments();
        const totalPages = Math.ceil(totalCourses / limit);
        const users = await user_model_1.default.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.status(201).json({
            success: true,
            totalPages,
            users,
        });
        // getAllUsersService(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// update user role --- only for admin
exports.updateUserRole = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { email, role } = req.body;
        const isUserExist = await user_model_1.default.findOne({ email });
        if (!isUserExist) {
            return next(new ErrorHandler_1.default("User not found", 400));
        }
        if (role === isUserExist.role) {
            return next(new ErrorHandler_1.default(`${role} role is already assigned to the user`, 400));
        }
        const id = isUserExist._id;
        (0, user_service_1.updateUserRoleService)(res, id, role);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// Delete user --- only for admin
exports.deleteUser = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await user_model_1.default.findById(id);
        if (!user) {
            return next(new ErrorHandler_1.default("User not found", 404));
        }
        await user.deleteOne({ id });
        // await redis.del(id);
        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
