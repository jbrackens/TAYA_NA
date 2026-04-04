import React from "react";
import styled from "styled-components";
import { useMessages } from "@brandserver-client/hooks";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";

const StyledTermsConditionsView = styled.div`
  .terms__header {
    h1 {
      margin-top: 0;
      color: ${({ theme }) => theme.palette.primary};
      ${({ theme }) => theme.typography.text21Bold};
    }

    p {
      ${({ theme }) => theme.typography.text16};
      color: ${({ theme }) => theme.palette.primaryLight};
      margin-bottom: 0;
    }
  }

  .terms__button {
    margin: 36px 0;
    width: 324px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin: 32px 0;
      width: 100%;
    }
  }

  .terms__data {
    border-bottom: 1px solid
      ${({ theme }) => theme.palette.secondarySemiLightest};

    &:last-child {
      border-bottom: none;
    }

    h3 {
      margin: 0;
    }
  }
`;

interface Props {
  content: {
    termsConditions: string;
    privacyPolicy: string;
    bonusTerms: string;
  };
  onSubmit: () => void;
}

const TermsConditionsView = ({ content, onSubmit }: Props) => {
  const messages = useMessages({
    contentHTML: "terms-update-popup.content",
    buttonAccept: "terms-update-popup.accept",
    termsConditions: "navigation.terms-conditions",
    privacyPolicy: "navigation.privacypolicy",
    bonusTerms: "navigation.bonusterms"
  });

  const { Button, CollapsibleData, FullScreenModal } = useRegistry();

  return (
    <FullScreenModal showCloseButton={false}>
      <StyledTermsConditionsView>
        <div
          className="terms__header"
          dangerouslySetInnerHTML={{ __html: messages.contentHTML }}
        />
        <Button
          color={Button.Color.accent}
          className="terms__button"
          onClick={onSubmit}
        >
          {messages.buttonAccept}
        </Button>
        <CollapsibleData
          className="terms__data"
          title={messages.termsConditions}
          content={content.termsConditions}
        />
        <CollapsibleData
          className="terms__data"
          title={messages.privacyPolicy}
          content={content.privacyPolicy}
        />
        <CollapsibleData
          className="terms__data"
          title={messages.bonusTerms}
          content={content.bonusTerms}
        />
      </StyledTermsConditionsView>
    </FullScreenModal>
  );
};

export default TermsConditionsView;
