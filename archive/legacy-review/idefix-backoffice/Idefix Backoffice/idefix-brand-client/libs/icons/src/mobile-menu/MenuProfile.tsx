import React, { FC, SVGAttributes } from "react";

const MenuProfile: FC<SVGAttributes<SVGSVGElement>> = props => {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="22" cy="22" r="22" fill="#FFD2B6" />
      <path
        d="M22 22.3713C24.6485 22.3713 26.8065 19.5248 26.8065 16.8515C26.8065 14.1782 24.6485 12 22 12C19.327 12 17.1689 14.1782 17.1689 16.8515C17.1689 19.5495 19.327 22.3713 22 22.3713Z"
        fill="#FD7F33"
      />
      <path
        d="M25.6049 22.4208C24.673 23.1386 23.4959 23.5594 22.2452 23.5594H21.7302C20.4796 23.5594 19.3025 23.1386 18.3706 22.4208C15.3297 22.9406 13 25.5891 13 28.8069C13 30.5644 17.0218 32 22 32C26.9782 32 31 30.5644 31 28.8069C30.9755 25.5891 28.6458 22.9406 25.6049 22.4208Z"
        fill="#FD7F33"
      />
    </svg>
  );
};

export { MenuProfile };
