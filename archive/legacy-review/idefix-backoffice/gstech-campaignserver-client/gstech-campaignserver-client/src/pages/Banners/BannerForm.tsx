import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { Formik, FormikProps, Form, FormikHelpers } from "formik";
import { Content, ContentConfigByType } from "app/types";
import capitalize from "lodash/capitalize";

import { FormikField, TabsField, CreatableSelectField } from "../../fields";
import { Expander, Button, TextInput, Select, Tab } from "../../components";
import {
  TextEditor,
  ContentDetailsLayout,
  createValidationSchema,
  getContentConfigField,
  getMarkdownFieldsByType
} from "../../modules/content";
import { Save } from "../../icons";
import { selectLanguageOptions } from "../../modules/app";
import { CONTENT_TYPES } from "../../utils/constants";

const StyledBannerForm = styled(Form)`
  display: flex;
  flex-direction: column;

  .banner-details__block {
    display: flex;
    width: 50%;
    margin-top: 32px;

    &--expander {
      width: 100%;

      & > .banner-details__expander {
        width: 100%;
      }
    }

    & > :not(:first-child) {
      margin-left: 16px;
    }
  }

  .banner-details__field {
    display: flex;
    flex-direction: column;
    width: 100%;
    color: ${({ theme }) => theme.palette.blackDark};

    &--type {
      width: 195px;
    }

    &--boolean {
      display: block;
      width: auto;
      margin-top: 16px;
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

    & > :last-child {
      margin-top: 8px;
    }
  }
`;

interface Props {
  brandId: string;
  bannerId?: number;
  initialValues: Content;
  initialLanguage?: string;
  config: ContentConfigByType;
  onChangeLanguage: (language: string | number | string[] | boolean) => void;
  onSubmit: (values: Content, formikHelpers: FormikHelpers<Content>) => void;
  onRemove?: (contentId: number) => void;
}

const BannerForm: React.FC<Props> = ({
  brandId,
  bannerId,
  initialValues,
  initialLanguage,
  config,
  onChangeLanguage,
  onSubmit,
  onRemove
}) => {
  const [isOpenExpander, setIsOpenExpander] = React.useState<boolean>(true);
  const languageOptions = useSelector(selectLanguageOptions);

  const getConfigField = React.useCallback(
    (name: string) => getContentConfigField(config.fields, name),
    [config.fields]
  );

  const nameConfig = getConfigField("name");
  const subtypeConfig = getConfigField("subtype");
  const activeConfig = getConfigField("active");
  const tagsConfig = getConfigField("tags");
  const location = getConfigField("location");
  const priority = getConfigField("priority");
  const weight = getConfigField("weight");
  const action = getConfigField("action");
  const bonus = getConfigField("bonus");
  const wagering = getConfigField("wageringRequirement");
  const imageConfig = getConfigField("image");

  const handleOpenExpander = React.useCallback(() => setIsOpenExpander(prev => !prev), []);

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={onSubmit}
      validationSchema={createValidationSchema(config, languageOptions)}
    >
      {({ values, isValid, dirty, isSubmitting }: FormikProps<Content>) => (
        <StyledBannerForm>
          <ContentDetailsLayout
            contentType={CONTENT_TYPES.banner}
            submitButton={
              <Button icon={<Save />} type="submit" disabled={isSubmitting || !isValid || !dirty}>
                Save
              </Button>
            }
            contentId={bannerId}
            lastSaved={values.updatedAt}
            onRemove={onRemove}
          >
            <div className="banner-details__block">
              <div className="banner-details__field banner-details__field--name">
                <span className="text-main-reg">
                  {nameConfig?.title || ""}
                  {nameConfig?.required && "*"}
                </span>
                <FormikField name="name">
                  <TextInput placeholder="Enter" />
                </FormikField>
              </div>
              <div className="banner-details__field banner-details__field--type">
                <span className="text-main-reg">
                  {subtypeConfig?.title || ""}
                  {subtypeConfig?.required && "*"}
                </span>
                {subtypeConfig?.values && (
                  <FormikField name="subtype">
                    <Select>
                      <option value="">Select option</option>
                      {subtypeConfig?.values?.map(option => (
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
              <div className="banner-details__block">
                <div className="banner-details__field banner-details__field--boolean">
                  <span className="text-main-reg">{activeConfig.title}</span>
                  <span className="text-main-med colon">:</span>

                  <TabsField name={activeConfig.property}>
                    <Tab value={true}>True</Tab>
                    <Tab value={false}>False</Tab>
                  </TabsField>
                </div>
              </div>
            )}
            {tagsConfig && (
              <div className="banner-details__block">
                <div className="banner-details__field">
                  <span className="text-main-reg">{tagsConfig.title || ""}</span>
                  <CreatableSelectField name={tagsConfig.property} options={[]} placeholder="Enter" isMulti={true} />
                </div>
              </div>
            )}
            {location && (
              <div className="banner-details__block">
                <div className="banner-details__field">
                  <span className="text-main-reg">
                    {location.title || ""}
                    {location.required && "*"}
                  </span>
                  <FormikField name={location.property}>
                    <Select>
                      <option value="">Select option</option>
                      {location?.values &&
                        //@ts-ignore  case values as { [key: string]: string }
                        location?.values[brandId].map(option => (
                          <option value={option} key={option}>
                            {capitalize(option)}
                          </option>
                        ))}
                    </Select>
                  </FormikField>
                </div>
              </div>
            )}
            <div className="banner-details__block">
              <div className="banner-details__field">
                <span className="text-main-reg">Source</span>
                <FormikField name="source">
                  <TextInput placeholder="Enter" />
                </FormikField>
              </div>
            </div>
            {bonus && (
              <div className="banner-details__block">
                <div className="banner-details__field">
                  <span className="text-main-reg">{bonus.title || ""}</span>
                  <FormikField name={bonus.property}>
                    <TextInput placeholder="Enter" />
                  </FormikField>
                </div>
              </div>
            )}
            <div className="banner-details__block">
              {priority && (
                <div className="banner-details__field">
                  <span className="text-main-reg">{priority.title || ""}</span>
                  <FormikField name={priority.property}>
                    <TextInput placeholder="Enter" />
                  </FormikField>
                </div>
              )}
              {weight && (
                <div className="banner-details__field">
                  <span className="text-main-reg">{weight.title || ""}</span>
                  <FormikField name={weight.property}>
                    <TextInput placeholder="Enter" />
                  </FormikField>
                </div>
              )}
            </div>
            {action && (
              <div className="banner-details__block">
                <div className="banner-details__field">
                  <span className="text-main-reg">{action.title || ""}</span>
                  <FormikField name={action.property}>
                    <TextInput placeholder="Enter" />
                  </FormikField>
                </div>
              </div>
            )}
            {imageConfig && (
              <div className="banner-details__block">
                <div className="banner-details__field">
                  <span className="text-main-reg">{imageConfig.title || ""}</span>
                  <FormikField name={imageConfig.property}>
                    <TextInput placeholder="Enter" />
                  </FormikField>
                </div>
              </div>
            )}
            {wagering && (
              <div className="banner-details__block">
                <div className="banner-details__field">
                  <span className="text-main-reg">{wagering.title || ""}</span>
                  <FormikField name={wagering.property}>
                    <TextInput placeholder="Enter" type={wagering.type} />
                  </FormikField>
                </div>
              </div>
            )}
            {values.subtype === "cms" ? (
              <div className="banner-details__block">
                <div className="banner-details__field">
                  <span className="text-main-reg">Loader</span>
                  <FormikField name="loader">
                    <TextInput placeholder="Enter" />
                  </FormikField>
                </div>
              </div>
            ) : (
              <div className="banner-details__block banner-details__block--expander">
                <Expander
                  className="banner-details__expander"
                  text="Text"
                  isOpen={isOpenExpander}
                  onChange={handleOpenExpander}
                >
                  {config?.localizedFields && (
                    <TextEditor
                      content={values.content}
                      localizedFields={config.localizedFields}
                      languageOptions={languageOptions}
                      initialLanguage={initialLanguage}
                      markdownFields={getMarkdownFieldsByType(CONTENT_TYPES.banner)}
                      onChangeLanguage={onChangeLanguage}
                    />
                  )}
                </Expander>
              </div>
            )}
          </ContentDetailsLayout>
        </StyledBannerForm>
      )}
    </Formik>
  );
};

export { BannerForm };
