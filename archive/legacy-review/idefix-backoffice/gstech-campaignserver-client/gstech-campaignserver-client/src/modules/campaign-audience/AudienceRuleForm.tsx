import * as React from "react";
import { useDispatch } from "react-redux";
import { FormikHelpers, Formik, FormikProps, Form } from "formik";
import styled from "styled-components";
import { toast } from "react-toastify";
import { ApiServerError, AudienceRule } from "app/types";
import { AxiosError } from "axios";

import {
  getRuleLabel,
  formatSendingDraftValues,
  formatInitialValues,
  formatSendingOperator,
  formatInitialOperator
} from "./utils";
import { Tab, Label, Loader, IconButton } from "../../components";
import { TabsField } from "../../fields";
import { Trash, Globe } from "../../icons";
import { updateRuleThunk, removeRuleThunk } from "./campaignAudienceSlice";
import { IFormValues } from "./types";
import AutoSubmit from "./components/AutoSubmit";
import NumberRule from "./components/NumberRule";
import SetRule from "./components/SetRule";
import DateRule from "./components/DateRule";
import CSVRule from "./components/CSVRule";
import ContactRule from "./components/ContactRule";
import CampaignRule from "./components/CampaignRule";
import OtherMemberRule from "./components/OtherMemberRule";
import CampaignRewardRule from "./components/CampaignRewardRule";
import LandingPageRule from "./components/LandingPageRule";
import DepositAmountRule from "./components/DepositAmountRule";
import AddedToCampaignRule from "./components/AddedToCampaignRule";
import GameManufacturerRule from "./components/GameManufacturerRule";
import DepositRule from "./components/DepositRule";
import getValidationSchema from "./getValidationSchema";
import { AppDispatch } from "../../redux";
import { fetchCampaignStats } from "../campaign-info";

const StyledAudienceRuleForm = styled(Form)`
  .campaign-rule__common-rule {
    display: flex;
    align-items: center;
    width: 100%;
  }
  .campaign-rule__label {
    min-width: auto;
  }

  .campaign-rule__loader-wrapper {
    margin-left: auto;
    width: 32px;
    height: 32px;
  }

  .campaign-rule__delete-button {
    margin-left: auto;
  }

  .campaign-rule__separator {
    &::after {
      content: ":";
      margin: 0 8px;
    }
  }
`;

interface Option {
  label: string;
  value: string | number;
}
interface Props {
  rule: AudienceRule;
  campaignId: number;
  countryOptions: Option[];
  languageOptions: Option[];
  tagOptions: Option[];
  segmentOptions: Option[];
  campaignOptions: Option[];
  landingsOptions: Option[];
  notEditable?: boolean;
  statsLoading: boolean;
}

const AudienceRuleForm: React.FC<Props> = ({
  rule,
  campaignId,
  campaignOptions,
  languageOptions,
  countryOptions,
  tagOptions,
  segmentOptions,
  landingsOptions,
  notEditable,
  statsLoading
}) => {
  const dispatch: AppDispatch = useDispatch();
  const { values, name, operator, not, id: ruleId } = rule;
  const [loading, setLoading] = React.useState(false);
  const disabled = notEditable || statsLoading || loading;

  const handleRemoveRule = React.useCallback(
    async (ruleId: number) => {
      setLoading(true);

      const removeRuleAction = await dispatch(removeRuleThunk({ campaignId, ruleId }));
      await dispatch(fetchCampaignStats(campaignId));

      if (removeRuleThunk.rejected.match(removeRuleAction)) {
        if (removeRuleAction.payload) {
          toast.error(removeRuleAction.payload.error.message);
        } else {
          toast.error(removeRuleAction.error.message);
        }
      }

      return setLoading(false);
    },
    [dispatch, campaignId]
  );

  const handleSubmit = React.useCallback(
    async (formValues: IFormValues, formikHelpers: FormikHelpers<IFormValues>) => {
      const { negated, values, name, operator, ...restValues } = formValues;
      const not = negated === "not";
      const requestDraft = {
        ...restValues,
        name,
        operator: formatSendingOperator(operator, not),
        not,
        values: operator === "csv" ? [] : formatSendingDraftValues(values, name, operator)
      };

      try {
        setLoading(true);
        await dispatch(updateRuleThunk({ campaignId, ruleId, data: requestDraft as Omit<AudienceRule, "id"> }));
        await dispatch(fetchCampaignStats(campaignId));
        setLoading(false);
      } catch (err) {
        const error: AxiosError<ApiServerError> = err;

        if (error.response) {
          toast.error(error.response.data.error.message);
        } else {
          toast.error(error.message);
        }
      } finally {
        formikHelpers.setSubmitting(false);
      }
    },
    [dispatch, campaignId, ruleId]
  );

  const initialValues: IFormValues = React.useMemo(
    () => ({
      values: formatInitialValues(values, name, operator),
      name,
      operator: formatInitialOperator(operator, not).operator,
      negated: formatInitialOperator(operator, not).not
    }),
    // eslint-disable-next-line
    []
  );
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={getValidationSchema(initialValues.name, initialValues.operator)}
      onSubmit={handleSubmit}
    >
      {(formikProps: FormikProps<IFormValues>) => {
        const { values, isSubmitting, setValues, setFieldValue } = formikProps;

        return (
          <StyledAudienceRuleForm data-testid={name}>
            <div className="campaign-rule__common-rule">
              <Label className="campaign-rule__label">{getRuleLabel(values.name, values.operator)}</Label>

              <span className="campaign-rule__separator" />
              {
                <>
                  <TabsField name="negated" disabled={disabled}>
                    <Tab value="is">is</Tab>
                    <Tab value="not" data-testid="not-tab">
                      not
                    </Tab>
                  </TabsField>

                  <span className="campaign-rule__separator" />
                </>
              }
              {values.name === "numDeposits" && (
                <NumberRule values={values} setValues={setValues} disabled={disabled} />
              )}
              {values.name === "country" && (
                <SetRule placeholder="Add country" options={countryOptions} icon={<Globe />} disabled={disabled} />
              )}
              {values.name === "language" && (
                <SetRule placeholder="Add language" options={languageOptions} icon={<Globe />} disabled={disabled} />
              )}
              {values.name === "tags" && (
                <SetRule placeholder="Add tag" options={tagOptions} creatable disabled={disabled} />
              )}
              {values.name === "segments" && (
                <SetRule placeholder="Add segment" options={segmentOptions} creatable disabled={disabled} />
              )}
              {values.name === "landingPage" && (
                <LandingPageRule options={landingsOptions} values={values} setValues={setValues} disabled={disabled} />
              )}
              {values.name === "register" && <DateRule values={values} setValues={setValues} disabled={disabled} />}
              {values.name === "deposit" && <DepositRule values={values} setValues={setValues} disabled={disabled} />}
              {values.name === "depositAmount" && (
                <DepositAmountRule values={values} setValues={setValues} disabled={disabled} />
              )}
              {values.name === "totalDepositAmount" && (
                <DepositAmountRule values={values} setValues={setValues} disabled={disabled} />
              )}
              {values.name === "login" && <DateRule values={values} setValues={setValues} disabled={disabled} />}
              {values.operator === "csv" && <CSVRule values={values} />}
              {values.name === "contact" && <ContactRule disabled={disabled} />}
              {values.name === "campaignDeposit" && (
                <CampaignRule
                  values={values}
                  options={campaignOptions}
                  placeholder="Add Campaign"
                  setValues={setValues}
                  disabled={disabled}
                />
              )}
              {values.operator === "otherCampaignsMember" && (
                <OtherMemberRule options={campaignOptions} disabled={disabled} values={values} setValues={setValues} />
              )}
              {values.operator === "otherCampaignReward" && (
                <CampaignRewardRule
                  values={values}
                  options={campaignOptions}
                  setFieldValue={setFieldValue}
                  disabled={disabled}
                />
              )}
              {values.name === "addedToCampaign" && <AddedToCampaignRule disabled={disabled} />}
              {values.operator === "gameManufacturer" && (
                <GameManufacturerRule
                  values={values}
                  setValues={setValues}
                  countries={countryOptions}
                  disabled={disabled}
                />
              )}

              {(isSubmitting || loading) && (
                <div className="campaign-rule__loader-wrapper" data-testid="loader">
                  <Loader />
                </div>
              )}

              {!(isSubmitting || loading) && (
                <IconButton
                  type="button"
                  data-testid="delete-button"
                  className="campaign-rule__delete-button"
                  onClick={() => handleRemoveRule(ruleId)}
                  disabled={disabled}
                >
                  <Trash />
                </IconButton>
              )}
            </div>

            <AutoSubmit />
          </StyledAudienceRuleForm>
        );
      }}
    </Formik>
  );
};

export default AudienceRuleForm;
