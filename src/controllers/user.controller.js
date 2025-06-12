import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnClaudinary from "../utils/claudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//generate access and refresh token support function
const generateAccessAndRefreshToken = async (userID) => {
  try {
    const user = await User.findById(userID);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

//regisrter user
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
  if (
    [fullName, email, password, username].some(
      (field) => !field || field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exits

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exits");
  }

  // check for avatar and cover image

  const avatarLocalPath = req.files["avatar"][0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required required");
  }

  const avatar = await uploadOnClaudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar  uploading failed");
  }

  //check if cover image is present

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  const coverImage = await uploadOnClaudinary(coverImageLocalPath);

  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }
  //response return

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

//login user
const loginUser = asyncHandler(async (req, res) => {
  //req body = data
  //set username or email
  ///check if the username or email is present
  //check if password is correct
  //generate access token and refresh token
  //set refresh token in cookie

  const { email, password } = req.body;

  if (!email && !password) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  if (!accessToken || !refreshToken) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = { httpOnly: true, secure: true }; // for sending cookie and making it modifiable only by server

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { loggedInUser, accessToken, refreshToken }, // not sending refresh token in response everytime, but in case if user want to save these then he can save it in local storage or can be usefull in case of building mobile app
        "User logged in successfully"
      )
    );
});

// logout user
const logoutUser = asyncHandler(async (req, res) => {
  //clear cookies
  //clear refresh token from database
  //return response
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },

    {
      new: true,
    }
  );

  const options = { httpOnly: true, secure: true };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

//refresh refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
  //get refresh token from cookie
  //verify refresh token
  //generate new access token
  //return response

  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || reqbody.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(
        401,
        "unauthorized request - Refresh token is required"
      );
    }
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "unauthorized request - Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(
        401,
        "unauthorized request - refresh token expired or used "
      );
    }
    const options = { httpOnly: true, secure: true };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("newRefreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message, "invalid refresh token");
  }
});

//change password
const chnageCurrentPassword = asyncHandler(async (req, res) => {
  //get the old password and newpassword
  //cheeck user is login in
  // if validition : true then update the password
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?.id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Old Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Chnage successfully"));
});

//get current user
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

// update user account details
const updateAccountDetails = asyncHandler(async (req, res) => {
  //get the data from frontend
  //validate the data
  //check if user is logged in
  //update the user
  //return response

  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName: fullname,
        email: email,
      },
    },
    { new: true }
  ).select("-password ");

  return res(new ApiResponse(200, user, "User details updated successfully"));
});

// update user avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Please upload the image ");
  }

  const avatar = await uploadOnClaudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error While uploading avatar on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password ");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "user avatar updated successfully"));
});

//upddate user cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Please upload the image ");
  }

  const coverImage = await uploadOnClaudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error While uploading cover image on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password ");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "user cover image updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  chnageCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
