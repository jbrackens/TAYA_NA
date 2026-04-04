import * as React from "react";
import Router, { useRouter } from "next/router";
import { useIntl } from "react-intl";
import styled from "styled-components";
import { CloseIcon } from "@brandserver-client/icons";
import { Breakpoints, useRegistry } from "@brandserver-client/ui";
import Frame from "../frame";

const StyledCMSPage = styled.div`
  background-color: ${({ theme }) => theme.palette.primary};

  .cms-page__button {
    position: fixed;
    top: 100px;
    right: 20px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      top: 80px;
    }
  }
`;

const CMSPage = () => {
  const { query } = useRouter();
  const { locale } = useIntl();

  const { IconButton } = useRegistry();

  return (
    <StyledCMSPage>
      <Frame src={`/${locale}/content/${query.slug}`} />
      <IconButton
        className="cms-page__button"
        icon={<CloseIcon />}
        action={() => Router.push(`/loggedin`)}
      />
    </StyledCMSPage>
  );
};

export { CMSPage };
