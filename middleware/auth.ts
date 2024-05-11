import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import userModel from "../models/user.model";
import { accessTokenOptions, refreshTokenOptions } from "../utils/jwt";

// authenticated user
export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {

  
    try {
        let access_token = req.cookies.access_token;
      if (!access_token) {
        // await updateAccessToken(req, res, next);
      
        const refresh_token = req.cookies.refresh_token as string;
        if (!refresh_token) {
          return next(
            new ErrorHandler("Please login to access this resource", 400)
          );
        }
        try {
          
        
        const decoded = jwt.verify(
          refresh_token,
          process.env.REFRESH_TOKEN as Secret
        ) as JwtPayload;
  
        const user = await userModel.findById(decoded.id);
        if (!user) {
          return next(new ErrorHandler("User not found!", 400));
        }
        const accessToken = jwt.sign(
          { id: user._id },
          process.env.ACCESS_TOKEN as Secret,
          {
            expiresIn: "5m",
          }
        );
  
        const refreshToken = jwt.sign(
          { id: user._id },
          process.env.REFRESH_TOKEN as Secret,
          {
            expiresIn: "3d",
          }
        );
  
        res.cookie("access_token", accessToken, accessTokenOptions);
        res.cookie("refresh_token", refreshToken, refreshTokenOptions);
        
        access_token = accessToken

       }catch (error:any) {
        if (error.name === "JsonWebTokenError") {
          return next(new ErrorHandler("Refresh token is not valid", 400));
        } else {
          next(error);
        }
        }
      }


      const decoded = jwt.verify(
        access_token,
        process.env.ACCESS_TOKEN as Secret
      ) as JwtPayload;

      const user = await userModel.findById(decoded.id);

      if (!user) {
        return next(new ErrorHandler("User not found!", 400));
      }
      req.user = user;
      next();
    } catch (error: any) {
      if (error.name === "JsonWebTokenError") {
        return next(new ErrorHandler("Access token is not valid", 400));
      } else {
        next(error);
      }
    }
  }
);

// validate user role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role as string)) {
      return next(
        new ErrorHandler(
          `Role: ${req.user?.role} is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};

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
