import * as React from "react";
import { useMessages } from "@brandserver-client/hooks";
import { useRegistry } from "@brandserver-client/ui";
import { Formik, Form, FormikHelpers } from "formik";
import styled from "styled-components";
import { useRouter } from "next/router";

const StyledResponsibleGaming = styled(Form)`
  h1 {
    margin: 0;
    color: ${({ theme }) => theme.palette.primary};
    ${({ theme }) => theme.typography.text21Bold};
    text-align: center;
  }

  .responsible-gaming__option {
    margin-top: 12px;

    .radio-field__label {
      ${({ theme }) => theme.typography.text16};
    }
  }

  .responsible-gaming__submit-container {
    margin-top: 24px;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .responsible-gaming__button {
    max-width: 312px;
  }

  .responsible-gaming__loader {
    height: 49px;
    width: 49px;
  }
`;

interface IProps {
  questionnaireKey: string;
  onSubmit: (id: string, data: Record<string, unknown>) => any;
}

type FormValues = {
  ltd: "yes" | "no";
};

const initialValues: FormValues = {
  ltd: "yes"
};

export const ResponsibleGaming: React.FC<IProps> = ({
  questionnaireKey,
  onSubmit
}) => {
  const { push } = useRouter();
  const { RadioField, SubmitButton, Loader } = useRegistry();
  const messages = useMessages({
    header: "forms.ltd",
    no: "forms.ltd.option-no",
    yes: "forms.ltd.option-yes",
    submit: "forms.ltd.submit"
  });

  const handleSubmit = React.useCallback(
    async (values: FormValues, formikHelpers: FormikHelpers<FormValues>) => {
      try {
        const ltd = "yes" === values.ltd;

        await onSubmit(questionnaireKey, { ltd: `${ltd}` });

        if (!ltd) {
          push("/loggedin/pages/responsible_gaming");
        }
      } catch (error) {
        console.log(error, "error");
      } finally {
        formikHelpers.setSubmitting(false);
      }
    },
    [questionnaireKey, onSubmit]
  );

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {form => (
        <StyledResponsibleGaming>
          <p>{messages.header}</p>
          <RadioField
            name="ltd"
            value="no"
            className="responsible-gaming__option"
          >
            {messages.no}
          </RadioField>
          <RadioField
            name="ltd"
            value="yes"
            className="responsible-gaming__option"
          >
            {messages.yes}
          </RadioField>
          <div className="responsible-gaming__submit-container">
            {form.isSubmitting ? (
              <Loader className="responsible-gaming__loader" />
            ) : (
              <SubmitButton
                color={SubmitButton.Color.accent}
                className="responsible-gaming__button"
              >
                {messages.submit}
              </SubmitButton>
            )}
          </div>
        </StyledResponsibleGaming>
      )}
    </Formik>
  );
};
