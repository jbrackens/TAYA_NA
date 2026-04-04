import styled from "styled-components";

export const CreatorTitle = styled.span`
  color: ${(props) => props.theme.list.title};
`;

export const RuleConfigContent = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
`;

type leftPanelProps = {
  $height?: number;
};
export const LeftPanel = styled.div<leftPanelProps>`
  padding: 30px 25px 30px 50px;
  height: ${(props) => props.$height}px;
  display: block;
  background-color: ${(props) => props.theme.layout.listBackground};
`;

export const RightPanel = styled.div`
  padding: 30px 50px;
  width: 100%;
  display: inline-table;
  position: relative;
`;

export const SuccessDiv = styled.div`
  color: ${(props) => props.theme.content.section.title};
`;

export const RuleConfigContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;
