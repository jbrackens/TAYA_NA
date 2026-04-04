import * as React from "react";
import styled from "styled-components";
import parseISO from "date-fns/parseISO";
import { Form } from "formik";

import { PickersWrapper, TextInput } from "../../components";
import { FormikField } from "../../fields";
import { IFormValues } from "./types";
import DateField from "./components/DateField";

interface IProps {
  values: IFormValues;
  disabled?: boolean;
  withDate?: boolean;
}

const StyledCampaignInfoForm = styled(Form)`
  display: flex;
  flex-direction: column;
  flex-grow: 2;

  .campaign-details__name {
    max-width: 462px;

    & > span {
      color: ${({ theme }) => theme.palette.blackDark};
    }

    & > :nth-child(2) {
      margin-top: 8px;
    }
  }

  .campaign-details__time {
    display: flex;
    margin-top: 32px;

    & > :nth-child(2) {
      margin-left: 16px;
    }
  }
`;

export const CampaignInfoForm: React.FC<IProps> = ({ values, disabled, withDate }) => {
  const minDate = values.startTime ? parseISO(values.startTime) : null;

  return (
    <StyledCampaignInfoForm className="campaign-details-form">
      <div className="campaign-details-form__wrapper">
        <div className="campaign-details__name">
          <span className="text-main-reg">Campaign Name*</span>
          <FormikField name="name">
            <TextInput placeholder="Enter" isSubmitting={disabled} />
          </FormikField>
        </div>

        {withDate && (
          <div className="campaign-details__time">
            <PickersWrapper text="Start time" isOptional>
              <DateField name="startTime" disabled={disabled} minDate={new Date()} />
            </PickersWrapper>
            <PickersWrapper text="End time" isOptional>
              <DateField name="endTime" disabled={disabled} minDate={minDate || new Date()} />
            </PickersWrapper>
          </div>
        )}
      </div>
    </StyledCampaignInfoForm>
  );
};
