/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck TODO: fix types
import React, { FC } from "react";
import { FormattedMessage } from "react-intl";

const regex = /{(.*?)}/;

export interface FormattedMessageLinkProps {
  id: string;
  href?: string;
  onClick?: (event: React.SyntheticEvent) => void;
}

export const FormattedMessageLink: FC<FormattedMessageLinkProps> = ({
  id,
  href,
  onClick
}) => {
  return (
    <FormattedMessage id={id}>
      {(chunks: any) => {
        const text = chunks[0];
        if (
          text.includes("{") &&
          text.includes("}") &&
          text.includes("link|")
        ) {
          const [before, link, ...rest] = text.split(regex);
          const [_, linkName] = link.split("|");

          return (
            <>
              {before}
              {href ? (
                <a href={href}>{linkName}</a>
              ) : (
                <a onClick={onClick}>{linkName}</a>
              )}
              {rest}
            </>
          );
        } else {
          return text;
        }
      }}
    </FormattedMessage>
  );
};
