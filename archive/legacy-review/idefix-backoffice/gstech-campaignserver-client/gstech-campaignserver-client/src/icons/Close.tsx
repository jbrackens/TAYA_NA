import React, { FC, SVGAttributes } from "react";

const Close: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M6.64962 6L6 6.64962L9.35038 10L6 13.3504L6.64962 14L10 10.6496L13.3504 14L14 13.3504L10.6496 10L14 6.64962L13.3504 6L10 9.35038L6.64962 6Z" />
  </svg>
);

export { Close };
