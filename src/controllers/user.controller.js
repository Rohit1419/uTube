const registerUser = async (req, res) => {
  try {
    res.status(200).json({
      message: "user registered successfully",
    });
  } catch (error) {
    res.status(5000).json({
      message: "Error while registering user",
    });
  }
};

export default registerUser;
