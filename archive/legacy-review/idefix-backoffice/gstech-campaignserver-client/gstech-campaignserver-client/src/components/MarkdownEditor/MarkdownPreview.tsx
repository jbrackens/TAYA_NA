import * as React from "react";
import Markdown, { MarkdownPreviewProps } from "@uiw/react-markdown-preview";
import styled from "styled-components";

const StyledMarkdown = styled(Markdown)`
  font-family: "Rubik", sans-serif;
  font-size: 14px;
  line-height: 20px;
  color: ${({ theme }) => theme.palette.black};
`;

const StyledHeader = styled.h3`
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
  font-size: 1.2em;
`;

const StyledStrong = styled.strong`
  font-weight: 500;
`;

const StyledItalic = styled.em`
  font-style: italic;
`;

const MarkdownPreview: React.FC<MarkdownPreviewProps> = props => (
  <StyledMarkdown components={{ strong: StyledStrong, em: StyledItalic, h3: StyledHeader }} {...props} />
);

export { MarkdownPreview };
