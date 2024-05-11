"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatchAsyncError = void 0;
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
// export const CatchAsyncError =
//   (theFunc: any) => (req: Request, res: Response, next: NextFunction) => {
//     Promise.resolve(theFunc(req, res, next)).catch(next);
//   };
const CatchAsyncError = (theFunc) => async (req, res, next) => {
    try {
        await theFunc(req, res, next);
    }
    catch (error) {
        if (error.name === "CastError" ||
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.code === '11000') {
            return next(error);
        }
        else {
            return next(new ErrorHandler_1.default(error.message, 400));
        }
    }
};
exports.CatchAsyncError = CatchAsyncError;
