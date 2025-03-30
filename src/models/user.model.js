import mongoose from "mongoose";
import { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      trype: String,
      required: true,
      lowercase: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      trype: String,
      required: true,
      lowercase: true,
      trimm: true,
    },
    fullname: {
      trype: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      trype: String,
      required: true,
    },
    coverImage: {
      trype: String,
    },
    watchHistroy: {
      type: mongooose.Types.ObjectID,
      ref: "Video",
    },
    password: {
      type: String,
      required: true,
      trim: [true, "Password is required"],
    },

    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isMoodified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", userSchema);
