import React from "react";
import styled from "styled-components";
import { Formik, Form, FormikHelpers } from "formik";
import { useMessages } from "@brandserver-client/hooks";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import validate from "./validate";
import { FormValues } from "./types";

const SOWStyled = styled.div`
  .sow__header {
    h1 {
      margin-top: 0;
      color: ${({ theme }) => theme.palette.primary};
      ${({ theme }) => theme.typography.text21Bold};
    }
    p {
      ${({ theme }) => theme.typography.text16};
      color: ${({ theme }) => theme.palette.primaryLight};
      margin-bottom: 0;
    }
  }

  .sow__options {
    display: flex;
    justify-content: space-between;
    margin-top: 36px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-top: 18px;
      flex-direction: column;
    }
  }
  .sow__column {
    flex: 1 1 48%;
  }
  .sow__checkbox {
    margin-bottom: 16px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-bottom: 20px;
    }
  }
  .sow__other-input {
    margin-top: 2px;
  }
  .sow__submit-container {
    margin-top: 16px;
    width: 320px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      width: 100%;
    }
  }

  .sow__footer {
    margin-top: 31px;
    ${({ theme }) => theme.typography.text14Italic};
    color: ${({ theme }) => theme.palette.primary};
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-top: 27px;
    }
  }
`;

interface Props {
  onSubmit: (id: string, data: Record<string, unknown>) => any;
}

const initialValues: FormValues = {
  options: {
    gambling: false,
    pension: false,
    savings: false,
    company: false,
    gift: false,
    property: false,
    salary: false,
    benefits: false,
    inheritance: false,
    investments: false,
    loan: false,
    other: false
  },
  explanation: ""
};

const SOW: React.FC<Props> = ({ onSubmit }) => {
  const handleSubmit = async (
    { options, explanation }: FormValues,
    formikActions: FormikHelpers<FormValues>
  ) => {
    try {
      const checkedOptions = Object.keys(options)
        .filter((option: string) => options[option])
        .join(",");

      const data = {
        source_of_wealth: checkedOptions,
        explanation
      };

      await onSubmit("SOW", data);
      formikActions.setSubmitting(false);
    } catch (error) {
      formikActions.setSubmitting(false);
    }
  };

  const messages = useMessages({
    sowHeaderHTML: "forms.sow",
    gambling: "forms.sow.options.gambling",
    pension: "forms.sow.options.pension",
    savings: "forms.sow.options.savings",
    company: "forms.sow.options.company",
    gift: "forms.sow.options.gift",
    property: "forms.sow.options.property",
    salary: "forms.sow.options.salary",
    benefits: "forms.sow.options.benefits",
    inheritance: "forms.sow.options.inheritance",
    investments: "forms.sow.options.investments",
    loan: "forms.sow.options.loan",
    other: "forms.sow.options.other",
    source: "forms.sow.source",
    submit: "forms.sow.submit",
    sowFooterHTML: "forms.sow.footer"
  });

  const { CheckboxInput, Button, TextInput } = useRegistry();

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validate={validate}
    >
      {form => (
        <SOWStyled>
          <div
            className="sow__header"
            dangerouslySetInnerHTML={{ __html: messages.sowHeaderHTML }}
          />
          <Form className="sow__form">
            <div className="sow__options">
              <div className="sow__column">
                <CheckboxInput
                  className="sow__checkbox"
                  name="options.gambling"
                >
                  {messages.gambling}
                </CheckboxInput>
                <CheckboxInput className="sow__checkbox" name="options.pension">
                  {messages.pension}
                </CheckboxInput>
                <CheckboxInput className="sow__checkbox" name="options.savings">
                  {messages.savings}
                </CheckboxInput>
                <CheckboxInput className="sow__checkbox" name="options.company">
                  {messages.company}
                </CheckboxInput>
                <CheckboxInput className="sow__checkbox" name="options.gift">
                  {messages.gift}
                </CheckboxInput>
                <CheckboxInput
                  className="sow__checkbox"
                  name="options.property"
                >
                  {messages.property}
                </CheckboxInput>
              </div>
              <div className="sow__column">
                <CheckboxInput className="sow__checkbox" name="options.salary">
                  {messages.salary}
                </CheckboxInput>
                <CheckboxInput
                  className="sow__checkbox"
                  name="options.benefits"
                >
                  {messages.benefits}
                </CheckboxInput>
                <CheckboxInput
                  className="sow__checkbox"
                  name="options.inheritance"
                >
                  {messages.inheritance}
                </CheckboxInput>
                <CheckboxInput
                  className="sow__checkbox"
                  name="options.investments"
                >
                  {messages.investments}
                </CheckboxInput>
                <CheckboxInput className="sow__checkbox" name="options.loan">
                  {messages.loan}
                </CheckboxInput>
                <CheckboxInput className="sow__checkbox" name="options.other">
                  {messages.other}
                </CheckboxInput>
              </div>
            </div>
            {form.values.options.other && (
              <TextInput
                name="explanation"
                className="sow__other-input"
                placeholder={messages.source}
              />
            )}
            <div className="sow__submit-container">
              <Button
                type="submit"
                color={Button.Color.accent}
                disabled={!form.isValid || !form.dirty || form.isSubmitting}
              >
                {messages.submit}
              </Button>
            </div>
          </Form>
          <div
            className="sow__footer"
            dangerouslySetInnerHTML={{ __html: messages.sowFooterHTML }}
          />
        </SOWStyled>
      )}
    </Formik>
  );
};

export default SOW;
