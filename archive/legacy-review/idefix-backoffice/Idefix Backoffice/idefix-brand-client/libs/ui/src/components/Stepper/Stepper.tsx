import React, { FC } from "react";
import cn from "classnames";
import { CheckIcon } from "@brandserver-client/icons";
import styled from "styled-components";
import { Breakpoints } from "../../breakpoints";

const StyledStepper = styled.div`
  display: flex;
  align-items: center;

  .stepper__step {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    fill: none;
    background: none;
    border: 2px solid ${({ theme }) => theme.palette.secondaryLightest};
    padding: 0;
    margin: 0;
  }

  .stepper__step--status--active {
    background: none;
    fill: none;
    border: 2px solid ${({ theme }) => theme.palette.accent};
  }

  .stepper__step--status--done {
    border: none;
    background: ${({ theme }) => theme.palette.accent};
    fill: ${({ theme }) => theme.palette.contrast};
    cursor: pointer;

    &:hover {
      background: ${({ theme }) => theme.palette.accentLightest};
    }
  }

  .stepper__path {
    width: 31px;
    height: 2px;
    margin: 0 2px;
    fill: ${({ theme }) => theme.palette.secondaryLightest};
  }

  .stepper__step--status--done + .stepper__path {
    fill: ${({ theme }) => theme.palette.accent};
  }

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    .stepper__step {
      width: 24px;
      height: 24px;
    }

    .stepper__path {
      width: 40px;
      margin: 0 3px;
    }
  }
`;

export interface StepperProps {
  activeStep: number;
  onReturn: (step: number) => void;
  className?: string;
}

const Stepper: FC<StepperProps> = ({ activeStep, onReturn, className }) => {
  return (
    <StyledStepper className={className}>
      <Step status={getStatus(1, activeStep)} onReturn={() => onReturn(1)} />
      <Path />
      <Step status={getStatus(2, activeStep)} onReturn={() => onReturn(2)} />
      <Path />
      <Step status={getStatus(3, activeStep)} onReturn={() => onReturn(3)} />
      <Path />
      <Step status={getStatus(4, activeStep)} onReturn={() => onReturn(4)} />
    </StyledStepper>
  );
};

const Path: FC = props => (
  <svg className="stepper__path" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="100%" height="100%" />
  </svg>
);

const Step: FC<{
  status: "todo" | "active" | "done";
  onReturn(): void;
}> = ({ status = "todo", onReturn }) => (
  <button
    onClick={onReturn}
    className={cn("stepper__step", `stepper__step--status--${status}`)}
    disabled={status !== "done"}
  >
    <CheckIcon />
  </button>
);

function getStatus(stepNumber: number, activeStep: number) {
  if (activeStep === stepNumber) {
    return "active";
  }

  if (activeStep > stepNumber) {
    return "done";
  }

  return "todo";
}

export { Stepper };
