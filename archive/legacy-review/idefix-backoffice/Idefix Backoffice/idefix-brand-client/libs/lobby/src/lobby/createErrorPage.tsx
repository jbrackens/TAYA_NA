import * as React from "react";
import { NextPageContext } from "next";

export type ErrorPageComponentProps = {
  statusCode: number | null;
};

const createErrorPage = (
  ErrorPageComponent: React.ComponentType<ErrorPageComponentProps>
) => {
  const ErrorPage = ({ statusCode }: ErrorPageComponentProps) => {
    return <ErrorPageComponent statusCode={statusCode} />;
  };

  ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
    // get status code either from res or err
    const statusCode = res
      ? res.statusCode
      : err
      ? (err as any).statusCode
      : null;

    return { statusCode };
  };

  return ErrorPage;
};

export { createErrorPage };
