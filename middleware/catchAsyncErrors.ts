import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";

// export const CatchAsyncError =
//   (theFunc: any) => (req: Request, res: Response, next: NextFunction) => {
//     Promise.resolve(theFunc(req, res, next)).catch(next);
//   };

export const CatchAsyncError = (theFunc: any) => async(req: Request, res: Response, next: NextFunction) => {
    try {
      await theFunc(req, res, next);
    } catch (error:any) {
      
      if (
        error.name === "CastError" ||
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError" ||
        error.code === '11000'
      ) {
        return next(error);
      }
      else{
        return next(new ErrorHandler(error.message, 400));
      }
      
    }
  };
