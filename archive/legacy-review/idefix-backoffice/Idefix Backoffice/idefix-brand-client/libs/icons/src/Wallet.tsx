import React, { FC, SVGAttributes } from "react";

const WalletIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M4.364 0C1.97 0 0 1.971 0 4.364v23.272A4.363 4.363 0 004.364 32H29.09A2.908 2.908 0 0032 29.09V8.728a2.908 2.908 0 00-2.91-2.909H4.365a1.431 1.431 0 01-1.455-1.454c0-.822.633-1.455 1.455-1.455h21.818a1.455 1.455 0 100-2.909H4.364zm21.818 16a2.908 2.908 0 110 5.818 2.908 2.908 0 110-5.818z" />
  </svg>
);

export { WalletIcon };
