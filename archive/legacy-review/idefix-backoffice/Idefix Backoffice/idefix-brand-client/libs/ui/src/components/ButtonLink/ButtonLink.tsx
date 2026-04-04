import React, { FC, ReactNode, useMemo } from "react";
import styled from "styled-components";
import cn from "classnames";
import Link, { LinkProps } from "next/link";

export interface ButtonLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
  color?: "primary" | "secondary";
  nextLink?: boolean;
  id?: string;
}

export const ButtonLink: FC<ButtonLinkProps> = ({
  href,
  children,
  color = "primary",
  className,
  nextLink = true,
  id,
  ...restLinkProps
}) => {
  const classes = useMemo(
    () => cn(`ButtonLink_color_${color}`, className),
    [className, color]
  );

  if (!nextLink) {
    return (
      <StyledButtonLink className={classes} href={href as string} id={id}>
        {children}
      </StyledButtonLink>
    );
  }

  return (
    <Link href={href} {...restLinkProps} passHref>
      <StyledButtonLink className={classes} id={id}>
        {children}
      </StyledButtonLink>
    </Link>
  );
};

const StyledButtonLink = styled.a`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  ${({ theme }) => theme.typography.text16Bold};
  line-height: 20px;
  border-radius: 5px;
  cursor: pointer;

  &.ButtonLink_color_primary {
    color: ${({ theme }) => theme.palette.contrast};
    background: ${({ theme }) => theme.palette.accent};

    &:hover {
      background: ${({ theme }) => theme.palette.accentLight};
    }

    &:active {
      background: ${({ theme }) => theme.palette.accentDark};
    }
  }

  &.ButtonLink_color_secondary {
    color: ${({ theme }) => theme.palette.contrastLight};
    background: ${({ theme }) => theme.palette.accent2};

    &:hover {
      background: ${({ theme }) => theme.palette.accent2Light};
    }

    &:active {
      background: ${({ theme }) => theme.palette.accent2Dark};
    }
  }
`;
