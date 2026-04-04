import React, { FC, SVGAttributes } from "react";

const TimeIcon: FC<SVGAttributes<SVGSVGElement>> = props => {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.088 6.912A7.17 7.17 0 0012 4.8V12l-5.088 5.088c2.808 2.808 7.368 2.808 10.188 0a7.188 7.188 0 00-.012-10.176zM12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 21.6A9.597 9.597 0 012.4 12c0-5.304 4.296-9.6 9.6-9.6 5.304 0 9.6 4.296 9.6 9.6 0 5.304-4.296 9.6-9.6 9.6z" />
    </svg>
  );
};

export { TimeIcon };
