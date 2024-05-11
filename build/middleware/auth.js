"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.isAuthenticated = void 0;
const catchAsyncErrors_1 = require("./catchAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../models/user.model"));
const jwt_1 = require("../utils/jwt");
// authenticated user
exports.isAuthenticated = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        let access_token = req.cookies.access_token;
        if (!access_token) {
            // await updateAccessToken(req, res, next);
            const refresh_token = req.cookies.refresh_token;
            if (!refresh_token) {
                return next(new ErrorHandler_1.default("Please login to access this resource", 400));
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(refresh_token, process.env.REFRESH_TOKEN);
                const user = await user_model_1.default.findById(decoded.id);
                if (!user) {
                    return next(new ErrorHandler_1.default("User not found!", 400));
                }
                const accessToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.ACCESS_TOKEN, {
                    expiresIn: "5m",
                });
                const refreshToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.REFRESH_TOKEN, {
                    expiresIn: "3d",
                });
                res.cookie("access_token", accessToken, jwt_1.accessTokenOptions);
                res.cookie("refresh_token", refreshToken, jwt_1.refreshTokenOptions);
                access_token = accessToken;
            }
            catch (error) {
                if (error.name === "JsonWebTokenError") {
                    return next(new ErrorHandler_1.default("Refresh token is not valid", 400));
                }
                else {
                    next(error);
                }
            }
        }
        const decoded = jsonwebtoken_1.default.verify(access_token, process.env.ACCESS_TOKEN);
        const user = await user_model_1.default.findById(decoded.id);
        if (!user) {
            return next(new ErrorHandler_1.default("User not found!", 400));
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error.name === "JsonWebTokenError") {
            return next(new ErrorHandler_1.default("Access token is not valid", 400));
        }
        else {
            next(error);
        }
    }
});
// validate user role
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user?.role)) {
            return next(new ErrorHandler_1.default(`Role: ${req.user?.role} is not allowed to access this resource`, 403));
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
// check course Access
// export const checkCourseAccess = CatchAsyncError(
//   async(req:Request,res:Response,next:NextFunction)=>{
//     const userCourseList = req.user?.courses;
//     const courseId = req.params.id || req.body.courseId;
//     const userRole = req.user?.role;
//     const courseExists = userCourseList?.find((course:any) => course._id.toString() === courseId.toString());
//     if(!courseExists && userRole !== "admin"){
//       return next(new ErrorHandler("You are not eligible to access this course",400))
//     }
//     next();
//   })
