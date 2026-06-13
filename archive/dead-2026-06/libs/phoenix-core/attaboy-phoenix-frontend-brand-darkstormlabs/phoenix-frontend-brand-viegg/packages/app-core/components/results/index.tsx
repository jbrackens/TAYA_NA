import React from "react";
import { StyledResult, IconBackground } from "./index.styled";
import { Result } from "antd";
import { ResultProps } from "antd/lib/result";

export enum StatusEnum {
  SUCCESS = "success",
  ERROR = "error",
  INFO = "info",
  WARNING = "warning",
  GEOCOMPLY = "geoComply",
}

export interface StyledResultComponentProps
  extends Omit<ResultProps, "status"> {
  status:
    | StatusEnum.SUCCESS
    | StatusEnum.ERROR
    | StatusEnum.INFO
    | StatusEnum.WARNING
    | StatusEnum.GEOCOMPLY;
}

const StyledResultComponent: React.FC<StyledResultComponentProps> = ({
  status,
  ...props
}) => {
  const generateIcon = () => {
    switch (status) {
      case StatusEnum.SUCCESS:
        return (
          <IconBackground backgroundColorType={status}>
            <img src={"/images/result_check_mark.svg"} />
          </IconBackground>
        );

      case StatusEnum.ERROR:
        return (
          <IconBackground backgroundColorType={status}>
            <img src={"/images/result_x_mark.svg"} />
          </IconBackground>
        );

      case StatusEnum.INFO:
        return (
          <IconBackground backgroundColorType={status}>
            <img src={"/images/result_exclamation_mark.svg"} />
          </IconBackground>
        );
      case StatusEnum.WARNING:
        return (
          <IconBackground backgroundColorType={status}>
            <img src={"/images/result_error_mark.svg"} />
          </IconBackground>
        );
      case StatusEnum.GEOCOMPLY:
        return (
          <IconBackground backgroundColorType={status}>
            <img src={"/images/geoComply_modal_icon.svg"} />
          </IconBackground>
        );
      default:
        return (
          <IconBackground backgroundColorType={status}>
            <img src={"/images/result_exclamation_mark.svg"} />
          </IconBackground>
        );
    }
  };

  return (
    <StyledResult>
      <Result {...props} icon={generateIcon()} />
    </StyledResult>
  );
};

export { StyledResultComponent };
