import * as React from "react";
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentInitialProps
} from "next/document";
import { ServerStyleSheet } from "styled-components";
import { Config } from "@brandserver-client/types";
import {
  IntlScripts,
  LobbyNextDocumentContext
} from "@brandserver-client/lobby";
import { VieState } from "../redux";

interface DocumentProps {
  config: Config;
}

export default class MyDocument extends Document<DocumentProps> {
  static async getInitialProps(
    ctx: LobbyNextDocumentContext<VieState>
  ): Promise<DocumentInitialProps & { config?: Config }> {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: App => props => sheet.collectStyles(<App {...props} />)
        });

      const initialProps = await Document.getInitialProps(ctx);
      const serverStyles: any = (
        <>
          {initialProps.styles}
          {sheet.getStyleElement()}
        </>
      );

      if (ctx.lobby.intl && ctx.lobby.intl.locale) {
        return {
          ...initialProps,
          styles: serverStyles,
          config: ctx.lobby.config
        };
      }

      return {
        ...initialProps,
        styles: serverStyles
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    const { config: { scripts } = {}, locale } = this.props;
    return (
      <Html lang={locale}>
        <Head>
          <link rel="shortcut icon" href="/icons/favicon.svg" />
          <link
            href="https://fonts.googleapis.com/css2?family=Mulish:wght@200;300;400;700;900&display=swap"
            rel="stylesheet"
            type="text/css"
          />
          {locale && <IntlScripts locale={locale} />}
        </Head>
        <body>
          <Main />
          {scripts && scripts.length && (
            <div
              style={{ display: "none" }}
              dangerouslySetInnerHTML={{ __html: scripts.join("") }}
            />
          )}
          <script defer src="/scripts/lazysizes.min.js" />
          <script defer src="/scripts/autotrack.urlChangeTracker.js" />
          <div id="chatButton" />
          <NextScript />
        </body>
      </Html>
    );
  }
}
