import * as React from "react";
import styled from "styled-components";
import { SlideDownData } from "@brandserver-client/types";
import OpenCloseIndicator from "../OpenCloseIndicator";

const StyledCollapsibleData = styled.div`
  width: 100%;
  position: relative;
  overflow: hidden;
  cursor: pointer;

  .collapsible-question__header {
    display: flex;
    align-items: center;
  }

  .collapsible-question__question {
    ${({ theme }) => theme.typography.text18Bold}
    padding: 20px 0;
    margin-left: 16px;
    display: flex;
    align-items: center;
    color: ${({ theme }) => theme.palette.primary};
  }

  .collapsible-question__answer {
    padding-left: 36px;
    transition: max-height 0.5s, opacity 0.5s 0.3s;
  }

  .collapsible-question__answer-container {
    padding-bottom: 24px;
    color: ${({ theme }) => theme.palette.primaryLight};
    ${({ theme }) => theme.typography.text16}

    p {
      &:first-child {
        margin-top: 0;
      }
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
`;

export interface CollapsibleDataProps extends SlideDownData {
  className?: string;
}

const CollapsibleData: React.FC<CollapsibleDataProps> = ({
  title,
  content,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [answerHeight, setAnswerHeight] = React.useState<number>(0);
  const questionElement = React.useRef<HTMLDivElement>(null);
  const answerElement = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (answerElement.current) {
      setAnswerHeight(answerElement.current.scrollHeight);
    }
  }, [content]);

  return (
    <StyledCollapsibleData
      ref={questionElement}
      onClick={() => setIsOpen(!isOpen)}
      className={className}
    >
      <div className="collapsible-question__header">
        <OpenCloseIndicator isOpen={isOpen} />
        <div className="collapsible-question__question">{title}</div>
      </div>
      <div
        ref={answerElement}
        className="collapsible-question__answer"
        style={{ maxHeight: isOpen ? answerHeight : 0 }}
      >
        <div
          className="collapsible-question__answer-container"
          dangerouslySetInnerHTML={{ __html: content }}
        ></div>
      </div>
    </StyledCollapsibleData>
  );
};

export { CollapsibleData };
