import { FC } from "react";
import { StyledLink, LinkContainer } from "./index.styled";

type LinkProps = {
  href?: string;
  fullWidth?: boolean;
  onClick?: (e: Object) => void;
};

export const Link: FC<LinkProps> = ({
  children,
  href = "",
  fullWidth = false,
  onClick,
}) => {
  const linkClicked = (e: any) => {
    e && e.preventDefault();
    onClick && onClick(e);
  };
  return (
    <LinkContainer $fullWidth={fullWidth}>
      <StyledLink href={href} onClick={linkClicked}>
        {children}
      </StyledLink>
    </LinkContainer>
  );
};
