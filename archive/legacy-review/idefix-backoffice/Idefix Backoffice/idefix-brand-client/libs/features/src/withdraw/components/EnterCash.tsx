import * as React from "react";
import styled from "styled-components";
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
  Aktia,
  Zimplier
} from "@brandserver-client/icons";
import { Breakpoints } from "@brandserver-client/ui";

const StyledEnterCash = styled.div`
  display: flex;
  flex-wrap: wrap;
  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    justify-content: center;
  }

  button {
    width: 98px;
    height: 60px;
    margin-right: 32px;
    margin-bottom: 32px;
    cursor: pointer;
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

    svg {
      max-width: 80%;
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      height: 56px;
      margin-right: 24px;
      margin-bottom: 24px;
    }
  }
`;

const BANK_LOGOS = [
  { logo: Siirto, bank_name: "Siirto" },
  { logo: Op, bank_name: "OP" },
  { logo: Nordea, bank_name: "Nordea" },
  { logo: Danskebank, bank_name: "Danske Bank" },
  { logo: Saastopankki, bank_name: "Säästöpankki" },
  { logo: Aktia, bank_name: "Aktia" },
  { logo: Pop, bank_name: "POP Pankki" },
  {
    logo: Handelsbanken,
    bank_name: "Handelsbanken"
  },
  { logo: SPankki, bank_name: "S-Pankki" },
  { logo: Alandsbanken, bank_name: "Ålandsbanken" },
  { logo: OmaSp, bank_name: "OmaSP" },
  { logo: Zimplier, bank_name: "Zimpler" }
];

interface Props {
  options: DepositMethodOption[];
  handleClick: (id: string) => void;
}

export const EnterCash: React.FC<Props> = ({ options, handleClick }) => (
  <StyledEnterCash>
    {options.map(({ bank_name, id }) => {
      const BankLogo = BANK_LOGOS.find(
        bank => bank.bank_name === bank_name
      )!.logo;
      return (
        <button key={bank_name} onClick={() => handleClick(id)}>
          <BankLogo />
        </button>
      );
    })}
  </StyledEnterCash>
);
