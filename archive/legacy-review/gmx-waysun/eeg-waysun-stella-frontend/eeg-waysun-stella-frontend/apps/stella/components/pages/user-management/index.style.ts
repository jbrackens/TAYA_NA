import styled from "styled-components";
import { Button, ScrollbarStyle } from "ui";

export const StyledHeaderContainer = styled.div`
  flex-grow: 1;
`;

export const UserHeaderSection = styled.div`
  padding: 15px 50px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #1f1f1f;
  min-height: 100px;
`;

export const UserContentSection = styled.div`
  padding: 15px 50px;
`;

export const CustomButton = styled(Button)`
  font-size: 11px;
`;

export const ModalContent = styled.div`
  text-align: left;
`;

export const CustomField = styled.div`
  padding-bottom: 25px;
`;

export const WalletButtonSection = styled.div`
  display: flex;
  margin-top: 27px;
`;

export const WalletCloseButton = styled(Button)`
  margin-left: auto;
`;

export const Gray = styled.span`
  color: gray;
`;

export const ModalContentProject = styled(ModalContent)`
  margin-top: 35px;
  > div:first-child {
    padding: 0;
    background-color: transparent;
  }
`;

export const ModalContentFlex = styled(ModalContent)`
  display: flex;
  min-width: 650px;
  padding-top: 30px;
`;

export const FixedDivs = styled.div`
  flex-grow: 1;
  width: 60%;
  padding: 15px;
  border-top: 1px solid ${(props) => props.theme.uiComponents.table.borderColor};
  border-left: 0.5px solid
    ${(props) => props.theme.uiComponents.table.borderColor};
`;

export const ContextList = styled(FixedDivs)`
  max-height: 300px;
  width: 40%;
  border-right: 0.5px solid
    ${(props) => props.theme.uiComponents.table.borderColor};
  overflow: scroll;
  li {
    padding: 10px;
  }
`;

export const ProjectButtonDiv = styled.div`
  text-align: right;
  border-top: 1px solid ${(props) => props.theme.uiComponents.table.borderColor};
  padding: 20px;
`;

export const ProjectLabel = styled.label`
  display: block;
  font-size: 14px;
  color: ${(props) => props.theme.uiComponents.input.labelColor};
  margin-bottom: 8px;
`;

type ColoredSpanProps = {
  $type?: string;
};
export const ColoredSpan = styled.span<ColoredSpanProps>`
  color: ${(props) =>
    props.$type === "topUp"
      ? props.theme.wallet.positive
      : props.$type === "withdraw"
      ? props.theme.wallet.negative
      : "inherit"};
`;

export const TableContent = styled.div`
  max-height: 350px;
  ${ScrollbarStyle};
`;
