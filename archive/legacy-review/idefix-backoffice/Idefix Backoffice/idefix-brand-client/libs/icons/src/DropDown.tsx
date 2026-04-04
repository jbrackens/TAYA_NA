import React, { FC, SVGAttributes } from "react";

const DropDownIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M7 10l5 6 5-6H7z" />
  </svg>
);

export { DropDownIcon };
