import React, { FC, SVGAttributes } from "react";

const ArrowDropDownIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg
    width="10"
    height="7"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M0 .5l5 5.833L10 .5H0z" />
  </svg>
);

export { ArrowDropDownIcon };
