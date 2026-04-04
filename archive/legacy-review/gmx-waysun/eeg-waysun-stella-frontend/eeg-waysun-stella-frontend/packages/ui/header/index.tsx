import { FC } from "react";
import { StyledHeader } from "./index.styled";

type HeaderProps = {
  type?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  size?: "large" | "medium" | "small";
  variation?: "primary" | "secondary";
  customFontSize?: number;
};

export const Header: FC<HeaderProps> = ({
  children,
  type = "h1",
  size = "large",
  variation = "primary",
  customFontSize = 0
}) => {
  return (
    <StyledHeader as={type} $size={size} $variation={variation} $customFontSize={customFontSize}>
      {children}
    </StyledHeader>
  );
};

Header.defaultProps = {};
