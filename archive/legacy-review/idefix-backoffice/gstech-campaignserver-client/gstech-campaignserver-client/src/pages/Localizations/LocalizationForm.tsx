import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { Form, Formik, FormikProps, FormikHelpers } from "formik";
import { Content, ContentConfigByType } from "app/types";

import { Button, Expander, Tab, TextInput } from "../../components";
import { CreatableSelectField, FormikField, TabsField } from "../../fields";
import { Save } from "../../icons";
import { CONTENT_TYPES } from "../../utils/constants";
import { selectLanguageOptions } from "../../modules/app";
import {
  TextEditor,
  ContentDetailsLayout,
  createValidationSchema,
  getContentConfigField,
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

interface LocalizationFormProps {
  initialValues: Content;
  initialLanguage?: string;
  config: ContentConfigByType;
  brandId: string;
  localizationId?: number;
  onChangeLanguage: (language: string | number | string[] | boolean) => void;
  onSubmit: (values: Content, formikHelpers: FormikHelpers<Content>) => void;
  onRemove?: (contentId: number) => void;
}

const LocalizationForm: React.FC<LocalizationFormProps> = ({
  initialValues,
  initialLanguage,
  config,
  brandId,
  localizationId,
  onChangeLanguage,
  onSubmit,
  onRemove
}) => {
  const languageOptions = useSelector(selectLanguageOptions);

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
  const activeConfig = getConfigField("active");
  const brandsConfig = getConfigField("brands");
  const serverConfig = getConfigField("server");
  const formatConfig = getConfigField("format");
  const selectBrandsOptions = brandsConfig?.values?.map(id => ({ value: id, label: id })) || [];

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={createValidationSchema(config, languageOptions)}
      onSubmit={onSubmit}
    >
      {({ values, isValid, dirty, isSubmitting }: FormikProps<Content>) => (
        <StyledLandingDetailsForm>
          <ContentDetailsLayout
            backUrl={`/${brandId}/localizations`}
            contentType={CONTENT_TYPES.localization}
            submitButton={
              <Button icon={<Save />} type="submit" disabled={isSubmitting || !isValid || !dirty}>
                Save
              </Button>
            }
            contentId={localizationId}
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
            </div>
            <div className="landing-details__block">
              {activeConfig && (
                <div className="landing-details__field --boolean">
                  <span className="text-main-reg">{activeConfig.title}</span>
                  <span className="text-main-med colon">:</span>

                  <TabsField name={activeConfig.property}>
                    <Tab value={true}>True</Tab>
                    <Tab value={false}>False</Tab>
                  </TabsField>
                </div>
              )}
              {serverConfig && (
                <div className="landing-details__field --boolean">
                  <span className="text-main-reg">{serverConfig.title || ""}</span>
                  <span className="text-main-med colon">:</span>

                  <TabsField name={serverConfig.property}>
                    <Tab value={true}>True</Tab>
                    <Tab value={false}>False</Tab>
                  </TabsField>
                </div>
              )}
            </div>
            {brandsConfig && (
              <div className="landing-details__block">
                <div className="landing-details__field">
                  <span className="text-main-reg">{brandsConfig.title || ""}</span>
                  <CreatableSelectField
                    name={brandsConfig.property}
                    options={selectBrandsOptions}
                    placeholder="Enter"
                    isMulti={true}
                  />
                </div>
              </div>
            )}
            {formatConfig && (
              <div className="landing-details__block">
                <div className="landing-details__field">
                  <span className="text-main-reg">{formatConfig?.title || ""}</span>
                  <FormikField name={formatConfig.property}>
                    <TextInput placeholder="Enter" />
                  </FormikField>
                </div>
              </div>
            )}
            {config?.localizedFields && (
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
                    markdownFields={getMarkdownFieldsByType(CONTENT_TYPES.localization)}
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

export { LocalizationForm };
