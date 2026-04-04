import * as React from "react";
import ReactMde from "react-mde";
import "react-mde/lib/styles/css/react-mde-all.css";
import styled from "styled-components";

import {
  EditorBold,
  EditorHeader,
  EditorImage,
  EditorItalic,
  EditorLink,
  EditorList,
  EditorNumList,
  EditorQuote
} from "../../icons";

const StyledMarkdownEditor = styled.div`
  .custom-reactMde {
    border: none;
  }
  .custom-toolbar {
    background: none;
    border: none;
    li {
      padding: 2px;
      border-radius: 8px;
      background: ${({ theme }) => theme.palette.whiteDirty};
      button {
        outline: none;
      }
      &:hover {
        background: ${({ theme }) => theme.palette.blackLight};
      }
    }
  }
  .custom-textarea {
    outline: none;
    min-height: 272px;
    border-radius: 8px;
    box-shadow: ${({ theme }) => theme.shadows.shadow1};
  }
`;

interface IProps {
  value?: string;
  onChange?: (value: string) => void;
}

const getIcon = (commandName: string) => {
  switch (commandName) {
    case "header":
      return <EditorHeader />;
    case "bold":
      return <EditorBold />;
    case "italic":
      return <EditorItalic />;
    case "quote":
      return <EditorQuote />;
    case "unordered-list":
      return <EditorList />;
    case "ordered-list":
      return <EditorNumList />;
    case "link":
      return <EditorLink />;
    case "image":
      return <EditorImage />;
    default:
      return;
  }
};

const MarkdownEditor: React.FC<IProps> = ({ value = "", onChange, ...rest }) => (
  <StyledMarkdownEditor>
    <ReactMde
      classes={{ textArea: "custom-textarea", reactMde: "custom-reactMde", toolbar: "custom-toolbar" }}
      getIcon={getIcon}
      toolbarCommands={[
        ["header", "bold", "italic"],
        ["quote", "unordered-list", "ordered-list"],
        ["link", "image"]
      ]}
      value={value}
      onChange={onChange}
      disablePreview
      {...rest}
    />
  </StyledMarkdownEditor>
);

export { MarkdownEditor };
