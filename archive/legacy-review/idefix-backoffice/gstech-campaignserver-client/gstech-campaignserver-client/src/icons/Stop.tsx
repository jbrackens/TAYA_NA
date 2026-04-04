import React, { FC, SVGAttributes } from "react";

const Stop: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M4.16666 4.16666V15.8333H15.8333V4.16666H4.16666Z" fill="black" fillOpacity="0.64" />
  </svg>
);

export { Stop };
