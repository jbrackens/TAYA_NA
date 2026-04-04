import React, { FC, SVGAttributes } from "react";

const ChevronRightIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg
    width="13"
    height="20"
    viewBox="0 0 13 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M13 10L3.44205 18.9698C2.82481 19.549 1.86372 19.549 1.24648 18.9698C0.571241 18.3361 0.571241 17.2639 1.24648 16.6302L8.31147 10L1.24648 3.36977C0.57124 2.73609 0.571241 1.66391 1.24648 1.03023C1.86372 0.450974 2.82481 0.450974 3.44205 1.03023L13 10Z" />
  </svg>
);

export { ChevronRightIcon };
