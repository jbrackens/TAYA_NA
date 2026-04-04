import * as React from "react";
import styled from "styled-components";
import cn from "classnames";
import { useSelector } from "react-redux";
import { Formik, FormikProps, Form, FormikHelpers } from "formik";
import map from "lodash/map";
import get from "lodash/get";
import capitalize from "lodash/capitalize";
import { Content, ContentConfigByType, ContentType } from "app/types";

import { Button, Expander, Select, Tab, TextInput } from "../../components";
import { FormikField, TabsField } from "../../fields";
import { BRAND_NAMES, CONTENT_TYPES } from "../../utils/constants";
import { hideBrokenImage } from "../../utils/hideBrokenImage";
import { selectLanguageOptions } from "../../modules/app";
import { Save } from "../../icons";
import {
  TextEditor,
  ContentDetailsLayout,
  createValidationSchema,
  getContentConfigField,
  getContentImageSrc,
  getMarkdownFieldsByType
} from "../../modules/content";

const StyledContentDetailsForm = styled(Form)`
  .content-details {
    &__form {
      display: flex;
      flex-direction: column;
    }

    &__block {
      width: 100%;

      &__title {
        display: flex;
        width: 50%;
      }

      &.--name {
        display: flex;
        margin-top: 32px;
      }

      &.--checkboxes {
        display: flex;
        margin-top: 16px;
      }
    }

    &__field {
      display: flex;
      flex-direction: column;
      width: 100%;
      color: ${({ theme }) => theme.palette.blackDark};

      & > img {
        width: fit-content;
        max-width: 100%;
        margin-top: 32px;
      }

      & > span {
        margin-bottom: 8px;
      }

      &.--name {
        flex: 3;
        margin-right: 16px;
      }
      &.--type {
        flex: 1;
      }
      &.--content-active {
        width: auto;
        margin-left: 16px;
      }

      &.--additionally,
      &.--image,
      &.--lander {
        width: 50%;
      }

      &.--additionally {
        :not(:last-child) {
          margin-bottom: 32px;
        }
      }

      &.--boolean {
        display: block;
        width: auto;
        & > span {
          margin-right: 8px;
          &.colon {
            color: ${({ theme }) => theme.palette.black};
          }
        }
        &:first-child {
          margin-right: 32px;
        }
      }

      .text-tip {
        color: ${({ theme }) => theme.palette.blackMiddle};
      }
    }

    &__expander {
      margin-top: 64px;
    }
  }
`;

interface ContentFormProps {
  initialValues: Content;
  brandId: string;
  config: ContentConfigByType;
  contentType: ContentType;
  contentId?: number;
  initialLanguage?: string;
  onChangeLanguage: (language: string | number | string[] | boolean) => void;
  onSubmit: (values: Content, formikHelpers: FormikHelpers<Content>) => void;
  onRemove?: (contentId: number) => void;
}

const ContentForm: React.FC<ContentFormProps> = ({
  initialValues,
  config,
  contentType,
  brandId,
  contentId,
  initialLanguage,
  onChangeLanguage,
  onSubmit,
  onRemove
}) => {
  const languageOptions = useSelector(selectLanguageOptions);
  const [collapsedExpanders, setCollapsedExpanders] = React.useState<{ [key: string]: boolean }>({});
  const brand = BRAND_NAMES[brandId];

  const handleOpenExpander = React.useCallback(
    (name: string) => {
      setCollapsedExpanders({ ...collapsedExpanders, [name]: !collapsedExpanders[name] });
    },
    [collapsedExpanders]
  );

  const getConfigField = React.useCallback(
    (name: string) => getContentConfigField(config.fields, name),
    [config.fields]
  );

  const nameConfig = getConfigField("name");
  const imageConfig = getConfigField("image");
  const landerConfig = getConfigField("lander");
  const subtypeConfig = getConfigField("subtype");
  const importantConfig = getConfigField("important");
  const openOnLoginConfig = getConfigField("openOnLogin");
  const activeConfig = getConfigField("active");

  const additionallyFilteredFields = config?.fields.filter(({ property }) => {
    if (
      property === "active" ||
      property === "name" ||
      property === "subtype" ||
      property.includes("openOnLogin") ||
      property.includes("important") ||
      property.includes("image") ||
      property.includes("lander")
    ) {
      return;
    }
    return property;
  });

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={createValidationSchema(config, languageOptions)}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {({ values, isSubmitting, isValid, dirty }: FormikProps<Content>) => {
        return (
          <StyledContentDetailsForm>
            <ContentDetailsLayout
              backUrl={`/${brandId}/content/${contentType}`}
              contentType={contentType}
              submitButton={
                <Button icon={<Save />} type="submit" disabled={isSubmitting || !isValid || !dirty}>
                  Save draft
                </Button>
              }
              contentId={contentId}
              lastSaved={values.updatedAt}
              onRemove={onRemove}
            >
              <div className="content-details__form">
                <div className="content-details__block --name">
                  <div className="content-details__block__title">
                    <div className="content-details__field --name">
                      <span className="text-main-reg">
                        {nameConfig?.title || ""}
                        {nameConfig?.required && "*"}
                      </span>
                      <FormikField name="name">
                        <TextInput placeholder="Enter" />
                      </FormikField>
                    </div>
                    <div className="content-details__field --type">
                      <span className="text-main-reg">
                        {subtypeConfig?.title || ""}
                        {subtypeConfig?.required && "*"}
                      </span>
                      {subtypeConfig?.values && (
                        <FormikField name="subtype">
                          <Select className="add-reward__select">
                            <option value="">Select option</option>
                            {subtypeConfig?.values.map(option => (
                              <option value={option} key={option}>
                                {capitalize(option)}
                              </option>
                            ))}
                          </Select>
                        </FormikField>
                      )}
                    </div>
                  </div>

                  {activeConfig && (
                    <div className="content-details__field --content-active">
                      <span className="text-main-reg">
                        {activeConfig.title}
                        {activeConfig?.required && "*"}
                      </span>
                      <TabsField name={activeConfig.property}>
                        <Tab value={true}>True</Tab>
                        <Tab value={false}>False</Tab>
                      </TabsField>
                    </div>
                  )}
                </div>
                {(importantConfig || openOnLoginConfig) && (
                  <div className="content-details__block --checkboxes">
                    {importantConfig && (
                      <div className="content-details__field --boolean">
                        <span className="text-main-reg">
                          {importantConfig.title}
                          {importantConfig?.required && "*"}
                        </span>
                        <span className="text-main-med colon">:</span>

                        <TabsField name={importantConfig.property}>
                          <Tab value={true}>Yes</Tab>
                          <Tab value={false}>No</Tab>
                        </TabsField>
                      </div>
                    )}
                    {openOnLoginConfig && (
                      <div className="content-details__field --boolean">
                        <span className="text-main-reg">
                          {openOnLoginConfig.title}
                          {openOnLoginConfig?.required && "*"}
                        </span>
                        <span className="text-main-med colon">:</span>

                        <TabsField name={openOnLoginConfig.property}>
                          <Tab value={true}>Yes</Tab>
                          <Tab value={false}>No</Tab>
                        </TabsField>
                      </div>
                    )}
                  </div>
                )}

                {config?.localizedFields && (
                  <div className="content-details__block --text">
                    <Expander
                      className="content-details__expander"
                      isOpen={!collapsedExpanders?.text}
                      text="Text"
                      onChange={() => handleOpenExpander("text")}
                    >
                      <TextEditor
                        content={values.content}
                        localizedFields={config.localizedFields}
                        languageOptions={languageOptions}
                        initialLanguage={initialLanguage}
                        markdownFields={getMarkdownFieldsByType(contentType)}
                        previewBanner={
                          imageConfig?.property &&
                          getContentImageSrc(brand, contentType, get(values, imageConfig.property))
                        }
                        onChangeLanguage={onChangeLanguage}
                      />
                    </Expander>
                  </div>
                )}

                {imageConfig && (
                  <div className="content-details__block">
                    <Expander
                      className="content-details__expander"
                      isOpen={!collapsedExpanders[imageConfig.property]}
                      text={`${imageConfig.title}${imageConfig.required && "*"}`}
                      onChange={() => handleOpenExpander(imageConfig.property)}
                    >
                      <div className="content-details__field --image">
                        <span className="text-tip text-main-reg">
                          {`Add an image for the ${
                            contentType === CONTENT_TYPES.email ? "cover letter." : "notification cover."
                          }`}
                        </span>
                        <FormikField name={imageConfig.property}>
                          <TextInput placeholder="Enter" onChange={e => console.log(e)} />
                        </FormikField>
                        <img
                          src={getContentImageSrc(brand, contentType, get(values, imageConfig.property))}
                          onError={hideBrokenImage}
                          alt="banner preview"
                        />
                      </div>
                    </Expander>
                  </div>
                )}

                {landerConfig && (
                  <div className="content-details__block">
                    <Expander
                      className="content-details__expander"
                      isOpen={!collapsedExpanders[landerConfig.property]}
                      text={`${landerConfig.title}${landerConfig.required && "*"}`}
                      onChange={() => handleOpenExpander(landerConfig.property)}
                    >
                      <div className="content-details__field --lander">
                        <span className="text-tip text-main-reg">
                          Add url where player goes after clicking the CTA-button.
                        </span>
                        <FormikField name={landerConfig.property}>
                          <TextInput placeholder="Enter" />
                        </FormikField>
                      </div>
                    </Expander>
                  </div>
                )}

                {!!additionallyFilteredFields.length && (
                  <div className="content-details__block">
                    <Expander
                      className="content-details__expander"
                      isOpen={!collapsedExpanders["additionally"]}
                      text={"Additionally"}
                      onChange={() => handleOpenExpander("additionally")}
                    >
                      {map(additionallyFilteredFields, field => {
                        return (
                          <div
                            className={cn("content-details__field --additionally", `--${field.property}`)}
                            key={field.property}
                          >
                            <span className="text-main-reg">
                              {field.title || ""}
                              {field?.required && "*"}
                            </span>
                            <FormikField name={field.property}>
                              {field.values ? (
                                <Select className="add-reward__select">
                                  <option value="">Select option</option>
                                  {field?.values.map(option => (
                                    <option value={option} key={option}>
                                      {capitalize(option)}
                                    </option>
                                  ))}
                                </Select>
                              ) : (
                                <TextInput placeholder="Enter" />
                              )}
                            </FormikField>
                          </div>
                        );
                      })}
                    </Expander>
                  </div>
                )}
              </div>
            </ContentDetailsLayout>
          </StyledContentDetailsForm>
        );
      }}
    </Formik>
  );
};

export { ContentForm };
