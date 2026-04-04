import * as React from "react";
import styled from "styled-components";
import map from "lodash/map";
import get from "lodash/get";
import find from "lodash/find";
import cn from "classnames";
import { Content, ContentConfigField } from "app/types";

import { Tab, Tabs, MarkdownPreview, TextArea } from "../../../components";
import { FormikField, MarkdownField } from "../../../fields";
import NoImage from "../../../icons/NoImage.png";

const StyledTextEditor = styled.div`
  display: flex;
  width: 100%;
  .text-editor {
    &__editor {
      width: calc(50% + 32px);
      padding-right: 32px;
      margin-right: -32px;
      border-right: 1px solid ${({ theme }) => theme.palette.blackLight};

      .filled-tab {
        color: ${({ theme }) => theme.palette.teal};
      }
    }

    &__field {
      display: flex;
      flex-direction: column;
      width: 100%;
      color: ${({ theme }) => theme.palette.blackDark};

      &.--text {
        position: relative;
        margin: 16px 0;

        & > .textfield-limit {
          position: absolute;
          right: 0;
          color: ${({ theme }) => theme.palette.blackMiddle};
        }
      }

      & .--title {
        margin-top: 8px;
      }
    }

    &__title {
      margin-bottom: 8px;
    }

    &__preview {
      margin-left: 64px;
      width: calc(50% - 64px);
      .preview-header {
        color: ${({ theme }) => theme.palette.black};
      }
      .preview-title {
        margin-top: 16px;
        color: ${({ theme }) => theme.palette.blackMiddle};
      }
      .preview-field {
        margin-top: 8px;
      }

      &-banner {
        width: 100%;
      }

      &-tabs {
        position: relative;
        display: flex;
        flex-direction: column;
        & > div {
          width: fit-content;

          &:first-child {
            position: absolute;
            top: -48px;
          }
        }
      }

      &-fields {
        &.preview {
          background: ${({ theme }) => theme.palette.white};
          margin-top: 20px;
          padding: 0 16px 8px;
          border-radius: 8px;
        }
      }
    }
  }
`;

interface TextEditorProps {
  content: Content["content"];
  localizedFields: ContentConfigField[];
  languageOptions: {
    value: string;
    label: string;
  }[];
  markdownFields: string[];
  initialLanguage?: string;
  previewBanner?: string;
  onChangeLanguage: (language: string | number | string[] | boolean) => void;
}

const TextEditor: React.FC<TextEditorProps> = ({
  content,
  localizedFields,
  languageOptions,
  markdownFields,
  initialLanguage = "en",
  previewBanner,
  onChangeLanguage
}) => {
  const [previewMode, setPreviewMode] = React.useState<"text" | "preview">("text");
  const filledSomeLanguagesFields = React.useMemo(
    () =>
      languageOptions
        .filter(
          ({ value: language }) =>
            content[language] && (Object.values(content[language]).some(value => value) ? language : undefined)
        )
        .map(({ value }) => value),
    [content, languageOptions]
  );
  const isFilledSomeLanguagesFields = !!filledSomeLanguagesFields.length;

  const [previewLanguage, setPreviewLanguage] = React.useState<string>(initialLanguage);

  const handleChangePreviewLanguage = React.useCallback(
    (language: string | number | string[] | boolean) => setPreviewLanguage(language as string),
    []
  );

  const handleChangePreviewMode = React.useCallback(
    (previewMode: string | number | string[] | boolean) => setPreviewMode(previewMode as "text" | "preview"),
    []
  );

  const handleBrokenBanner = React.useCallback((event: React.ChangeEvent<HTMLImageElement>) => {
    event.target.src = NoImage;
    event.target.onerror = null;
  }, []);

  const getConfigField = React.useCallback(
    (name: string) => find(localizedFields, ({ property }) => property.includes(name)),
    [localizedFields]
  );
  const titleField = getConfigField("title") || getConfigField("subject");

  return (
    <StyledTextEditor>
      <div className="text-editor__editor">
        <div>
          <Tabs value={initialLanguage} onChange={onChangeLanguage}>
            {languageOptions.map(({ value: lang, label }) => {
              const isFieldsFilled = content[lang] && Object.values(content[lang]).filter(value => value).length;

              return (
                <Tab color={isFieldsFilled ? "teal" : "black"} value={lang} key={lang}>
                  {label}
                </Tab>
              );
            })}
          </Tabs>
        </div>
        {map(localizedFields, localizedField => {
          const fieldValue = get(content[initialLanguage], localizedField.property) || "";
          const fieldLength = fieldValue?.length;
          const formikName = `content.${initialLanguage}.${localizedField.property}`;
          return (
            <div className="text-editor__field --text" key={localizedField.property}>
              <span className="text-editor__title text-main-reg">
                {localizedField.title}
                {localizedField.required && "*"}
              </span>
              {markdownFields.includes(localizedField.property) ? (
                <MarkdownField name={formikName} />
              ) : (
                <FormikField name={formikName}>
                  <TextArea className="text-small-reg" placeholder="Enter" rows={Math.ceil(fieldLength / 60) || 1} />
                </FormikField>
              )}

              <span className="textfield-limit text-small-reg">{`${fieldLength}/${
                localizedField.limit || 50000
              }`}</span>
            </div>
          );
        })}
      </div>
      {isFilledSomeLanguagesFields && (
        <div className="text-editor__preview">
          <div className="text-editor__preview-tabs">
            <Tabs value={previewMode} onChange={handleChangePreviewMode}>
              <Tab value="text">Text</Tab>
              <Tab value="preview">Preview</Tab>
            </Tabs>
            <Tabs value={previewLanguage} onChange={handleChangePreviewLanguage}>
              {languageOptions.map(({ value, label }) => {
                if (!(content[value] && Object.values(content[value]).filter(value => value).length)) {
                  return null;
                }

                return (
                  <Tab value={value} key={value}>
                    {label}
                  </Tab>
                );
              })}
            </Tabs>
          </div>
          {titleField && (
            <div className="text-editor__field">
              <span className="preview-title text-main-reg">{titleField.title}</span>
              <span className="preview-header text-header-small">
                {get(content[previewLanguage], titleField.property)}
              </span>
            </div>
          )}
          <div className={cn("text-editor__preview-fields", previewMode)}>
            {previewMode === "preview" && previewBanner && (
              <img
                className="text-editor__preview-banner"
                src={previewBanner}
                onError={handleBrokenBanner}
                alt="preview banner"
              />
            )}
            {map(localizedFields, localizedField => {
              if (localizedField.property === "title" || localizedField.property === "subject") {
                return;
              }
              const fieldValue = get(content[previewLanguage], localizedField.property) || "";

              if (fieldValue)
                return (
                  <div className="text-editor__field" key={localizedField.property}>
                    {previewMode !== "preview" && (
                      <span className="preview-title text-main-reg">{localizedField.title}</span>
                    )}
                    <MarkdownPreview className="preview-field" source={fieldValue} />
                  </div>
                );
            })}
          </div>
        </div>
      )}
    </StyledTextEditor>
  );
};

export { TextEditor };
