import styled from "styled-components";

type JsonContainerProps = {
  $display: boolean;
};

export const JsonContainer = styled.div<JsonContainerProps>`
  width: 100%;
  height: ${(props) => (props.$display ? "fit-content" : "0")};
  padding-top: ${(props) => (props.$display ? "15px" : "0")};
  overflow: hidden;
  transition: all 0.2s;
`;

export const ButtonSection = styled.div`
  text-align: right;
`;

type ContentSectionProps = {
  $display: boolean;
};
export const ContentSection = styled.div`
  padding: 15px;
  background: black;
  border-radius: 5px;
`;
