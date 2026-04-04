import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Content, ContentType, ContentConfigByType } from "app/types";
import merge from "lodash/merge";
import set from "lodash/set";

import { createContent } from "./";
import { selectLanguageOptions } from "../app";
import { AppDispatch } from "../../redux";

interface Props {
  brandId: string;
  contentType: ContentType;
  config?: ContentConfigByType;
}

const getInitialValue = (type: string) => {
  switch (type) {
    case "boolean":
      return false;
    case "array":
      return [];
    default:
      return "";
  }
};

export const useCreateContent = ({ config, brandId, contentType }: Props) => {
  const dispatch: AppDispatch = useDispatch();

  const languageOptions = useSelector(selectLanguageOptions);

  const handleCreateContent = useCallback(
    async (values: Content) => {
      brandId && dispatch(createContent({ values, brandId, type: contentType as ContentType }));
    },
    [dispatch, brandId, contentType]
  );
  const fields = config?.fields.reduce((acc, { property, type }) => {
    const initialValue = getInitialValue(type);
    const field = set({}, property, initialValue);

    return merge(acc, field);
  }, {});

  const localizedFields = languageOptions.reduce(
    (acc, { value: language }) => ({
      ...acc,
      [language]: config?.localizedFields.reduce((acc, { property }) => {
        return merge(acc, set({}, property, ""));
      }, {})
    }),
    {}
  );

  const initialValues = merge({ content: localizedFields }, fields);

  return {
    initialValues,
    handleCreateContent
  };
};
