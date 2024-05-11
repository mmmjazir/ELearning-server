import { NextFunction, Response } from "express";
import userModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";

// get user by id
export const getUserById = async (id: string, res: Response, next: NextFunction) => {

  const user = await userModel.findById(id).select("+password");
  
  if(!user){
    return next(new ErrorHandler('User not found!', 400));
  }

    res.status(201).json({
      success: true,
      user,
    });
  
};

// Get All users
export const getAllUsersService = async (res: Response) => {
  const users = await userModel.find().sort({ createdAt: -1 });

  res.status(201).json({
    success: true,
    users,
  });
};

// update user role
export const updateUserRoleService = async (res:Response,id: string,role:string) => {

  const user = await userModel.findByIdAndUpdate(id, { role }, { new: true });
  
  // await redis.set(id, JSON.stringify(user))

  res.status(201).json({
    success: true,
    user,
  });
}

