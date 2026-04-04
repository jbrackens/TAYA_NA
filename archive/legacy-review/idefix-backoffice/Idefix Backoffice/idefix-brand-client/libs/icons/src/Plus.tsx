import React, { FC, SVGAttributes } from "react";

const PlusIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <path d="M22.381 13.31a1.31 1.31 0 100-2.62H13.31V1.62a1.31 1.31 0 10-2.618 0v9.072H1.619a1.31 1.31 0 100 2.618h9.072v9.072a1.31 1.31 0 102.618 0V13.31h9.072z" />
  </svg>
);

export { PlusIcon };
