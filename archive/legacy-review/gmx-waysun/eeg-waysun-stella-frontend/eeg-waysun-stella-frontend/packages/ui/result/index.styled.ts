import styled from "styled-components";

type ResultContainerProps = {};

export const ResultContainer = styled.div<ResultContainerProps>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
`;
export const IconDiv = styled.div`
  svg {
    color: ${(props) => props.theme.uiComponents.result.iconColor};
    width: 60px;
    height: auto;
  }
`;
export const TitleDiv = styled.div`
  margin-top: 26px;
  font-size: 27px;
`;

export const SubTitleDiv = styled.div`
  margin-top: 18px;
  font-size: 18px;
`;

export const ButtoneDiv = styled.div`
  margin-top: 26px;
`;
