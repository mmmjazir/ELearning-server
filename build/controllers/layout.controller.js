"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLayoutByType = exports.editLayout = exports.createLayout = void 0;
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const layout_model_1 = __importDefault(require("../models/layout.model"));
const cloudinary_1 = require("cloudinary");
// create layout
exports.createLayout = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { type } = req.body;
        const isTypeExist = await layout_model_1.default.findOne({ type });
        if (isTypeExist) {
            return next(new ErrorHandler_1.default(`${type} already exist`, 400));
        }
        if (type === "Banner") {
            const { image, title, subTitle } = req.body;
            const myCloud = await cloudinary_1.v2.uploader.upload(image, {
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
            await layout_model_1.default.create(banner);
        }
        if (type === "FAQ") {
            const { faq } = req.body;
            await layout_model_1.default.create({ type: "FAQ", faq });
        }
        if (type === "Categories") {
            const { categories } = req.body;
            await layout_model_1.default.create({
                type: "Categories",
                categories,
            });
        }
        res.status(200).json({
            success: true,
            message: "Layout created successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// Edit layout
exports.editLayout = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { type } = req.body;
        if (type === "Banner") {
            const bannerData = await layout_model_1.default.findOne({ type: "Banner" });
            const { image, title, subTitle } = req.body;
            let banner;
            if (image.startsWith("https")) {
                banner = {
                    type: "Banner",
                    image: {
                        public_id: bannerData.banner.image.public_id,
                        url: bannerData.banner.image.url
                    },
                    title,
                    subTitle,
                };
            }
            else {
                const data = await cloudinary_1.v2.uploader.upload(image, { folder: "layout" });
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
            await layout_model_1.default.findByIdAndUpdate(bannerData.id, { banner });
        }
        if (type === "FAQ") {
            const { faq } = req.body;
            const FaqItem = await layout_model_1.default.findOne({ type: "FAQ" });
            await layout_model_1.default.findByIdAndUpdate(FaqItem?._id, {
                type: "FAQ",
                faq,
            });
        }
        if (type === "Categories") {
            const { categories } = req.body;
            const categoriesData = await layout_model_1.default.findOne({
                type: "Categories",
            });
            await layout_model_1.default.findByIdAndUpdate(categoriesData?._id, {
                type: "Categories",
                categories,
            });
        }
        res.status(200).json({
            success: true,
            message: "Layout Updated successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get layout by type
exports.getLayoutByType = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { type } = req.params;
        const layout = await layout_model_1.default.findOne({ type });
        res.status(201).json({
            success: true,
            layout,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
