import React, { FC, SVGAttributes } from "react";

const SearchIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M11.303 10.051a.5.5 0 00-.354-.146h-.25a.5.5 0 01-.35-.142l-.088-.086A5.454 5.454 0 006.02.667a5.456 5.456 0 00-3.902 9.16 5.457 5.457 0 007.556.435l.087.092a.5.5 0 01.138.345v.25a.5.5 0 00.147.355l3.686 3.677a.5.5 0 00.707 0l.54-.54a.5.5 0 000-.708l-3.677-3.682zm-5.17-.146a3.766 3.766 0 11.002-7.533 3.766 3.766 0 01-.002 7.533z" />
  </svg>
);

export { SearchIcon };
