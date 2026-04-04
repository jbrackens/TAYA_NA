import * as React from "react";
import styled from "styled-components";

import { FabButton } from "../Button";

const StyledPageLayout = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  max-width: 1440px;
  margin: 64px auto 0;
  padding: 32px;

  .fab-button {
    position: fixed;
    bottom: 16px;
    right: 16px;
  }
`;

interface Props {
  children: React.ReactNode;
  fabButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

const PageLayout: React.FC<Props> = ({ children, fabButtonProps }) => (
  <StyledPageLayout>
    {children}
    {fabButtonProps && <FabButton className="fab-button" {...fabButtonProps} />}
  </StyledPageLayout>
);

export { PageLayout };
