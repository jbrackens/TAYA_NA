import React, { FC, SVGAttributes } from "react";

const Trash: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="black" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M8.75 3.33334L8.125 4.00001H5V5.33334H6.875H13.125H15V4.00001H11.875L11.25 3.33334H8.75ZM5.625 6.66668V15.3333C5.625 16.0667 6.1875 16.6667 6.875 16.6667H13.125C13.8125 16.6667 14.375 16.0667 14.375 15.3333V6.66668H5.625Z" />
  </svg>
);

export { Trash };
