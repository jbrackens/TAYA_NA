import * as React from "react";
import styled from "styled-components";
import { FormattedMessage } from "react-intl";
import cn from "classnames";
import { DepositMethodOption } from "@brandserver-client/types";
import {
  Siirto,
  Saastopankki,
  SPankki,
  Pop,
  Op,
  OmaSp,
  Nordea,
  Handelsbanken,
  Danskebank,
  Alandsbanken,
  Aktia
} from "@brandserver-client/icons";

const BANK_LOGOS: {
  [key: string]: React.FC<React.SVGAttributes<SVGSVGElement>>;
} = {
  siirto: Siirto,
  saastopankki: Saastopankki,
  spankki: SPankki,
  pop: Pop,
  op: Op,
  omasp: OmaSp,
  nordea: Nordea,
  handelsbanken: Handelsbanken,
  danske: Danskebank,
  alandsbanken: Alandsbanken,
  aktia: Aktia
};

const StyledEnterCash = styled.div`
  display: flex;
  flex-direction: column;

  .title {
    margin-bottom: 20px;
    ${({ theme }) => theme.typography.text21BoldUpper};
  }

  .bank-options {
    display: flex;
    flex-wrap: wrap;
    margin-left: -22px;
  }

  .bank-option {
    margin-left: 22px;
    margin-bottom: 20px;
    cursor: pointer;
  }

  .bank-option--disable {
    cursor: default;
    opacity: 0.5;
  }

  .bank-button {
    width: 92px;
    height: 56px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: ${({ theme }) => theme.palette.secondaryLightest};
    border-radius: 5px;
    border: 0;
    padding: 8px;

    &:active {
      background: ${({ theme }) => theme.palette.secondaryLight};
    }
  }
`;

interface Props {
  isValid: boolean;
  options: DepositMethodOption[];
  onSubmit: (bankId: string) => void;
}

const EnterCashSubForm: React.FC<Props> = ({ options, isValid, onSubmit }) => {
  return (
    <StyledEnterCash>
      <label className="title">
        <FormattedMessage id="my-account.deposit.instant-banking.title" />
      </label>
      <div className="bank-options">
        {options.map(({ id }) => {
          const BankLogo = BANK_LOGOS[id];
          return (
            <button
              className={cn("bank-button bank-option", {
                "bank-option--disable": !isValid
              })}
              disabled={!isValid}
              key={id}
              type="submit"
              onClick={() => onSubmit(id)}
            >
              <BankLogo />
            </button>
          );
        })}
      </div>
    </StyledEnterCash>
  );
};

export { EnterCashSubForm };
