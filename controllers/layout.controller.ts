import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import LayoutModel from "../models/layout.model";
import { v2 as cloudinary } from "cloudinary";

// create layout
export const createLayout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      const isTypeExist = await LayoutModel.findOne({ type });
      if (isTypeExist) {
        return next(new ErrorHandler(`${type} already exist`, 400));
      }
      if (type === "Banner") {
        const { image, title, subTitle } = req.body;
        const myCloud = await cloudinary.uploader.upload(image, {
          folder: "layout",
        });
        const banner = {
          type: "Banner",
          banner: {
            image: {
              public_id: myCloud.public_id,
              url: myCloud.secure_url,
            },
            title,
            subTitle,
          },
        };
        await LayoutModel.create(banner);
      }
      if (type === "FAQ") {
        const { faq } = req.body;
  
        await LayoutModel.create({ type: "FAQ", faq });
      }
      if (type === "Categories") {
        const { categories } = req.body;
   
        await LayoutModel.create({
          type: "Categories",
          categories,
        });
      }

      res.status(200).json({
        success: true,
        message: "Layout created successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Edit layout
export const editLayout = CatchAsyncError(
  async(req:Request,res:Response,next:NextFunction)=>{

    try {
      const {type} = req.body;
      if(type === "Banner"){
        const bannerData: any = await LayoutModel.findOne({ type: "Banner" });

        const { image, title, subTitle } = req.body;

       let banner;

        if(image.startsWith("https")){
           
           banner = {
            type: "Banner",
            image: {
              public_id: bannerData.banner.image.public_id, 
              url: bannerData.banner.image.url
            },
            title,
            subTitle,
          };
        }else{
          const data = await cloudinary.uploader.upload(image, {folder: "layout"})
          banner = {
            type: "Banner",
            image: {
              public_id: data?.public_id, 
              url: data?.secure_url
            },
            title,
            subTitle,
          };
        }
         
        await LayoutModel.findByIdAndUpdate(bannerData.id, {banner});
      }

      if(type === "FAQ"){
        const { faq } = req.body;
        const FaqItem = await LayoutModel.findOne({ type: "FAQ" });
    
        await LayoutModel.findByIdAndUpdate(FaqItem?._id, {
          type: "FAQ",
          faq,
        });
      }

      if (type === "Categories") {
        const { categories } = req.body;
        const categoriesData = await LayoutModel.findOne({
          type: "Categories",
        });
     
        await LayoutModel.findByIdAndUpdate(categoriesData?._id, {
          type: "Categories",
          categories,
        });
      }

      res.status(200).json({
        success: true,
        message: "Layout Updated successfully",
      });

    } catch (error:any) {
      return next(new ErrorHandler(error.message,500))
    }

});

// get layout by type
export const getLayoutByType = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.params;
      const layout = await LayoutModel.findOne({ type });
      res.status(201).json({
        success: true,
        layout,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);