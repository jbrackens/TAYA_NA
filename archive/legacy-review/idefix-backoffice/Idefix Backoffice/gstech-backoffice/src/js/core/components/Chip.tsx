import React from "react";
import Chip, { ChipProps } from "@material-ui/core/Chip";

const style = {
  marginLeft: 8,
  backgroundColor: "rgba(242,69,61,0.08)",
  fontWeight: 500,
  fontSize: "12px",
  lineHeight: "16px",
  color: "#F2453D",
  borderRadius: 8,
  padding: 8,
};

export default ({ label, ...rest }: ChipProps) => {
  return <Chip label={label} style={style} {...rest} />;
};
