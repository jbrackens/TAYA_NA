import React, { FC } from "react";
import { ErrorContainer } from "./index.styled";

type ErrorProps = {
  errors: Array<string>;
  t: (error: string) => string;
};

export const ErrorComponent: FC<ErrorProps> = ({ errors, t }) => {
  return (
    <>
      {errors.map(
        (error) =>
          error && <ErrorContainer key={error}>{t(error)}</ErrorContainer>,
      )}
    </>
  );
};
