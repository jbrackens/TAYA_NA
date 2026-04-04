import React, { FC, SVGAttributes } from "react";

const PlayIcon: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12 0C5.31429 0 0 5.31429 0 12C0 18.6857 5.31429 24 12 24C18.6857 24 24 18.6857 24 12C24 5.31429 18.6857 0 12 0ZM8.05714 15.4286V8.57143C8.05714 7.54286 9.25714 6.85714 10.1143 7.37143L15.9429 10.8C16.8 11.3143 16.8 12.6857 15.9429 13.2L10.1143 16.6286C9.08571 17.3143 8.05714 16.6286 8.05714 15.4286Z" />
  </svg>
);

export { PlayIcon };
