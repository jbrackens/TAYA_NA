import React, { FC } from "react";

interface Props {
  locale: string;
}

export const IntlScripts: FC<Props> = ({ locale }) => {
  return (
    <>
      <script
        src={`https://cdn.polyfill.io/v3/polyfill.min.js?features=Intl.~locale.${locale}`}
      />
      <script
        src={`https://cdn.polyfill.io/v3/polyfill.min.js?features=Intl.PluralRules,Intl.PluralRules.~locale.${locale}`}
      />
      <script
        src={`https://cdn.polyfill.io/v3/polyfill.min.js?features=Intl.RelativeTimeFormat,Intl.RelativeTimeFormat.~locale.${locale}`}
      />
    </>
  );
};
