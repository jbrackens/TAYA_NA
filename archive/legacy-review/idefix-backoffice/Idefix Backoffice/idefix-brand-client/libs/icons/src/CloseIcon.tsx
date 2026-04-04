import React, { FC, SVGAttributes } from "react";

const CloseIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <path d="M20.993 5.021a1.424 1.424 0 10-2.014-2.014L12 9.986 5.021 3.007a1.424 1.424 0 10-2.014 2.014L9.986 12l-6.979 6.979a1.424 1.424 0 102.014 2.014L12 14.014l6.979 6.979a1.424 1.424 0 102.014-2.014L14.014 12l6.979-6.979z" />
  </svg>
);

export { CloseIcon };
