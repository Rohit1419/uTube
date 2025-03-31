import cloudinary from "cloudinary";
import fs from "fs";

cloudinary.config({
  claud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnClaudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const responnse = await uploadOnClaudinary.uploader.upload(localFilePath, {
      resourse_type: "auto",
    }); // file has uploaded on claudinary
    console.log("file is uploaded on claudinary", responnse.url);
    return responnse;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temp file as the upload operation got failed
    return null;
  }
};

export default uploadOnClaudinary;
