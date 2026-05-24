const { z } = require('zod');

/**
 * Middleware to validate a request body, query, or params against a Zod schema.
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @param {string} source - Where to look for the data ('body', 'query', 'params')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req[source]);
      
      // Replace the request data with the sanitized and coerced data from Zod
      req[source] = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format the errors into a readable structure
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: formattedErrors 
        });
      }
      
      next(error);
    }
  };
};

module.exports = { validate };
