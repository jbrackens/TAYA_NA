import React, { FC, SVGAttributes } from "react";

const VisibilityIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 4c-2.368-.004-4.682.757-6.643 2.183C3.395 7.609 1.877 9.636 1 12c.878 2.364 2.396 4.39 4.357 5.817C7.318 19.243 9.632 20.004 12 20c2.368.004 4.682-.757 6.643-2.183C20.604 16.391 22.123 14.364 23 12c-.878-2.364-2.395-4.39-4.357-5.817C16.683 4.757 14.368 3.996 12 4zm0 13.334c-2.76 0-5-2.39-5-5.334 0-2.944 2.24-5.333 5-5.333s5 2.39 5 5.333c0 2.944-2.24 5.334-5 5.334z" />
  </svg>
);

export { VisibilityIcon };
