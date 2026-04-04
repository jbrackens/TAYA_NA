import * as React from "react";
import styled from "styled-components";
import { Formik, Form } from "formik";
import { useMessages } from "@brandserver-client/hooks";
import { yup } from "@brandserver-client/lobby";
import { useRegistry } from "@brandserver-client/ui";
import {
  SubmitExclusion,
  LimitLength,
  LimitLengthWithText,
  Exclusion
} from "@brandserver-client/types";
import ConfirmationBlock from "./ConfirmationBlock";

const StyledTimeoutBlock = styled.div`
  .timeout-block__title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.contrast};
    margin-bottom: 16px;
  }

  .timeout-block__description {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrastDark};
    margin-bottom: 36px;
  }

  .timeout-block__buttons {
    display: flex;
    justify-content: space-between;
  }

  .timeout-block__button {
    width: 100px;
  }
`;

interface FormValues {
  limitLength: LimitLength;
}

const initialValues: FormValues = {
  limitLength: 0
};

const LIMIT_TYPE: Exclusion["limitType"] = "timeout";

interface Props {
  timeLimits: LimitLengthWithText[];
  onSubmit: (exclusion: SubmitExclusion) => void;
  className?: string;
}

const TimeoutBlock: React.FC<Props> = ({ timeLimits, className, onSubmit }) => {
  const { Button } = useRegistry();

  const messages = useMessages({
    timeoutLimit: "my-account.self-exclusion.timeout-limit",
    description: "my-account.self-exclusion.timeout-limit.description"
  });

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      limitLength: yup.number().required().oneOf([1, 7, 30])
    });
  }, [messages]);

  const handleSubmit = React.useCallback(
    (formValues: FormValues) => {
      onSubmit({
        ...formValues,
        limitType: LIMIT_TYPE
      });
    },
    [onSubmit]
  );

  return (
    <StyledTimeoutBlock className={className}>
      <div className="timeout-block__title">{messages.timeoutLimit}</div>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={validationSchema}
      >
        {form => (
          <Form>
            {form.values.limitLength ? (
              <ConfirmationBlock
                exclusion={{
                  limitType: LIMIT_TYPE,
                  limitLength: form.values.limitLength
                }}
                timeLimits={timeLimits}
                cancel={() => form.resetForm()}
                submit={form.submitForm}
              />
            ) : (
              <>
                <div className="timeout-block__description">
                  {messages.description}
                </div>
                <div className="timeout-block__buttons">
                  {timeLimits.map(limit => (
                    <Button
                      type="button"
                      className="timeout-block__button"
                      key={limit.time}
                      color={Button.Color.primaryLightest}
                      size={Button.Size.small}
                      onClick={() =>
                        form.setFieldValue("limitLength", limit.time)
                      }
                    >
                      {limit.message}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </Form>
        )}
      </Formik>
    </StyledTimeoutBlock>
  );
};

export default TimeoutBlock;
