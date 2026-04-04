import * as yup from "yup";

yup.setLocale({
  mixed: {
    default: ({ path }) => ({
      id: "validation.mixed.default",
      defaultMessage: "{path} is invalid",
      values: { path }
    }),
    required: ({ path }) => ({
      id: "validation.mixed.required",
      defaultMessage: "{path} is a required field",
      values: { path }
    }),
    oneOf: ({ path, values }) => ({
      id: "validation.mixed.oneOf",
      defaultMessage: "{path} must be one of the following values: {values}",
      values: { path, values }
    }),
    notOneOf: ({ path, values }) => ({
      id: "validation.mixed.notOneOf",
      defaultMessage:
        "{path} must not be one of the following values: {values}",
      values: { path, values }
    }),
    notType: ({ path, type }) =>
      ({
        id: "validation.mixed.notType",
        defaultMessage: "{path} must be a `{type}` type",
        values: { path, type }
      } as any)
  },
  string: {
    length: ({ path, length }) => ({
      id: "validation.string.length",
      defaultMessage: "{path} must be exactly {length} characters",
      values: { path, length }
    }),
    email: ({ path }) => ({
      id: "validation.string.email",
      defaultMessage: "{path} must be a valid email",
      values: { path }
    }),
    min: ({ path, min }) => ({
      id: "validation.string.min",
      defaultMessage: "{path} must be at least {min} characters",
      values: { path, min }
    }),
    max: ({ path, max }) => ({
      id: "validation.string.max",
      defaultMessage: "{path} must be at most {max} characters",
      values: { path, max }
    }),
    matches: ({ path }) => ({
      id: "validation.string.matches",
      defaultMessage: "{path} is invalid",
      values: { path }
    }),
    url: ({ path }) => ({
      id: "validation.string.url",
      defaultMessage: "{path} must be a valid URL",
      values: { path }
    }),
    trim: ({ path }) => ({
      id: "validation.string.trim",
      defaultMessage: "{path} must be a trimmed string",
      values: { path }
    }),
    lowercase: ({ path }) => ({
      id: "validation.string.lowercase",
      defaultMessage: "{path} must be a lowercase string",
      values: { path }
    }),
    uppercase: ({ path }) => ({
      id: "validation.string.uppercase",
      defaultMessage: "{path} must be a upper case string",
      values: { path }
    })
  },
  number: {
    min: ({ path, min }) => ({
      id: "validation.number.min",
      defaultMessage: "{path} must be greater than or equal to {min}",
      values: { path: `${path}`, min: `${min}` }
    }),
    max: ({ path, max }) => ({
      id: "validation.number.max",
      defaultMessage: "{path} must be less than or equal to {max}",
      values: { path, max }
    }),
    lessThan: ({ path, less }) => ({
      id: "validation.number.lessThan",
      defaultMessage: "{path} must be less than {less}",
      values: { path, less }
    }),
    moreThan: ({ path, more }) => ({
      id: "validation.number.moreThan",
      defaultMessage: "{path} must be greater than {more}",
      values: { path, more }
    }),
    positive: ({ path }) => ({
      id: "validation.number.positive",
      defaultMessage: "{path} must be a positive number",
      values: { path }
    }),
    negative: ({ path }) => ({
      id: "validation.number.negative",
      defaultMessage: "{path} must be a negative number",
      values: { path }
    }),
    integer: ({ path }) => ({
      id: "validation.number.integer",
      defaultMessage: "{path} must be an integer",
      values: { path }
    })
  },
  date: {
    min: ({ path, min }) => ({
      id: "validation.date.min",
      defaultMessage: "{path} field must be later than {min}",
      values: { path, min }
    }),
    max: ({ path, max }) => ({
      id: "validation.date.max",
      defaultMessage: "{path} field must be at earlier than {max}",
      values: { path, max }
    })
  },
  object: {
    noUnknown: ({ path }) => ({
      id: "validation.object.noUnknown",
      defaultMessage:
        "{path} field cannot have keys not specified in the object shape",
      values: { path }
    })
  },
  array: {
    min: ({ path, min }) => ({
      id: "validation.array.min",
      defaultMessage: "{path} field must have at least {min} items",
      values: { path, min }
    }),
    max: ({ path, max }) => ({
      id: "validation.array.max",
      defaultMessage:
        "{path} field must have less than or equal to {max} items",
      values: { path, max }
    })
  }
});

export default yup;
