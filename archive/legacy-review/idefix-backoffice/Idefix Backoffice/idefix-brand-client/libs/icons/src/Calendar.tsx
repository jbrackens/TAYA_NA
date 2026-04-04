import React, { FC, SVGAttributes } from "react";

const CalendarIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M19.2 3.818h-.9V2h-1.8v1.818h-9V2H5.7v1.818h-.9c-.99 0-1.8.818-1.8 1.818v14.546c0 1 .81 1.818 1.8 1.818h14.4c.99 0 1.8-.818 1.8-1.818V5.636c0-1-.81-1.818-1.8-1.818zm0 16.364H4.8V8.364h14.4v11.818z" />
  </svg>
);

export { CalendarIcon };
