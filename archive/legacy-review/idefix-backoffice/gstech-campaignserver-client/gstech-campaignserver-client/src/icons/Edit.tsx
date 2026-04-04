import React, { FC, SVGAttributes } from "react";

const Edit: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="black" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M14.0463 3.5C13.8712 3.5 13.696 3.56669 13.5626 3.70045L12.3946 4.86842L15.1314 7.60526L16.2994 6.43729C16.5669 6.16977 16.5669 5.73662 16.2994 5.46978L14.5301 3.70045C14.3963 3.56669 14.2214 3.5 14.0463 3.5ZM11.3683 5.89474L3.5 13.7632V16.5H6.2368L14.1051 8.63158L11.3683 5.89474Z" />
  </svg>
);

export { Edit };
