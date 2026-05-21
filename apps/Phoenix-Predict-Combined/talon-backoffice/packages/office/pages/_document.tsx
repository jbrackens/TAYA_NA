import NextDocument, { DocumentContext } from "next/document";
import { ServerStyleSheet } from "styled-components";
import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";

// SSR style extraction for the Pages Router. Two independent style systems
// have to be collected during the server render and inlined into the document
// <head>, or the first paint ships unstyled and flashes (FOUC) before the
// client regenerates them:
//
//   1. styled-components — via ServerStyleSheet().collectStyles (unchanged).
//   2. AntD v5 cssinjs — v5 generates component CSS at runtime via cssinjs.
//      The App Router gets this through @ant-design/nextjs-registry (see
//      app/layout.tsx). The Pages Router had NO equivalent, so v5 admin pages
//      relied on client-side style injection only — latent FOUC on a cold
//      Pages-Router-first load in production. This adds the official AntD
//      Pages-Router recipe: a per-request cssinjs cache fed by StyleProvider
//      during the server render, then extractStyle() inlined as a <style>.
//
// The cache is created per request inside getInitialProps (NOT module scope),
// so styles never leak between requests. The two enhanceApp wrappers compose:
// styled-components' collectStyles wraps the StyleProvider-wrapped app.
export default class Document extends NextDocument {
  static async getInitialProps(ctx: DocumentContext) {
    const sheet = new ServerStyleSheet();
    const cache = createCache();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) =>
            sheet.collectStyles(
              <StyleProvider cache={cache}>
                <App {...props} />
              </StyleProvider>,
            ),
        });

      const initialProps = await NextDocument.getInitialProps(ctx);
      // `plain: true` emits the raw CSS text (no <style> wrapper) so we can
      // control the element + id ourselves and keep ordering after the
      // styled-components sheet.
      const antdStyle = extractStyle(cache, true);
      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {sheet.getStyleElement()}
            <style
              id="antd-cssinjs"
              dangerouslySetInnerHTML={{ __html: antdStyle }}
            />
          </>
        ),
      };
    } finally {
      sheet.seal();
    }
  }
}
