import React, { FC, SVGAttributes } from "react";

const False: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 16.4C13.5346 16.4 16.4 13.5346 16.4 10C16.4 6.46538 13.5346 3.6 10 3.6C6.46538 3.6 3.6 6.46538 3.6 10C3.6 13.5346 6.46538 16.4 10 16.4ZM10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
      fill="black"
      fillOpacity="0.1"
    />
  </svg>
);

export { False };
