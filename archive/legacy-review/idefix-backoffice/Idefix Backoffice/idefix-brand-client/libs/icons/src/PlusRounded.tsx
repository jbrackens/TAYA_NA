import React, { FC, SVGAttributes } from "react";

const PlusRounded: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm6 12a1.2 1.2 0 01-1.2 1.2h-3.6v3.6a1.2 1.2 0 01-2.4 0v-3.6H7.2a1.2 1.2 0 010-2.4h3.6V7.2a1.2 1.2 0 012.4 0v3.6h3.6A1.2 1.2 0 0118 12z" />
  </svg>
);

export { PlusRounded };
