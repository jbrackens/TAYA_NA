import React, { FC, SVGAttributes } from "react";

const Folder: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M26.6667 7.99992H16.0001L13.3334 5.33325H5.33341C3.86675 5.33325 2.66675 6.53325 2.66675 7.99992V23.9999C2.66675 25.4666 3.86675 26.6666 5.33341 26.6666H26.6667C28.1334 26.6666 29.3334 25.4666 29.3334 23.9999V10.6666C29.3334 9.19992 28.1334 7.99992 26.6667 7.99992Z"
      fill="black"
      fillOpacity="0.16"
    />
  </svg>
);

export { Folder };
