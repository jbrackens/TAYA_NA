import * as React from "react";
import styled, { useTheme } from "styled-components";
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

const StyledGamePauseBlock = styled.div`
  .game-pause-block__title {
    ${({ theme }) => theme.typography.text21BoldUpper};
    color: ${({ theme }) => theme.palette.contrast};
    margin-bottom: 16px;
  }

  .game-pause-block__description {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrastDark};
    margin-bottom: 36px;
  }

  .game-pause-block__buttons {
    display: flex;
    justify-content: space-between;
  }

  .game-pause-block__button {
    width: 100px;
  }
`;

interface Props {
  timeLimits: LimitLengthWithText[];
  onSubmit: (exclusion: SubmitExclusion) => void;
  className?: string;
}

interface FormValues {
  limitLength: LimitLength;
}

const initialValues: FormValues = {
  limitLength: 0
};

const LIMIT_TYPE: Exclusion["limitType"] = "pause";

const GamePauseBlock: React.FC<Props> = ({
  timeLimits,
  className,
  onSubmit
}) => {
  const { Button } = useRegistry();

  const messages = useMessages({
    gamePauseLimit: "my-account.self-exclusion.game-pause",
    description: "my-account.self-exclusion.game-pause.description"
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
    <StyledGamePauseBlock className={className}>
      <div className="game-pause-block__title">{messages.gamePauseLimit}</div>
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
                  limitLength: form.values.limitLength
                }}
                timeLimits={timeLimits}
                cancel={() => form.resetForm()}
                submit={form.submitForm}
              />
            ) : (
              <>
                <div className="game-pause-block__description">
                  {messages.description}
                </div>
                <div className="game-pause-block__buttons">
                  {timeLimits.map(limit => (
                    <Button
                      type="button"
                      className="game-pause-block__button"
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
    </StyledGamePauseBlock>
  );
};

export default GamePauseBlock;
