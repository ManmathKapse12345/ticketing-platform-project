const mongoose = require("mongoose");
const ApiError = require("../utils/apiError.js");

const validateObjectId = (...parameterNames) => (req, res, next) => {
  const invalidParameter = parameterNames.find(
    (parameterName) => !mongoose.isValidObjectId(req.params[parameterName]),
  );

  if (invalidParameter) {
    return next(new ApiError(400, `Invalid ${invalidParameter}`));
  }

  next();
};

module.exports = validateObjectId;
