import React, { FC, SVGAttributes } from "react";

const ArrowFooter: FC<SVGAttributes<SVGSVGElement>> = props => {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 17l-6.27-6.608a1.117 1.117 0 011.62-1.538l4.65 4.9 4.65-4.9a1.117 1.117 0 011.62 1.538L12 17z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 22.2c5.633 0 10.2-4.567 10.2-10.2 0-5.633-4.567-10.2-10.2-10.2C6.367 1.8 1.8 6.367 1.8 12c0 5.633 4.567 10.2 10.2 10.2zm0 1.8c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z"
      />
    </svg>
  );
};

export { ArrowFooter };
