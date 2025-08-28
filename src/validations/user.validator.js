const joi = require("joi");

exports.createUser = joi.object({

  userId: joi.string(),
  name: joi.string()
    .regex(/^[\p{L}\p{N}]+(?: [\p{L}\p{N}]+)*$/u)
    .required(),

  email: joi
    .string()
    .email({ tlds: { allow: false } }) // allows unicode + modern TLDs
    .required(),

  country: joi
    .string()
    .regex(/^[a-zA-Z\s]+$/)
    .optional(),

  country_code: joi
    .string()
    .regex(/^[A-Z]{2,3}$/)
    .optional(),

  dial_code: joi
    .string()
    .regex(/^\+?[0-9]{1,5}$/)
    .optional(),

  phone: joi
    .string()
    .regex(/^\d{7,15}$/)
    .required(),

  avatar: joi
    .string()
    .allow(null)
    .optional(),

  lang: joi
    .string()
    .default("en"),

  plan_id: joi
    .string()
    .optional(),

  plan_expired_date: joi
    .date()
    .allow(null)
    .optional(),

  tenant_id: joi
    .array()
    .items(joi.string())
    .min(1)
    .required(),

  tenant_id: joi
    .array()
    .items(joi.string())
    .min(1)
    .required(),

  active_status: joi
    .boolean()
    .default(true),

  type: joi
    .string()
    .valid("admin", "user", "moderator")
    .default("user"),

  created_at: joi
    .date()
    .optional(),

  updated_at: joi
    .date()
    .optional(),
});

exports.updateUser = joi.object({
  _id: joi.string().hex().length(24).optional(),
  name: joi
    .string()
    .regex(/^[a-zA-Z]+(?: [a-zA-Z]+)*$/),

  email: joi
    .string()
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .email(),

  country: joi
    .string()
    .regex(/^[a-zA-Z\s]+$/)
    .optional(),

  country_code: joi
    .string()
    .regex(/^[A-Z]{2,3}$/)
    .optional(),

  dial_code: joi
    .string()
    .regex(/^\+?[0-9]{1,5}$/)
    .optional(),

  phone: joi
    .string()
    .regex(/^\d{7,15}$/),

  avatar: joi
    .string()
    .uri()
    .optional(),

  lang: joi
    .string()
    .default("en"),

  plan_id: joi
    .string()
    .optional(),
  tenant_id: joi
    .array()
    .items(joi.string())
    .min(1)
    .required(),

  plan_expired_date: joi
    .date()
    .optional(),

  active_status: joi
    .boolean()
    .default(true),

  type: joi
    .string()
    .valid("admin", "user", "moderator")
    .default("user"),

  created_at: joi
    .date()
    .optional(),

  updated_at: joi
    .date()
    .optional(),
});

exports.getUser = joi.object({
  userId: joi.string().optional(),

  email: joi
    .string()
    .email()
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .optional(),
}).or('userId', 'email');



exports.getUserJwt = joi.object({
  uuid: joi
    .string()
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    )
    .required(),
})



exports.deleteUser = joi.object({
  userId: joi.string().required(),
})
