import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  //get the token from cookie
  //verify the token
  //if token is valid then add the user to the req object
  //if token is not valid then throw error
  //if token is not present then throw error
  //call next

  try {
    const accessToken =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!accessToken) {
      throw new ApiError(401, "unauthorized request  ");
    }

    const decodedToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, " invalid acces token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message, "invalid access token");
  }
});
