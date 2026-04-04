import * as React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { trimLink } from "@brandserver-client/utils";

export const GameSeo = () => {
  const { asPath, query } = useRouter();

  const brandName = process.env.NEXT_PUBLIC_BRAND;
  const brandUrl = process.env.NEXT_PUBLIC_BRAND_URL;
  const languages = process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES
    ? process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES.split("|")
    : [];

  const canonicalPath = trimLink(asPath);
  const title = `${(query.game as string).toUpperCase()} | ${brandName}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={title} />
      <link rel="canonical" href={`${brandUrl}${canonicalPath}`} />
      <link
        rel="alternate"
        href={`${brandUrl}${asPath}`}
        hrefLang="x-default"
      />
      {languages.map(lang => (
        <link
          key={lang}
          rel="alternate"
          href={`${brandUrl}${asPath.replace(`${query.lang}`, `${lang}`)}`}
          hrefLang={lang}
        />
      ))}
    </Head>
  );
};
