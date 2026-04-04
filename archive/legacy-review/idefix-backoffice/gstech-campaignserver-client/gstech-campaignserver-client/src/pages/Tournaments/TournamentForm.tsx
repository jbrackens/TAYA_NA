import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { Form, Formik, FormikProps, FormikHelpers } from "formik";
import { Content, ContentConfigByType } from "app/types";

import { Button, Tab, TextInput } from "../../components";
import { FormikField, TabsField, CreatableSelectField, DatePickerField } from "../../fields";
import { Save } from "../../icons";
import { CONTENT_TYPES } from "../../utils/constants";
import { selectLanguageOptions } from "../../modules/app";
import { ContentDetailsLayout, createValidationSchema, getContentConfigField } from "../../modules/content";

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
  tournamentId?: number;
  onChangeLanguage: (language: string | number | string[] | boolean) => void;
  onSubmit: (values: Content, formikHelpers: FormikHelpers<Content>) => void;
  onRemove?: (contentId: number) => void;
}

const TournamentForm: React.FC<LandingFormProps> = ({
  initialValues,
  config,
  brandId,
  tournamentId,
  onSubmit,
  onRemove
}) => {
  const languageOptions = useSelector(selectLanguageOptions);

  const getConfigField = React.useCallback(
    (name: string) => config?.fields && getContentConfigField(config.fields, name),
    [config]
  );
  const nameConfig = getConfigField("name");
  const subtypeConfig = getConfigField("subtype");
  const activeConfig = getConfigField("active");
  const startDateConfig = getConfigField("startDate");
  const endDateConfig = getConfigField("endDate");
  const promotionConfig = getConfigField("promotion");
  const brandsConfig = getConfigField("brands");
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
            backUrl={`/${brandId}/tournaments`}
            contentType={CONTENT_TYPES.tournament}
            submitButton={
              <Button icon={<Save />} type="submit" disabled={isSubmitting || !isValid || !dirty}>
                Save
              </Button>
            }
            contentId={tournamentId}
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
                <FormikField name={subtypeConfig?.property || ""}>
                  <TextInput placeholder="Enter" />
                </FormikField>
              </div>
            </div>
            {startDateConfig && endDateConfig && (
              <div className="landing-details__block">
                <div className="landing-details__field">
                  <span className="text-main-reg">
                    {startDateConfig.title || ""}
                    {startDateConfig.required && "*"}
                  </span>
                  <DatePickerField name={startDateConfig.property} minDate={new Date()} />
                </div>
                <div className="landing-details__field">
                  <span className="text-main-reg">
                    {endDateConfig.title || ""}
                    {endDateConfig.required && "*"}
                  </span>
                  <DatePickerField name={endDateConfig.property} minDate={new Date()} />
                </div>
              </div>
            )}
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
            {promotionConfig && (
              <div className="landing-details__block">
                <div className="landing-details__field">
                  <span className="text-main-reg">
                    {promotionConfig.title || ""}
                    {promotionConfig.required && "*"}
                  </span>
                  <FormikField name={promotionConfig.property}>
                    <TextInput placeholder="Enter" />
                  </FormikField>
                </div>
              </div>
            )}
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
          </ContentDetailsLayout>
        </StyledLandingDetailsForm>
      )}
    </Formik>
  );
};

export { TournamentForm };
