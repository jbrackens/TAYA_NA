import React, { FC, SVGAttributes } from "react";

const True: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M10 2C5.5816 2 2 5.5816 2 10C2 14.4184 5.5816 18 10 18C14.4184 18 18 14.4184 18 10C18 5.5816 14.4184 2 10 2ZM8.4 14.3312L4.6344 10.5656L5.7656 9.4344L8.4 12.0688L14.2344 6.2344L15.3656 7.3656L8.4 14.3312Z"
      fill="#4042E9"
    />
  </svg>
);

export { True };
