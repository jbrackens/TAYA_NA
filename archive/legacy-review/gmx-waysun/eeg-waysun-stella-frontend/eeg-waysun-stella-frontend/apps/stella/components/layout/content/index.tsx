import React, { FC } from "react";
import { Content } from "./index.styled";

export const ContentComponent: FC = ({ children }) => {
  return <Content>{children}</Content>;
};
