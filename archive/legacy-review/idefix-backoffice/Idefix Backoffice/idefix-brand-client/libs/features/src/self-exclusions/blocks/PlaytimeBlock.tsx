import * as React from "react";
import styled from "styled-components";
import { Formik, Form } from "formik";
import { useMessages } from "@brandserver-client/hooks";
import { yup } from "@brandserver-client/lobby";
import { useRegistry } from "@brandserver-client/ui";
import { TimeIcon } from "@brandserver-client/icons";
import {
  SubmitExclusion,
  LimitLength,
  LimitLengthWithText,
  Exclusion
} from "@brandserver-client/types";
import ConfirmationBlock from "./ConfirmationBlock";

const StyledPlaytimeBlock = styled.div`
  .playtime-block__title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.contrast};
    margin-bottom: 16px;
  }

  .playtime-block__description {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrastDark};
    margin-bottom: 36px;
  }

  .playtime-block__buttons {
    display: flex;
    justify-content: space-between;
  }

  .playtime-block__button {
    width: 100px;
  }
`;

interface Props {
  timeLimits: LimitLengthWithText[];
  onSubmit: (exclusion: SubmitExclusion) => void;
  className?: string;
}

interface FormValues {
  limitValue: string;
  limitLength: LimitLength;
}

const initialValues: FormValues = {
  limitValue: "",
  limitLength: 0
};

const LIMIT_TYPE: Exclusion["limitType"] = "play";

const PlaytimeBlock: React.FC<Props> = ({
  timeLimits,
  className,
  onSubmit
}) => {
  const { Button, TextInput, Field } = useRegistry();

  const messages = useMessages({
    playtimeLimit: "my-account.self-exclusion.playtime-limit",
    description: "my-account.self-exclusion.playtime-limit.description",
    limitPlaceholder: "my-account.self-exclusion.playtime-limit.placeholder",
    playtimeLimitError: "my-account.self-exclusion.playtime-limit.error"
  });

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      limitValue: yup.string().required().label(messages.playtimeLimitError),
      limitLength: yup.number().required().oneOf([1, 7, 30])
    });
  }, [messages]);

  const handleSubmit = React.useCallback(
    ({ limitValue, ...rest }: FormValues) => {
      onSubmit({
        ...rest,
        limitValue: Number(limitValue) * 60,
        limitType: LIMIT_TYPE
      });
    },
    [onSubmit]
  );

  return (
    <StyledPlaytimeBlock className={className}>
      <div className="playtime-block__title">{messages.playtimeLimit}</div>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {form => (
          <Form>
            {form.values.limitLength ? (
              <ConfirmationBlock
                exclusion={{
                  limitType: LIMIT_TYPE,
                  limitLength: form.values.limitLength,
                  limitValue: Number(form.values.limitValue)
                }}
                cancel={() => form.resetForm()}
                submit={form.submitForm}
              />
            ) : (
              <>
                <div className="playtime-block__description">
                  {messages.description}
                </div>
                <Field name="limitValue" label={messages.limitPlaceholder}>
                  <TextInput
                    placeholder={messages.limitPlaceholder}
                    pattern="^[0-9]*$"
                    type="number"
                    rightIcon={<TimeIcon />}
                  />
                </Field>
                <div className="playtime-block__buttons">
                  {timeLimits.map(limit => (
                    <Button
                      type="button"
                      className="playtime-block__button"
                      key={limit.time}
                      color={Button.Color.primaryLightest}
                      size={Button.Size.small}
                      disabled={!form.values["limitValue"]}
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
    </StyledPlaytimeBlock>
  );
};

export default PlaytimeBlock;
