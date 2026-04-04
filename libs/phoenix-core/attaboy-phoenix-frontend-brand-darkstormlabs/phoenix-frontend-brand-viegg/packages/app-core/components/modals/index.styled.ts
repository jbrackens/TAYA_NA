import styled from "styled-components";
import { Tooltip } from "antd";
import { SelectContainer } from "../ui/form/index.styled";

export const StyledTooltip = styled(Tooltip)`
  & .ant-tooltip-inner {
    background-color: red;
  }
`;

export const StyledLink = styled.a`
  color: ${(props) => props.theme.globalForm.linkColor};
  &:hover {
    color: ${(props) => props.theme.globalForm.linkHoverColor};
  }
`;

export const FirstNameContainer = styled.div`
  width: 100%;
`;

export const DateSelectContainer = styled.div`
  display: flex;
  width: 100%;

  ${SelectContainer} {
    flex: 1;
    margin-right: ${(props) => props.theme.baseGutter}px;
    margin-bottom: 0;
    &.ant-row {
      margin-bottom: 0;
    }

    &:last-child {
      margin-right: 0;
    }
  }
`;

export const BottomMessageNoLeftMargin = styled.div`
  color: ${(props) => props.theme.globalForm.fontColor};
  text-align: center;
  margin-top: ${(props) => props.theme.baseGutter}px;
  margin-left: 0;
  font-size: ${(props) => props.theme.baseGutter}px;
  @media (max-width: 1200px) {
    margin: 0;
  }
`;
