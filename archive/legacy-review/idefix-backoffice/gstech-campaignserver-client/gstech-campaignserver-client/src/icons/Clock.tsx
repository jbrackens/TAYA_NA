import React, { FC, SVGAttributes } from "react";

const Clock: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#0000001a" {...props}>
    <path d="M16 2.66663C8.63596 2.66663 2.66663 8.63596 2.66663 16C2.66663 23.364 8.63596 29.3333 16 29.3333C23.364 29.3333 29.3333 23.364 29.3333 16C29.3333 8.63596 23.364 2.66663 16 2.66663ZM20.3906 22.276L14.6666 16.552V7.99996H17.3333V15.448L22.276 20.3906L20.3906 22.276Z" />
  </svg>
);

export { Clock };
