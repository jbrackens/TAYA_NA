import cn from "classnames";
import { useRouter } from "next/router";
import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { BetbyGame } from "@brandserver-client/features/betby";
import { Login } from "@brandserver-client/features/login";
import { VieState } from "../../redux";
import { getLoginStatus } from "@brandserver-client/lobby";
import Footer from "../Footer";
import MobileToolbar from "../Toolbar";
import { NonLoggedInHeader } from "../NonLoggedinHeader";

const StyledModalDialogs = styled.div`
  &.modal-dialogs {
    position: absolute;
    z-index: ${({ theme }) => theme.zIndex.modal};
  }

  .close-btn {
    svg {
      fill: ${({ theme }) => theme.palette.secondary};
    }
  }

  .login,
  .subform,
  .restriction {
    color: ${({ theme }) => theme.palette.primary};
  }
`;

const StyledBlurBlock = styled.div`
  &.blur {
    position: fixed;
    width: 100%;
    height: 100%;
    filter: blur(15px);
  }
`;

interface Props {
  children: React.ReactNode;
}

export const NonLoggedinLayout: React.FC<Props> = ({ children }) => {
  const router = useRouter();

  const pageOptions = useSelector((state: VieState) => state.cms.pageOptions);
  const isLoginOpen = useSelector(getLoginStatus);
  const isForgotOpen = useSelector((state: VieState) => state.login.forgot);

  const {
    query: { login, loginAgain, forgot, lang }
  } = router;

  const isBlur =
    isLoginOpen || isForgotOpen || !!login || !!loginAgain || !!forgot;

  return (
    <>
      <StyledModalDialogs className="modal-dialogs">
        <Login />
        <div id="modal-container" />
      </StyledModalDialogs>
      <StyledBlurBlock className={cn({ blur: isBlur })}>
        <NonLoggedInHeader
          hideLoginAndRegisterButtons={
            !pageOptions ||
            (pageOptions.login !== undefined && pageOptions.login === false)
          }
        />
        <BetbyGame />
        {children}
        <MobileToolbar />
        <Footer
          nonLoggedIn
          language={lang as string}
          languages={pageOptions && pageOptions.formData.languages}
        />
      </StyledBlurBlock>
    </>
  );
};
