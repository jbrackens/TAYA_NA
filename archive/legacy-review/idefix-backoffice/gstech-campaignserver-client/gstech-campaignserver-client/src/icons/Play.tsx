import React, { FC, SVGAttributes } from "react";

const Play: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M6.66666 4.16666V15.8333L15.8333 9.99999L6.66666 4.16666Z" fill="black" fillOpacity="0.64" />
  </svg>
);

export { Play };
