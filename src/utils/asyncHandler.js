const asyncHandler = (requesthandler) => async (req, res, next) => {
  try {
    await requesthandler(req, res, next);
  } catch (error) {
    console.log("error in asyncHandler:", error);
    res.status(error.code || 500).json({
      succcess: false,
      message: error.message,
    });
  }
};

export { asyncHandler };

// also can use this this index

// const asynchandler = (requestHandler) => {
//     return (req, res, next) => {
//       Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
//     };
//   };
