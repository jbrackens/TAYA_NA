import React, { FC, SVGAttributes } from "react";

const CheckMarkIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="8.031"
    viewBox="0 0 12 8.031"
    {...props}
  >
    <path
      d="M5140.82,366.157a0.647,0.647,0,0,0-.85,0l-7.19,6.527-2.76-2.509a0.648,0.648,0,0,0-.85,0,0.517,0.517,0,0,0,0,.771l3.19,2.894a0.645,0.645,0,0,0,.85,0l7.61-6.912A0.517,0.517,0,0,0,5140.82,366.157Z"
      transform="translate(-5129 -366)"
    />
  </svg>
);

export { CheckMarkIcon };
