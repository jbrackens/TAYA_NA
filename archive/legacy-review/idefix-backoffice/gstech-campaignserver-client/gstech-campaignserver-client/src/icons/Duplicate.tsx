import React, { FC, SVGAttributes } from "react";

const Duplicate: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="black" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M5.8 3V4.4H15.6V14.2H17V4.4C17 3.6265 16.3735 3 15.6 3H5.8ZM4.4 5.8C3.6265 5.8 3 6.4265 3 7.2V15.6C3 16.3735 3.6265 17 4.4 17H12.8C13.5735 17 14.2 16.3735 14.2 15.6V7.2C14.2 6.4265 13.5735 5.8 12.8 5.8H4.4ZM7.9 8.6H9.3V10.7H11.4V12.1H9.3V14.2H7.9V12.1H5.8V10.7H7.9V8.6Z" />
  </svg>
);

export { Duplicate };
