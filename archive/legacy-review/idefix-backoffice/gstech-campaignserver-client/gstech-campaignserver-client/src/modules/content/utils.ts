import { ContentType, ContentConfigField, Content } from "app/types";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";

import { CONTENT_TYPES } from "../../utils/constants";

export const getContentConfigField = (configFields: ContentConfigField[], name: string) =>
  find(configFields, ({ property }) => property.includes(name));

export const getContentImageSrc = (brand: string, contentType: ContentType, imageUrl: string) =>
  contentType === CONTENT_TYPES.notification
    ? `https://static.${brand}.com/b/${contentType}s/${imageUrl}`
    : `https://static.${brand}.com/${imageUrl}`;

export const getMarkdownFieldsByType = (contentType: ContentType) => {
  switch (contentType) {
    case CONTENT_TYPES.email:
      return ["text"];
    case CONTENT_TYPES.sms:
      return [];
    case CONTENT_TYPES.notification:
      return ["content", "disclaimer"];
    case CONTENT_TYPES.landingPage:
      return ["text", "additionalInfo"];
    case CONTENT_TYPES.banner:
      return ["text"];
    default:
      return [];
  }
};

export const getLanguagesFilled = (languageOptions: { value: string; label: string }[], content: Content["content"]) =>
  languageOptions.map(({ value }) => ({
    language: value,
    isFilled: content[value] && !isEmpty(content[value]) && !Object.values(content[value]).some(value => !value)
  }));
