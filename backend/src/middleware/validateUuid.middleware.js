const { z } = require("zod");
const ApiError = require("../utils/apiError.js");

const uuid = z.uuid();

// Ids are Postgres uuid columns; a malformed id reaching Prisma would throw (P2023)
// and surface as a 500, so reject it here with a 400 instead.
const validateUuid = (...parameterNames) => (req, res, next) => {
  const invalidParameter = parameterNames.find(
    (parameterName) => !uuid.safeParse(req.params[parameterName]).success,
  );

  if (invalidParameter) {
    return next(new ApiError(400, `Invalid ${invalidParameter}`));
  }

  next();
};

module.exports = validateUuid;
