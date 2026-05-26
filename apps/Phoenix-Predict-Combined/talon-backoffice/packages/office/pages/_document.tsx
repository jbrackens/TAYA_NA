import NextDocument, { DocumentContext } from "next/document";
import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";

// SSR style extraction for the Pages Router. AntD v5 generates component CSS
// at runtime via cssinjs. The App Router gets this through
// @ant-design/nextjs-registry (see app/layout.tsx); Pages Router routes need
// the official per-request cache recipe here to avoid first-paint FOUC.
//
// The cache is created per request inside getInitialProps (NOT module scope),
// so styles never leak between requests.
export default class Document extends NextDocument {
  static async getInitialProps(ctx: DocumentContext) {
    const cache = createCache();
    const originalRenderPage = ctx.renderPage;

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => (props) => (
          <StyleProvider cache={cache}>
            <App {...props} />
          </StyleProvider>
        ),
      });

    const initialProps = await NextDocument.getInitialProps(ctx);
    // `plain: true` emits raw CSS text (no <style> wrapper) so this document
    // controls the element id and ordering.
    const antdStyle = extractStyle(cache, true);
    return {
      ...initialProps,
      styles: (
        <>
          {initialProps.styles}
          <style
            id="antd-cssinjs"
            dangerouslySetInnerHTML={{ __html: antdStyle }}
          />
        </>
      ),
    };
  }
}
