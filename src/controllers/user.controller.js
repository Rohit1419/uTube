import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnClaudinary from "../utils/claudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  // validation -not empty
  // check if user alrady exits - username, email
  // check for images and avatar
  // create user object - create entry in database
  // remove password and refresh token feild from response
  // check for user creation
  // return response

  const { fullName, email, password, username } = req.body;
  // validation
  if ([fullName, email, password, username].some(field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exits

  const existedUser = User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exits");
  }

  // check for avatar and cover image

  const avatarLocalPath = req.files["avatar"][0]?.path;
  const coverImageLocalPath = req.files["coverImage"][0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required required");
  }
  const avatar = await uploadOnClaudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required required");
  }

  if (coverImageLocalPath) {
    const coverImage = await uploadOnClaudinary(coverImageLocalPath);
  }

  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await user
    .findById(user._id)
    .select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }
  //response return

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

export default registerUser;
