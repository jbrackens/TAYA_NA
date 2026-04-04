import React, { FC, SVGAttributes } from "react";

const UserIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 12.371c2.649 0 4.806-2.846 4.806-5.52C16.806 4.178 14.649 2 12 2 9.327 2 7.169 4.178 7.169 6.851c0 2.699 2.158 5.52 4.831 5.52zm3.605.049a5.509 5.509 0 01-3.36 1.14h-.515a5.505 5.505 0 01-3.36-1.14A6.473 6.473 0 003 18.808C3 20.564 7.022 22 12 22s9-1.436 9-3.193a6.516 6.516 0 00-5.395-6.386z" />
  </svg>
);

export { UserIcon };
