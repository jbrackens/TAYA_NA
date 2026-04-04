import { FC, ReactNode } from "react";
import {
  ResultContainer,
  IconDiv,
  TitleDiv,
  SubTitleDiv,
  ButtoneDiv,
} from "./index.styled";
import { WarningOutlined } from "@ant-design/icons";
import { Button } from "./..";

type ResultProps = {
  title: string;
  icon?: ReactNode;
  subTitle?: string;
  button?: string;
  onButtonClicked?: () => void;
};

export const Result: FC<ResultProps> = ({
  icon = <WarningOutlined />,
  title,
  subTitle,
  button = null,
  onButtonClicked,
}) => {
  return (
    <ResultContainer>
      <IconDiv>{icon}</IconDiv>
      <TitleDiv>{title}</TitleDiv>
      {subTitle && <SubTitleDiv>{subTitle}</SubTitleDiv>}
      {button && (
        <ButtoneDiv>
          <Button onClick={onButtonClicked}>{button}</Button>
        </ButtoneDiv>
      )}
    </ResultContainer>
  );
};
