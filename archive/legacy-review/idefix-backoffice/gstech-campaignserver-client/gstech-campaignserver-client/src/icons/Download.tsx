import React, { FC, SVGAttributes } from "react";

const Download: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M9.41663 4.16675C9.09463 4.16675 8.83329 4.42808 8.83329 4.75008V9.41675H6.49996L9.99996 12.9167L13.5 9.41675H11.1666V4.75008C11.1666 4.42808 10.9053 4.16675 10.5833 4.16675H9.41663ZM4.16663 14.6667V15.8334H15.8333V14.6667H4.16663Z" />
  </svg>
);

export { Download };
