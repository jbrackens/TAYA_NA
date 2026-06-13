import React from "react";
import {
  StaticPageContainer,
  StyledTitle,
  StyledSubtitle,
} from "./index.styled";

type Props = {
  title: string;
  subtitle?: string;
  content: JSX.Element;
};

const StaticContentBlock: React.FC<Props> = ({ title, subtitle, content }) => {
  const isSubtitle = subtitle !== undefined;

  return (
    <StaticPageContainer>
      <StyledTitle $hasSubtitle={isSubtitle}>{title}</StyledTitle>
      {isSubtitle && <StyledSubtitle>{subtitle}</StyledSubtitle>}
      {content}
    </StaticPageContainer>
  );
};

export { StaticContentBlock };
