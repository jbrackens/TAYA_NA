import styled from "styled-components";
import { List } from "antd";

export const ScrollableBetslipList = styled(List)<any>`
  @media (max-width: 1200px) {
    overflow: scroll;
    background-color: ${(props) => props.theme.betslip.backgroundColor};
    ${(props) =>
      props.$nointeract
        ? "max-height: calc(100vh - 50px)"
        : "max-height: calc(100vh - 365px)"};

    ${(props) =>
      props.$nointeract
        ? "height: calc(100vh - 50px)"
        : "height: calc(100vh - 365px)"};
  }
  ${(props) =>
    props.$nointeract
      ? "max-height: calc(100vh - 194px)"
      : "max-height: calc(100vh - 480px)"};
  overflow: scroll;
  .ant-spin {
    margin-top: 0 !important;
  }

  -ms-overflow-style: none; /* Internet Explorer 10+ */
  scrollbar-width: none; /* Firefox */
  ::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }
`;
