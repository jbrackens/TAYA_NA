import * as React from "react";
import NextHead from "next/head";
import { CmsPageOptions } from "@brandserver-client/types";
import { useRouter } from "next/router";
import { trimLink } from "@brandserver-client/utils";

interface Props {
  pageOptions?: CmsPageOptions;
}

const NonLoggedInHead: React.FC<Props> = ({ pageOptions }) => {
  const { pathname, query, asPath } = useRouter();
  const languages = process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES
    ? process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES.split("|")
    : [];
  const brandUrl = process.env.NEXT_PUBLIC_BRAND_URL;

  const isHomePage =
    pathname === "/" && asPath.split("/").filter(el => el !== "").length === 1;

  const showAlternateLinks =
    ["terms_and_conditions", "bonusterms", "privacypolicy"].some(el =>
      asPath.split("/").includes(el)
    ) || isHomePage;

  return (
    <NextHead>
      <meta
        name="viewport"
        content="width=device-width, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"
      />
      {asPath.includes("/promo/") && (
        <link rel="canonical" href={`${brandUrl}${trimLink(asPath)}`} />
      )}
      {pathname === "/" && isHomePage && (
        <link rel="canonical" href={`${brandUrl}/${query.lang}/`} />
      )}
      {pathname === "/" && showAlternateLinks && (
        <>
          <link
            rel="alternate"
            href={isHomePage ? brandUrl : `${brandUrl}${asPath}`}
            hrefLang="x-default"
          />
          {languages.map(lang => (
            <link
              key={lang}
              rel="alternate"
              href={`${brandUrl}${asPath.replace(`${query.lang}`, `${lang}`)}/`}
              hrefLang={lang}
            />
          ))}
        </>
      )}
      {pageOptions &&
        pageOptions.headerTags &&
        pageOptions.headerTags.map(({ tag, attr, text }, index) =>
          React.createElement(tag, { ...attr, key: index }, text)
        )}
      {pageOptions && pageOptions.head && (
        <div dangerouslySetInnerHTML={{ __html: pageOptions.head }} />
      )}
    </NextHead>
  );
};

export { NonLoggedInHead };
