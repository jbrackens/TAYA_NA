import * as React from "react";
import styled from "styled-components";

import { True, False } from "../../../icons";

const StyledBooleanCell = styled.span`
  display: flex;
`;

interface IProps {
  value: boolean;
}

const BooleanCell: React.FC<IProps> = ({ value }) => (
  <StyledBooleanCell>{value ? <True /> : <False />}</StyledBooleanCell>
);

export { BooleanCell };
