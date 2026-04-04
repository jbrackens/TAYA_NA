import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { Form, Formik, FormikProps, FormikHelpers } from "formik";
import capitalize from "lodash/capitalize";
import get from "lodash/get";
import { Content, ContentConfigByType } from "app/types";

import { Button, Expander, Select, Tab, TextInput } from "../../components";
import { FormikField, TabsField, CreatableSelectField } from "../../fields";
import { Save } from "../../icons";
import { BRAND_NAMES, CONTENT_TYPES } from "../../utils/constants";
import { hideBrokenImage } from "../../utils/hideBrokenImage";
import { selectLanguageOptions } from "../../modules/app";
import {
  TextEditor,
  ContentDetailsLayout,
  createValidationSchema,
  getContentConfigField,
  getContentImageSrc,
  getMarkdownFieldsByType
} from "../../modules/content";

const StyledLandingDetailsForm = styled(Form)`
  display: flex;
  flex-direction: column;
  .landing-details {
    &__block {
      display: flex;
      width: 50%;
      margin-top: 32px;

      &.--name {
        display: flex;
        margin-top: 32px;
      }
      &.--text {
        width: 100%;
      }
    }

    &__field {
      display: flex;
      flex-direction: column;
      width: 100%;
      color: ${({ theme }) => theme.palette.blackDark};

      &.--name {
        flex: 3;
        margin-right: 16px;
      }
      &.--type {
        flex: 1;
      }
      & > span {
        margin-bottom: 8px;
      }

      &.--image {
        .image-tip {
          color: ${({ theme }) => theme.palette.blackMiddle};
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
    }
    &__expander {
      margin-top: 64px;
      width: 100%;
    }
  }
`;

interface LandingFormProps {
  initialValues: Content;
  initialLanguage?: string;
  config: ContentConfigByType;
  brandId: string;
  landingId?: number;
  onChangeLanguage: (language: string | number | string[] | boolean) => void;
  onSubmit: (values: Content, formikHelpers: FormikHelpers<Content>) => void;
  onRemove?: (contentId: number) => void;
}

const LandingForm: React.FC<LandingFormProps> = ({
  initialValues,
  initialLanguage,
  config,
  brandId,
  landingId,
  onChangeLanguage,
  onSubmit,
  onRemove
}) => {
  const languageOptions = useSelector(selectLanguageOptions);
  const brand = BRAND_NAMES[brandId];

  const [collapsedExpanders, setCollapsedExpanders] = React.useState<{ [key: string]: boolean }>({});

  const handleOpenExpander = React.useCallback(
    (name: string) => {
      setCollapsedExpanders({ ...collapsedExpanders, [name]: !collapsedExpanders[name] });
    },
    [collapsedExpanders]
  );

  const getConfigField = React.useCallback(
    (name: string) => config?.fields && getContentConfigField(config.fields, name),
    [config]
  );
  const nameConfig = getConfigField("name");
  const subtypeConfig = getConfigField("subtype");
  const activeConfig = getConfigField("active");
  const imageConfig = getConfigField("image");
  const locationConfig = getConfigField("location");
  const tagsConfig = getConfigField("tags");
  const bonusConfig = getConfigField("bonus");

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={createValidationSchema(config, languageOptions)}
      onSubmit={onSubmit}
    >
      {({ values, isValid, dirty, isSubmitting }: FormikProps<Content>) => (
        <StyledLandingDetailsForm>
          <ContentDetailsLayout
            backUrl={`/${brandId}/landings`}
            contentType={CONTENT_TYPES.landingPage}
            submitButton={
              <Button icon={<Save />} type="submit" disabled={isSubmitting || !isValid || !dirty}>
                Save
              </Button>
            }
            contentId={landingId}
            lastSaved={values.updatedAt}
            onRemove={onRemove}
          >
            <div className="landing-details__block">
              <div className="landing-details__field --name">
                <span className="text-main-reg">
                  {nameConfig?.title || ""}
                  {nameConfig?.required && "*"}
                </span>
                <FormikField name="name">
                  <TextInput placeholder="Enter" />
                </FormikField>
              </div>
              <div className="landing-details__field --type">
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
              <div className="landing-details__block">
                <div className="landing-details__field --boolean">
                  <span className="text-main-reg">{activeConfig.title}</span>
                  <span className="text-main-med colon">:</span>

                  <TabsField name={activeConfig.property}>
                    <Tab value={true}>True</Tab>
                    <Tab value={false}>False</Tab>
                  </TabsField>
                </div>
              </div>
            )}
            {locationConfig && (
              <div className="landing-details__block">
                <div className="landing-details__field">
                  <span className="text-main-reg">{locationConfig.title || ""}</span>
                  <FormikField name={locationConfig.property}>
                    <TextInput placeholder="Enter" />
                  </FormikField>
                </div>
              </div>
            )}
            <div className="landing-details__block">
              <div className="landing-details__field">
                <span className="text-main-reg">Source</span>
                <FormikField name="source">
                  <TextInput placeholder="Enter" />
                </FormikField>
              </div>
            </div>
            {tagsConfig && (
              <div className="landing-details__block">
                <div className="landing-details__field">
                  <span className="text-main-reg">{tagsConfig.title || ""}</span>
                  <CreatableSelectField name={tagsConfig.property} options={[]} placeholder="Enter" isMulti={true} />
                </div>
              </div>
            )}
            {bonusConfig && (
              <div className="landing-details__block">
                <div className="landing-details__field">
                  <span className="text-main-reg">{bonusConfig.title || ""}</span>
                  <FormikField name={bonusConfig.property}>
                    <TextInput placeholder="Enter" />
                  </FormikField>
                </div>
              </div>
            )}
            {values.subtype !== "cms" && imageConfig && (
              <div className="landing-details__block">
                <Expander
                  className="landing-details__expander"
                  isOpen={!collapsedExpanders[imageConfig.property]}
                  text={imageConfig.title}
                  onChange={() => handleOpenExpander(imageConfig.property)}
                >
                  <div className="landing-details__field --image">
                    <FormikField name={imageConfig.property}>
                      <TextInput placeholder="Enter" onChange={e => console.log(e)} />
                    </FormikField>
                    <img
                      src={getContentImageSrc(brand, CONTENT_TYPES.landingPage, get(values, imageConfig.property))}
                      onError={hideBrokenImage}
                      alt="banner preview"
                    />
                  </div>
                </Expander>
              </div>
            )}

            {values.subtype !== "cms" && config?.localizedFields && (
              <div className="landing-details__block --text">
                <Expander
                  className="landing-details__expander"
                  isOpen={!collapsedExpanders?.text}
                  text="Text"
                  onChange={() => handleOpenExpander("text")}
                >
                  <TextEditor
                    content={values.content}
                    localizedFields={config.localizedFields}
                    languageOptions={languageOptions}
                    initialLanguage={initialLanguage}
                    markdownFields={getMarkdownFieldsByType(CONTENT_TYPES.landingPage)}
                    previewBanner={
                      imageConfig &&
                      getContentImageSrc(brand, CONTENT_TYPES.landingPage, get(values, imageConfig.property))
                    }
                    onChangeLanguage={onChangeLanguage}
                  />
                </Expander>
              </div>
            )}
          </ContentDetailsLayout>
        </StyledLandingDetailsForm>
      )}
    </Formik>
  );
};

export { LandingForm };
