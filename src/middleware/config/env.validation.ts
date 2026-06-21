import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
  ENABLE_API_DOCS: Joi.boolean().optional(),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  REQUEST_BODY_LIMIT: Joi.string().default('100kb'),
  URLENCODED_PARAMETER_LIMIT: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(100),
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).max(5).default(0),
  SAFEHAVEN_ENVIRONMENT: Joi.string()
    .valid('sandbox', 'live')
    .default('sandbox'),
  SAFEHAVEN_BASE_URL: Joi.string().uri().optional(),
  SAFEHAVEN_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(30000)
    .default(10000),
  SAFEHAVEN_CLIENT_ID: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),
  SAFEHAVEN_CLIENT_ASSERTION: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),
});
