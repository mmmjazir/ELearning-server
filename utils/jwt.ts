require("dotenv").config();
import { Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}


 // parse environment variables to integrates with fallback values
 export const accessTokenExpire = parseInt(
  process.env.ACCESS_TOKEN_EXPIRE || '100' 
  );
 
 export const refreshTokenExpire = parseInt(
   process.env.REFRESH_TOKEN_EXPIRE || '30'
 );

 // options for cookies
 export const accessTokenOptions: ITokenOptions = {
   expires: new Date(Date.now() + accessTokenExpire * 60 * 1000),
   maxAge: accessTokenExpire * 60 * 1000,
   httpOnly: true,
   sameSite: "lax",
 };

 export const refreshTokenOptions: ITokenOptions = {
   expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
   maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
   httpOnly: true,
   sameSite: "lax",
 };
 

export const sendToken = async (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();


  // only set secure to true in production
  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
  }

  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

 res.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};
