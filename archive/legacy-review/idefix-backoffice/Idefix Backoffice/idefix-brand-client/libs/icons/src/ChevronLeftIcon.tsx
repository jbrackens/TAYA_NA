import React, { FC, SVGAttributes } from "react";

const ChevronLeftIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M5 12l9.558-8.97a1.604 1.604 0 112.195 2.34L9.69 12l7.064 6.63a1.604 1.604 0 11-2.195 2.34L5 12z" />
  </svg>
);

export { ChevronLeftIcon };
