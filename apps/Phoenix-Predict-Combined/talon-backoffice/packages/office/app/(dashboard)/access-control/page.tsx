"use client";

import { ErrorBoundary } from "../../components/shared";
import AccessControlContainer from "../../components/access-control/AccessControlContainer";

export default function AccessControlPage() {
  return (
    <ErrorBoundary>
      <h1 className="mb-1 text-[28px] font-bold text-[var(--t1,#1a1a1a)]">
        Access Control
      </h1>
      <p className="mb-6 text-[var(--t3,#8b8378)]">
        Manage back-office users, roles, and granular permissions.
      </p>
      <AccessControlContainer />
    </ErrorBoundary>
  );
}
