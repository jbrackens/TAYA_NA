import React, { FC, SVGAttributes } from "react";

const Info: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="black" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M10 3C6.1339 3 3 6.1339 3 10C3 13.8661 6.1339 17 10 17C13.8661 17 17 13.8661 17 10C17 6.1339 13.8661 3 10 3ZM10.7 13.5H9.3V9.3H10.7V13.5ZM10.7 7.9H9.3V6.5H10.7V7.9Z" />
  </svg>
);

export { Info };
