import cn from "classnames";
import {
  Field as FormikField,
  FieldProps as FormikFieldProps,
  FormikHelpers
} from "formik";
import React, { FC, ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  CheckIcon,
  WarningIcon,
  ArrowRightIcon
} from "@brandserver-client/icons";
import styled from "styled-components";

const StyledField = styled.div`
  width: 100%;

  .field__label-wrap {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .field__label {
    margin-right: 5px;

    ${({ theme }) => theme.typography.text14};
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
    text-transform: none;
  }

  .field__helper-text {
    ${({ theme }) => theme.typography.text14};
    color: ${({ theme }) => theme.palette.secondaryDarkest3};
  }

  .field__helper-action {
    cursor: pointer;
    display: flex;
    align-items: center;

    ${({ theme }) => theme.typography.text14Bold};
  }

  .field__helper-action-icon {
    margin-left: 2px;
    width: 11px;
    height: 11px;
    fill: ${({ theme }) => theme.palette.accent};

    &:hover {
      fill: ${({ theme }) => theme.palette.accentLight};
    }
  }

  .field__inputs {
    margin-top: 7px;
  }

  .field__message {
    display: flex;
    align-items: center;
    margin: 9px 0 3px 0;
    border-radius: 2px;

    ${({ theme }) => theme.typography.text12}

    &::before {
      content: "";
      width: 10px;
      min-height: 20px;
      align-self: stretch;
      border-radius: 2px 0 0 2px;
    }

    &--error {
      color: ${({ theme }) => theme.palette.error};
      fill: ${({ theme }) => theme.palette.error};
      background: ${({ theme }) => theme.gradients.errorMessage};

      &::before {
        background: ${({ theme }) => theme.palette.error};
      }
    }

    &--success {
      color: ${({ theme }) => theme.palette.successDark};
      fill: ${({ theme }) => theme.palette.successDark};
      background: ${({ theme }) => theme.palette.contrast};

      &::before {
        background: ${({ theme }) => theme.palette.success};
      }
    }
  }

  .field__message-icon {
    width: 10px;
    height: 10px;
    margin-left: 5px;
  }

  .field__message-text {
    margin-left: 5px;
  }

  &.field--appearance--contrast {
    .field__label-wrap {
      color: ${({ theme }) => theme.palette.contrast};
    }

    .field__message--error {
      background: ${({ theme }) =>
        `linear-gradient(90deg, ${theme.palette.contrast}, ${theme.palette.contrast})`};
    }
  }
`;

export interface FieldProps {
  name?: string;
  label?: string;
  helper?: React.ReactNode;
  className?: string;
  classes?: {
    root?: string;
    inputs?: string;
  };
  appearance?: "default" | "contrast";
  errorMessage?: string;
  successMessage?: string;
  children: ReactElement | ReactElement[];
}

const Field: FC<FieldProps> & {
  HelperText: typeof HelperText;
  HelperAction: typeof HelperAction;
} = ({
  label,
  name,
  helper,
  className,
  classes,
  appearance = "default",
  errorMessage,
  successMessage,
  children
}) => {
  const intl = useIntl();

  return (
    <FormikField name={name}>
      {({ field, form }: FormikFieldProps<{ [key: string]: string }>) => {
        const submissionError =
          form.status && form.status.errors && form.status.errors[field.name];

        let formErrorMessage;

        if (typeof form.errors[field.name] === "string") {
          formErrorMessage =
            form.errors[field.name] &&
            intl.formatMessage({ id: form.errors[field.name] as string });
        } else {
          const fieldProps = form.errors[field.name] as unknown as {
            id: string;
            defaultMessage?: string;
            values?: Record<string, React.ReactNode> | undefined;
          };

          formErrorMessage = form.errors[field.name] && (
            <FormattedMessage {...fieldProps} />
          );
        }

        const touched = form.touched[field.name];
        const error =
          submissionError || (touched && (errorMessage || formErrorMessage));

        return (
          <StyledField
            className={cn(
              className,
              classes && classes.root,
              `field--appearance--${appearance}`
            )}
          >
            <div className="field__label-wrap">
              {label && (
                <label htmlFor={name} className="field__label">
                  {label}
                </label>
              )}
              <div className="field__helper">{helper}</div>
            </div>
            <div className={cn("field__inputs", classes && classes.inputs)}>
              {
                // if Field contains name, it provide it to the child inputs. Otherwise it simply renders them.
                name
                  ? React.Children.map(children, child => {
                      if (!React.isValidElement(child)) {
                        return null;
                      }

                      return React.cloneElement(child as any, {
                        id: name,
                        name,
                        error,
                        touched
                      });
                    })
                  : children
              }
            </div>
            <div
              className={cn("field__message", {
                "field__message--error": !!error,
                "field__message--success": !!successMessage
              })}
            >
              {error && <WarningIcon className="field__message-icon" />}
              {successMessage && <CheckIcon className="field__message-icon" />}
              <span className="field__message-text">
                {error || successMessage}
              </span>
            </div>
          </StyledField>
        );
      }}
    </FormikField>
  );
};

export interface HelperTextProps {
  children: React.ReactElement | string;
  className?: string;
}

const HelperText: React.FC<HelperTextProps> = ({ className, children }) => (
  <span className={cn(className, "field__helper-text")}>{children}</span>
);

export interface HelperActionProps {
  children: React.ReactElement | string;
  className?: string;
  onClick(values: unknown, actions: FormikHelpers<unknown>): void;
}

const HelperAction: React.FC<HelperActionProps> = ({
  className,
  children,
  onClick
}) => (
  <FormikField>
    {({ form }: FormikFieldProps) => (
      <span
        className={cn(className, "field__helper-action")}
        onClick={() => onClick(form.values, form)}
      >
        {children}
        <ArrowRightIcon className="field__helper-action-icon" />
      </span>
    )}
  </FormikField>
);

Field.HelperText = HelperText;
Field.HelperAction = HelperAction;

export { Field, HelperText, HelperAction };
