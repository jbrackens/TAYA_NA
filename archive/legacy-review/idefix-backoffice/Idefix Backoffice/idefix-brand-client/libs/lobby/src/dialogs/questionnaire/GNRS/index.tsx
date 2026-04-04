import * as React from "react";
import cn from "classnames";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { useMessages } from "@brandserver-client/hooks";
import { Formik, Form } from "formik";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { getCoinIcon } from "@brandserver-client/utils";
import { getPlayer } from "../../../app";
import yup from "../../../lobby/validation";

interface FormValues {
  amount: number;
}

const initialValues: FormValues = {
  amount: 1000
};

const StyledGNRS = styled.div`
  .gnrs__title {
    ${p => p.theme.typography.text21Bold};
    color: ${p => p.theme.palette.primary};
    margin-bottom: 14px;
  }

  .gnrs__content {
    ${p => p.theme.typography.text16};
    color: ${p => p.theme.palette.primaryLight};
    margin-bottom: 40px;
  }

  .gnrs__form {
    display: flex;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      flex-direction: column;
    }
  }

  .gnrs__amount-container {
    margin-right: 40px;
    position: relative;
  }

  .gnrs__amount {
    height: 56px;
  }

  .gnrs__note {
    position: absolute;
    margin-top: 8px;
    display: none;

    &--visible {
      display: block;
    }
  }

  .gnrs__button {
    margin-top: 7px;
    height: 56px;
  }

  .gnrs__loader-container {
    margin-top: 7px;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .gnrs__loader {
    height: 56px;
    width: 56px;
  }
`;

interface Props {
  onSubmit: (id: string, data: Record<string, unknown>) => any;
}

const GNRS: React.FC<Props> = ({ onSubmit }) => {
  const [loading, setLoading] = React.useState(false);
  const messages = useMessages({
    title: "forms.gnrs.title",
    content: "forms.gnrs.content",
    note: "forms.gnrs.note",
    placeholder: "forms.gnrs.placeholder",
    accept: "forms.gnrs.accept",
    error: "forms.gnrs.error"
  });
  const { Field, AmountInput, Button, Note, Loader } = useRegistry();
  const { CurrencyISO } = useSelector(getPlayer);
  const CoinIcon = getCoinIcon(CurrencyISO);

  const validationSchema = React.useMemo(() => {
    return yup.object().shape({
      amount: yup
        .number()
        .required()
        .max(initialValues.amount)
        .label(messages.error)
    });
  }, [messages]);

  const submitLimit = async ({ amount }: FormValues) => {
    const data = { limit: amount };

    setLoading(true);
    await onSubmit("GNRS_limits", data);
    setLoading(false);
  };

  return (
    <StyledGNRS>
      <div className="gnrs__title">{messages.title}</div>
      <div className="gnrs__content">{messages.content}</div>
      <Formik
        initialValues={initialValues}
        onSubmit={submitLimit}
        validationSchema={validationSchema}
      >
        {form => (
          <Form className="gnrs__form">
            <Field name="amount" className="gnrs__amount-container">
              <AmountInput
                className="gnrs__amount"
                placeholder={messages.placeholder}
                pattern="^[0-9]*$"
                type="number"
                rightIcon={<CoinIcon />}
              />
              <Note
                className={cn("gnrs__note", {
                  "gnrs__note--visible":
                    form.values.amount <= initialValues.amount
                })}
                note={messages.note}
              />
            </Field>
            {loading ? (
              <div className="gnrs__loader-container">
                <Loader className="gnrs__loader" />
              </div>
            ) : (
              <Button className="gnrs__button" color={Button.Color.accent}>
                {messages.accept}
              </Button>
            )}
          </Form>
        )}
      </Formik>
    </StyledGNRS>
  );
};

export default GNRS;
