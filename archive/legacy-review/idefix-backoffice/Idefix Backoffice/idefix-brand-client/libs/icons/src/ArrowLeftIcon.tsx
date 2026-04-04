import React, { FC, SVGAttributes } from "react";

const ArrowLeftIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M24 12C24 11.1716 23.3284 10.5 22.5 10.5H5.745L13.065 3.18001C13.6526 2.59243 13.6509 1.63926 13.0612 1.05376C12.4745 0.471184 11.5271 0.472858 10.9425 1.05751L0 12L10.942 22.942C11.5263 23.5263 12.4737 23.5263 13.058 22.942C13.6419 22.3581 13.6423 21.4115 13.0589 20.827L5.745 13.5H22.5C23.3284 13.5 24 12.8284 24 12Z" />
  </svg>
);

export { ArrowLeftIcon };
