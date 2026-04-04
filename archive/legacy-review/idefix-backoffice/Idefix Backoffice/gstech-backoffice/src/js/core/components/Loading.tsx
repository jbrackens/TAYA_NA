import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";

interface Props {
  className?: string;
  [key: string]: any;
}

export default ({ className, ...props }: Props) => (
  <div className={className}>
    <CircularProgress {...props} />
  </div>
);
