import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
  SAFEHAVEN_ENVIRONMENT: Joi.string().valid('sandbox', 'live').default('sandbox'),
  SAFEHAVEN_BASE_URL: Joi.string().uri().optional(),
  SAFEHAVEN_CLIENT_ID: Joi.string().optional(),
  SAFEHAVEN_CLIENT_ASSERTION: Joi.string().optional(),
});
