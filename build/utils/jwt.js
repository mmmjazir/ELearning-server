"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToken = exports.refreshTokenOptions = exports.accessTokenOptions = exports.refreshTokenExpire = exports.accessTokenExpire = void 0;
require("dotenv").config();
// parse environment variables to integrates with fallback values
exports.accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || '100');
exports.refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '30');
// options for cookies
exports.accessTokenOptions = {
    expires: new Date(Date.now() + exports.accessTokenExpire * 60 * 1000),
    maxAge: exports.accessTokenExpire * 60 * 1000,
    httpOnly: true,
    sameSite: "none",
    secure: true,
};
exports.refreshTokenOptions = {
    expires: new Date(Date.now() + exports.refreshTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: exports.refreshTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none",
    secure: true,
};
const sendToken = async (user, statusCode, res) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();
    res.cookie("access_token", accessToken, exports.accessTokenOptions);
    res.cookie("refresh_token", refreshToken, exports.refreshTokenOptions);
    res.status(statusCode).json({
        success: true,
        user,
        accessToken,
    });
};
exports.sendToken = sendToken;
