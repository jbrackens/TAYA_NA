import { Row } from "antd";
import styled from "styled-components";
import { Button } from "ui";

export const MainContainer = styled.div`
  width: 100%;
  height: 100%;
`;

export const Title = styled.span`
  color: ${(props) => props.theme.content.title};
  font-size: 24px;
  font-weight: 900;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  border-radius: 10px;
`;

export const Subtitle = styled.span`
  color: ${(props) => props.theme.content.subtitle};
`;

export const Container = styled.div`
  background-color: ${(props) => props.theme.content.containerBackground};
  margin-top: 30px;
  border-radius: 10px;
`;

export const SingleSection = styled.div`
  width: 100%;
  padding-top: 15px;
  padding-bottom: 15px;
  padding: 15px 35px 22px 35px;
  border-bottom: 1px solid ${(props) => props.theme.content.divider};
  &:last-child {
    border-bottom: none;
  }
`;

export const MulitpleSectionContainer = styled(Row)`
  /* display: flex; */
  border-bottom: 1px solid ${(props) => props.theme.content.divider};
  padding: 15px 35px 22px 35px;
`;

export const MulitpleSection = styled.div`
  height: auto;
  flex-basis: 100%;
  &:nth-child(even) {
    margin-left: 18px;
  }
`;

type TitleProps = {
  titleHighlighted?: boolean;
};

export const SectionTitle = styled.div<TitleProps>`
  font-size: ${(props) => (props.titleHighlighted ? "16" : "14")}px;
  margin-bottom: 7px;
  color: ${(props) =>
    props.titleHighlighted
      ? props.theme.content.section.titleHightLighted
      : props.theme.content.section.title};
  font-weight: ${(props) => (props.titleHighlighted ? "600" : "normal")};
`;

export const Optional = styled.span`
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.57;
  letter-spacing: normal;
  opacity: 0.5;
  color: ${(props) => props.theme.content.subtitle};
`;

export const EventsFieldContainer = styled(Row)`
  margin-bottom: 15px;
`;

export const AggregationFieldContainer = styled(Row)`
  margin-bottom: 15px;
  .ant-col:last-child {
    button {
      margin-top: 35px;
    }
  }
`;

export const AddNewFieldContainer = styled.div`
  cursor: pointer;
`;

type ButtonContainerProps = {
  editMode?: boolean;
};

export const ButtonContainer = styled.div<ButtonContainerProps>`
  display: flex;
  align-items: center;
  .anticon {
    margin-right: 8px;
  }

  button:last-child {
    margin-left: auto;
  }
`;

export const ButtonRightDiv = styled.div`
  margin-left: auto;
  button,
  div {
    margin-right: 10px;
    a {
      margin-right: 10px;
    }
    &:last-child {
      margin-right: 0;
    }
  }
`;

export const CloseButton = styled(Button)``;
