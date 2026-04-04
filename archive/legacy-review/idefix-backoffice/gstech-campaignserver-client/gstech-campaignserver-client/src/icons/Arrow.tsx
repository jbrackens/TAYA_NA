import React, { FC, SVGAttributes } from "react";

const Arrow: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="black" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M13.8086 12.08L15.0586 10.83L10 5.77139L4.94141 10.83L6.19141 12.08L10 8.27139L13.8086 12.08Z" />
  </svg>
);

export { Arrow };
