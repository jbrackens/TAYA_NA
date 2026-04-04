import React, { FC, SVGAttributes } from "react";

const Forward: FC<SVGAttributes<SVGSVGElement>> = props => (
  <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M7.16699 4.45313C6.89085 4.17698 6.44313 4.17698 6.16699 4.45312C5.89085 4.72927 5.89085 5.17698 6.16699 5.45313L8.71387 8L6.16699 10.5469C5.89085 10.823 5.89085 11.2707 6.16699 11.5469C6.44313 11.823 6.89085 11.823 7.16699 11.5469L10.0068 8.70711C10.3973 8.31658 10.3973 7.68342 10.0068 7.29289L7.16699 4.45313Z" />
  </svg>
);

export { Forward };
