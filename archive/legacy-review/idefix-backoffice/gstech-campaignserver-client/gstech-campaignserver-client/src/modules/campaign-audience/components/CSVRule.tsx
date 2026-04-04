import * as React from "react";
import styled from "styled-components";

import { IFormValues } from "../types";

const StyledCSVRule = styled.div`
  display: flex;
  max-width: 350px;

  .text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

interface IProps {
  values: IFormValues;
}

const CSVRule: React.FC<IProps> = ({ values }) => (
  <StyledCSVRule>
    <span className="text">{values.name}</span>
  </StyledCSVRule>
);

export default CSVRule;
