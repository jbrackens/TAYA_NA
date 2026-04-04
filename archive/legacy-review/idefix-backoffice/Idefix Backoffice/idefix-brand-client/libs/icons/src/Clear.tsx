import React, { FC, SVGAttributes } from "react";

const ClearIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M8 2a6 6 0 110 12A6 6 0 018 2zm1.85 3.195L8 7.045l-1.848-1.85a.675.675 0 10-.955.955L7.046 8 5.197 9.853a.675.675 0 00.955.955L8 8.957l1.85 1.85a.675.675 0 00.954-.955l-1.85-1.851 1.85-1.851a.675.675 0 10-.955-.955z" />
  </svg>
);

export { ClearIcon };
