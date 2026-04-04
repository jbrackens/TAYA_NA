import React from "react";
import { BaseSpin } from "./index.styles";

export type CoreSpinProps = {
  delay?: number;
  indicator?: any;
  size?: "small" | "default" | "large" | undefined;
  spinning?: boolean;
  tip?: string;
  wrapperClassName?: any;
};

export const CoreSpin: React.FC<CoreSpinProps> = ({
  delay,
  indicator,
  size,
  spinning,
  tip,
  wrapperClassName,
  children,
  ...props
}) => {
  return (
    <BaseSpin
      delay={delay}
      indicator={indicator}
      size={size}
      spinning={spinning}
      tip={tip}
      wrapperClassName={wrapperClassName}
      {...props}
    >
      {children}
    </BaseSpin>
  );
};
