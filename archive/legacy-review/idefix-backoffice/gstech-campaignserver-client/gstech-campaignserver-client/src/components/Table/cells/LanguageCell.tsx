import * as React from "react";
import styled from "styled-components";

import { Label } from "../../Label";

const StyledLanguageCell = styled.div`
  .language-label {
    &.isFilled {
      color: ${({ theme }) => theme.palette.black};
    }
    &:not(:first-child) {
      margin-left: 4px;
    }
  }
`;

interface IProps {
  value: { language: string; isFilled: boolean }[];
}

const LanguageCell: React.FC<IProps> = ({ value }) => (
  <StyledLanguageCell>
    {value.map(({ language, isFilled }) => (
      <Label key={language} className="language-label text-small-med" color={isFilled ? "black" : "gray"}>
        {language.toUpperCase()}
      </Label>
    ))}
  </StyledLanguageCell>
);

export { LanguageCell };
