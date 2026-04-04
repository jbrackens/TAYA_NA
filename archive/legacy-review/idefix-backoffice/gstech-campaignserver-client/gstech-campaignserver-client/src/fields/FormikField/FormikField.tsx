import * as React from "react";
import styled from "styled-components";
import { useField } from "formik";

const StyledFormikField = styled.div`
  display: flex;
  flex-direction: column;

  .formik-field__error {
    margin-top: 4px;
    color: ${({ theme }) => theme.palette.red};
  }
`;

interface Props {
  name: string;
  children: React.ReactElement;
  showError?: boolean;
  disabled?: boolean;
}

const FormikField: React.FC<Props> = ({ children, showError, disabled, ...props }) => {
  const [field, meta] = useField(props);
  const errorMessage = meta.touched && meta.error;

  return (
    <StyledFormikField>
      {React.cloneElement(children, {
        error: !!errorMessage,
        disabled,
        ...field,
        ...props
      })}
      {errorMessage && showError && <div className="text-small-reg formik-field__error">{errorMessage}</div>}
    </StyledFormikField>
  );
};

export { FormikField };
