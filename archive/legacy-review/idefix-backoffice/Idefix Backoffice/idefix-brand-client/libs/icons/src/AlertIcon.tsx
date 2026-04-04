import * as React from "react";

const AlertIcon: React.FC<React.SVGAttributes<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" {...props}>
    <path d="M8 1.5A6.5 6.5 0 111.5 8 6.51 6.51 0 018 1.5M8 0a8 8 0 108 8 8 8 0 00-8-8zM6.85 11.95a1.015 1.015 0 01.31-.787 1.18 1.18 0 01.83-.291 1.2 1.2 0 01.85.291 1.051 1.051 0 01.31.787 1.078 1.078 0 01-.31.795 1.183 1.183 0 01-.85.3 1.166 1.166 0 01-.83-.3 1.04 1.04 0 01-.31-.795zm.2-8.993h1.9v4.667l-.37 2.312H7.42l-.37-2.312V2.957z" />
  </svg>
);

export { AlertIcon };
