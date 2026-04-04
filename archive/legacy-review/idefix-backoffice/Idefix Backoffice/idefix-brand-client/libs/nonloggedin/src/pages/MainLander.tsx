import * as React from "react";
import { NextPage } from "next";
import styled from "styled-components";
import { Breakpoints } from "@brandserver-client/ui";
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { NonLoggedInHead } from "@brandserver-client/nonloggedin";
import { CmsPageOptions } from "@brandserver-client/types";
import { CmsPageLayout } from "../CmsPageLayout";
import { withCmsPageOptions } from "../withCmsPageOptions";
import { Registration } from "@brandserver-client/features/registration";

const StyledMainLander = styled.div`
  #registration-form {
    width: auto;
    max-width: 500px;
    margin: 0 auto;
  }

  .tcb-window-width {
    width: 100% !important;
  }

  .main-page__lander {
    background-color: ${({ theme }) => theme.palette.primary};
  }

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    .thrv-page-section#register .tve-page-section-in {
      z-index: ${({ theme }) => theme.zIndex.card};
    }
  }

  .shake-animation {
    animation-name: shake;
    animation-duration: 1.2s;
    animation-iteration-count: 1;
    animation-timing-function: linear;
    transform-origin: 50% 50%;
  }

  @keyframes shake {
    10% {
      transform: translateX(3px) rotate(2deg);
    }

    20% {
      transform: translateX(-3px) rotate(-2deg);
    }

    30% {
      transform: translateX(3px) rotate(2deg);
    }

    40% {
      transform: translateX(-3px) rotate(-2deg);
    }

    50% {
      transform: translateX(2px) rotate(1deg);
    }

    60% {
      transform: translateX(-2px) rotate(-1deg);
    }

    70% {
      transform: translateX(2px) rotate(1deg);
    }

    80% {
      transform: translateX(-2px) rotate(-1deg);
    }

    90% {
      transform: translateX(1px) rotate(0);
    }

    100% {
      transform: translateX(-1px) rotate(0);
    }
  }
`;

interface Props {
  locale: string;
  pageOptions: CmsPageOptions;
}

const MainLander: NextPage<Props> = ({ pageOptions, locale }) => (
  <StyledMainLander>
    <NonLoggedInHead pageOptions={pageOptions} />
    <CmsPageLayout pageOptions={pageOptions}>
      {pageOptions.formData && (
        <Registration pageOptions={pageOptions} language={locale} />
      )}
    </CmsPageLayout>
  </StyledMainLander>
);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const WrappedMainLander = withCmsPageOptions(MainLander);
