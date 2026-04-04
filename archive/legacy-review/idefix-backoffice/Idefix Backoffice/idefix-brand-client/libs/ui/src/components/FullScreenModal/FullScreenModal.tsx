import * as React from "react";
import Router from "next/router";
import styled from "styled-components";
import cn from "classnames";
import { Breakpoints } from "../../breakpoints";
import { CloseIcon } from "@brandserver-client/icons";
import { useLockBodyScroll } from "@brandserver-client/hooks";
import { useRegistry } from "../../useRegistry";

export interface FullScreenModalProps {
  children: React.ReactNode;
  showCloseButton?: boolean;
  onClose?: () => void;
}

const StyledFullScreenModal = styled.div`
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: ${({ theme }) => theme.zIndex.notificationModal};
  overflow-y: auto;

  .FullScreenModal__content {
    width: 100%;
    min-height: 100%;
    padding: 80px 24px 76px;
    background: ${({ theme }) => theme.palette.secondaryLightest};
    display: flex;
    align-items: flex-start;
    justify-content: center;

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      align-items: center;
      padding: 80px 24px 102px;
    }
  }

  .FullScreenModal__card {
    padding: 25px 24px 32px;
    width: 100%;
    max-width: 680px;
    border-radius: 10px;
    box-shadow: 0px 10px 40px rgba(0, 0, 0, 0.05);
    background: ${({ theme }) => theme.palette.contrast};
  }

  .FullScreenModal__header {
    position: fixed;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 28px;
    height: 80px;
    width: 100%;

    &--sticky {
      opacity: 0.9;
      box-shadow: 0px 12px 30px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(3px);
      background: ${({ theme }) =>
        theme.palette.notificationModalStickyHeaderBackground};
      z-index: 1;
    }
  }

  .FullScreenModal__close {
    width: 24px;
    height: 24px;
    cursor: pointer;
    fill: ${({ theme }) => theme.palette.secondaryLight};

    &--white {
      fill: ${({ theme }) => theme.palette.contrast};
    }
  }
`;

const FullScreenModal: React.FC<FullScreenModalProps> = ({
  children,
  showCloseButton = true,
  onClose
}) => {
  const headerRef = React.useRef<HTMLDivElement>(null);
  const [sticky, setSticky] = React.useState(false);

  useLockBodyScroll(true);

  const { LogoNotification, StickyLogoNotification } = useRegistry();

  const handleClose = React.useCallback(() => {
    if (onClose) {
      return onClose();
    }

    Router.push("/loggedin", "/loggedin", { shallow: true });
  }, [onClose]);

  /*
    Using onScroll attribute because scroll event listener not working for element with position: fixed
  */
  const handleScroll = (event: React.UIEvent<HTMLDivElement, UIEvent>) => {
    const scrollTop = event.currentTarget.scrollTop;

    if (scrollTop > 0 && !sticky) {
      setSticky(true);
    }

    if (scrollTop === 0 && sticky) {
      setSticky(false);
    }
  };

  return (
    <StyledFullScreenModal onScroll={handleScroll}>
      <div className="FullScreenModal__content" ref={headerRef}>
        <header
          className={cn("FullScreenModal__header", {
            "FullScreenModal__header--sticky": sticky
          })}
        >
          {sticky ? <StickyLogoNotification /> : <LogoNotification />}

          {showCloseButton && (
            <CloseIcon
              className={cn("FullScreenModal__close", {
                "FullScreenModal__close--white": sticky
              })}
              onClick={handleClose}
            />
          )}
        </header>
        <div className="FullScreenModal__card">{children}</div>
      </div>
    </StyledFullScreenModal>
  );
};

export { FullScreenModal };
