import { useMessages } from "@brandserver-client/hooks";
import { useRegistry } from "@brandserver-client/ui";
import Link from "next/link";
import * as React from "react";
import { StyledRestriction } from "./styled";
import { LoginRestriction } from "@brandserver-client/types";

interface Props {
  onRemoveSelfExclusion: (exclusionKey: string) => void;
  restriction: LoginRestriction;
  language: string;
}

const Restriction: React.FC<Props> = ({
  restriction,
  onRemoveSelfExclusion,
  language
}) => {
  const { Button } = useRegistry();

  const messages = useMessages({
    title: "restrictions.title",
    requestText: restriction.permanent
      ? "restrictions.remove"
      : "restrictions.remove2",
    remove: "restrictions.remove_button",
    submit: "restrictions.pending_button"
  });

  return (
    <StyledRestriction className="restriction">
      <div className="restriction__wrapper">
        <h2 className="restriction__title">{messages.title}</h2>
        {restriction.content && restriction.content !== "" && (
          <p
            dangerouslySetInnerHTML={{ __html: restriction.content }}
            className="restriction__content"
          />
        )}
        {restriction.showRestrictionRequest && (
          <p className="restriction__request-text">{messages.requestText}</p>
        )}
      </div>
      {restriction.showRestrictionRequest && (
        <div className="restriction__button-wrap">
          <Button
            type="submit"
            color={Button.Color.accent}
            size={Button.Size.large}
            className="btn btn--secondary btn--login_exclusion"
            onClick={() => onRemoveSelfExclusion(restriction.exclusionKey)}
          >
            {messages.remove}
          </Button>
        </div>
      )}
      {!restriction.showRestrictionRequest && (
        <div className="restriction__button-wrap">
          <Link href={`/?lang=${language}`} as={`/${language}`}>
            <Button
              className="btn--login_exclusion_allowed_never"
              type="submit"
              color={Button.Color.accent}
              size={Button.Size.large}
            >
              {messages.submit}
            </Button>
          </Link>
        </div>
      )}
    </StyledRestriction>
  );
};

export default Restriction;
