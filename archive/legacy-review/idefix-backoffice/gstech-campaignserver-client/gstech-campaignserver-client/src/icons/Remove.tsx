import React, { FC, SVGAttributes } from "react";

const Remove: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M5.11402 4.16666L4.16666 5.11402L9.05263 9.99999L4.16666 14.886L5.11402 15.8333L9.99999 10.9474L14.886 15.8333L15.8333 14.886L10.9474 9.99999L15.8333 5.11402L14.886 4.16666L9.99999 9.05263L5.11402 4.16666Z" />
  </svg>
);

export { Remove };
