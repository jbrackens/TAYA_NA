import React, { FC, SVGAttributes } from "react";

const ArrowRightIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M10 24l14-12L10 0v24z" />
  </svg>
);

export { ArrowRightIcon };
