import * as Yup from "yup";

import { ContentConfigByType } from "app/types";

function getFieldSchema({
  required,
  type,
  pattern,
  limit
}: {
  required: boolean;
  type: string;
  pattern?: string;
  limit?: number;
}) {
  const getType = (type: string) => {
    switch (type) {
      case "string": {
        const regexp = pattern && new RegExp(`${pattern}`, "gm");
        return regexp ? Yup.string().matches(regexp) : limit ? Yup.string().max(limit) : Yup.string();
      }
      case "number": {
        return Yup.number();
      }
      case "boolean": {
        return Yup.boolean();
      }
      default:
        return Yup.mixed();
    }
  };

  const fieldSchema = required ? getType(type).required() : getType(type);

  return fieldSchema;
}

export const createValidationSchema = (
  config: ContentConfigByType,
  languageOptions: {
    value: string;
    label: string;
  }[]
) => {
  const fieldsSchema = config.fields.reduce((acc, { property, required, type, pattern }) => {
    if (!property.includes("content.")) {
      return { ...acc, [property]: getFieldSchema({ required, type, pattern }) };
    } else return acc;
  }, {});
  const contentSchema = config.fields.reduce((acc, { property, required, type, pattern }) => {
    if (property.includes("content.")) {
      return { ...acc, [property.replace("content.", "")]: getFieldSchema({ required, type, pattern }) };
    } else return acc;
  }, {});
  let localizedFieldsSchema = {};
  if (config.localizedFields.length) {
    localizedFieldsSchema = languageOptions.reduce((acc, { value }) => {
      return {
        ...acc,
        [value]: Yup.object(
          config.localizedFields.reduce((acc, { property, required, type, limit }) => {
            return { ...acc, [property]: getFieldSchema({ required, type, limit }) };
          }, {})
        )
      };
    }, {});
  }

  const schema = Yup.object().shape({
    ...fieldsSchema,
    content: Yup.object({ ...contentSchema, ...localizedFieldsSchema })
  });

  return schema;
};
