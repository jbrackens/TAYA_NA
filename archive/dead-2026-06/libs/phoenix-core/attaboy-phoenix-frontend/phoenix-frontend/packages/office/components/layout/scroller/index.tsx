import React from "react";
import { ScrollerStyled } from "./index.styled";

type ScrollerProps = {
  children: React.ReactNode;
};

const Scroller = ({ children }: ScrollerProps) => {
  return <ScrollerStyled>{children}</ScrollerStyled>;
};

export default Scroller;
