"use client";

import styled from "styled-components";
import { ErrorBoundary } from "../../components/shared";
import AccessControlContainer from "../../components/access-control/AccessControlContainer";

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--t1, #1a1a1a);
`;

const PageSubtitle = styled.p`
  color: var(--t3, #8b8378);
  margin-bottom: 24px;
`;

export default function AccessControlPage() {
  return (
    <ErrorBoundary>
      <PageTitle>Access Control</PageTitle>
      <PageSubtitle>
        Manage back-office users, roles, and granular permissions.
      </PageSubtitle>
      <AccessControlContainer />
    </ErrorBoundary>
  );
}
