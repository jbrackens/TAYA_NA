import * as React from "react";
import styled from "styled-components";

const StyledNote = styled.div`
  width: 100%;
  height: 20px;
  padding-left: 5px;
  background: ${({ theme }) =>
    `linear-gradient(90deg, ${theme.palette.secondaryLightest} 0%, ${theme.palette.contrast} 100%)`};
  border-radius: 2px;
  border-left: 10px solid ${({ theme }) => theme.palette.secondaryLight};

  .note__text {
    color: ${({ theme }) => theme.palette.primary};
    ${({ theme }) => theme.typography.text12};
  }
`;

export interface NoteProps {
  note: string;
  className?: string;
}

const Note: React.FC<NoteProps> = ({ note, className }) => (
  <StyledNote className={className}>
    <div className="note__text">{note}</div>
  </StyledNote>
);

export { Note };
