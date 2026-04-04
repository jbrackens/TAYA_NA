import * as React from "react";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { UserIcon } from "@brandserver-client/icons";
import { useMessages } from "@brandserver-client/hooks";
import styled from "styled-components";

const StyledNeteller = styled.div`
  .neteller__field--label-hidden {
    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.tablet)} {
      label {
        display: none;
      }
    }
  }
`;

interface NetellerValues {
  accountId: string;
}

interface Props {
  values: NetellerValues;
  onChange(e: React.ChangeEvent<any>): void;
  onBlur(e: React.FocusEvent<any>): void;
}

const NetellerSubForm: React.FC<Props> = ({ values, onChange, onBlur }) => {
  const { Field, TextInput } = useRegistry();

  const messages = useMessages({
    title: "my-account.deposit.neteller.title",
    accountId: "my-account.deposit.neteller.accountid",
    accountIdlaceholder: "my-account.deposit.neteller.enter-accountid"
  });

  return (
    <StyledNeteller>
      <div>
        <Field
          name="accountId"
          label={messages.accountId}
          className="neteller__field--label-hidden"
        >
          <TextInput
            className="base-input__input-component--deposit"
            name="accountId"
            type="text"
            value={values.accountId}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={messages.accountIdlaceholder}
            rightIcon={<UserIcon />}
          />
        </Field>
      </div>
    </StyledNeteller>
  );
};

export { NetellerSubForm };
