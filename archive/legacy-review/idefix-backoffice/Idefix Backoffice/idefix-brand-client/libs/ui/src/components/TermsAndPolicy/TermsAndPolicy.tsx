import * as React from "react";
import styled from "styled-components";
import { useMessages } from "@brandserver-client/hooks";
import { Breakpoints } from "../../breakpoints";
import { useIntl } from "react-intl";

const StyledTermsAndPrivacy = styled.div`
  text-align: center;
  font-size: 12px;

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    font-size: 14px;
  }

  & > a {
    cursor: pointer;
    color: inherit !important;
    text-decoration: underline;
  }
`;

export interface TermsAndPolicyProps {
  loggedIn?: boolean;
  className?: string;
  onLinkClick?: (src: string) => void;
}

export const TermsAndPolicy: React.FC<TermsAndPolicyProps> = ({
  loggedIn = false,
  className,
  onLinkClick
}) => {
  const intl = useIntl();
  const { agreement } = useMessages({
    agreement: "forms.pnp.complete.agreement"
  });

  const [text1, , termsAndCondText, text2, , privacyText] =
    // eslint-disable-next-line no-useless-escape
    agreement.split(/[\{\|\}]/g);

  const termsAndCond = loggedIn ? (
    <a
      // eslint-disable-next-line jsx-a11y/anchor-is-valid
      onClick={() =>
        onLinkClick &&
        onLinkClick(`/${intl.locale}/content/terms_and_conditions`)
      }
    >
      {termsAndCondText}
    </a>
  ) : (
    <a href={`/${intl.locale}/pages/terms_and_conditions`}>
      {termsAndCondText}
    </a>
  );

  const privacy = loggedIn ? (
    // eslint-disable-next-line jsx-a11y/anchor-is-valid
    <a
      onClick={() =>
        onLinkClick && onLinkClick(`/${intl.locale}/content/privacypolicy`)
      }
    >
      {privacyText}
    </a>
  ) : (
    <a href={`/${intl.locale}/pages/privacypolicy`}>{privacyText}</a>
  );

  return (
    <StyledTermsAndPrivacy className={className}>
      {text1} {termsAndCond} {text2} {privacy}
    </StyledTermsAndPrivacy>
  );
};
