const { AppError } = require("./errorMiddleware");

const validateRequest = (schema) => (req, res, next) => {
  try {
    // Validate body, query, and params if defined in the Zod schema
    const dataToValidate = {};
    if (schema.shape.body) dataToValidate.body = req.body;
    if (schema.shape.query) dataToValidate.query = req.query;
    if (schema.shape.params) dataToValidate.params = req.params;

    // If schema is just validating body (which is the most common use-case), let's validate it directly
    const parseResult = schema.safeParse(
      schema.shape.body || schema.shape.query || schema.shape.params
        ? dataToValidate
        : { body: req.body }
    );

    if (!parseResult.success) {
      const details = parseResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return next(
        new AppError(
          "Request validation failed",
          400,
          "VALIDATION_ERROR",
          details
        )
      );
    }

    // Override req fields with parsed/cleaned values
    if (schema.shape.body) req.body = parseResult.data.body;
    if (schema.shape.query) req.query = parseResult.data.query;
    if (schema.shape.params) req.params = parseResult.data.params;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validateRequest;
