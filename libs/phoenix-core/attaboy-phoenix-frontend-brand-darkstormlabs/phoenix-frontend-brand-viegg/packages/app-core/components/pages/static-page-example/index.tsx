import Head from "next/head";
import { useTranslation } from "i18n";
import { defaultNamespaces } from "../defaults";
import { StaticContentBlock } from "../../static-page";

function StaticPageExample() {
  const { t } = useTranslation(["page-about"]);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <>
        <StaticContentBlock
          title={t("TITLE")}
          content={
            <>
              <p>example paragraph</p>
              <h5>example h5</h5>
              <p>
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
                in reprehenderit in voluptate velit esse cillum dolore eu fugiat
                nulla pariatur. Excepteur sint occaecat cupidatat non proident,
                sunt in culpa qui officia deserunt mollit anim id est laborum."
              </p>
              <ol>
                <li>ordered list elelement 1</li>
                <li>ordered list elelement 2</li>
                <li>ordered list elelement 3</li>
                <li>ordered list elelement 4</li>
                <li>ordered list elelement 5</li>
                <li>ordered list elelement 6</li>
                <li>ordered list elelement 7</li>
                <li>ordered list elelement 8</li>
                <li>ordered list elelement 9</li>
                <li>ordered list elelement 10</li>
                <li>ordered list elelement 12</li>
                <li>ordered list elelement 13</li>
              </ol>
              <ul>
                <li>example list element 1</li>
                <li>example list element 2</li>
                <li>example list element 3</li>
              </ul>
              <table>
                <tr>
                  <th>Example th1</th>
                  <th>Example th2</th>
                </tr>
                <tr>
                  <td>example td 1</td>
                  <td>example td 2</td>
                </tr>
                <tr>
                  <td>example td 3</td>
                  <td>example td 4</td>
                </tr>
              </table>
            </>
          }
        />
      </>
    </>
  );
}

StaticPageExample.namespacesRequired = [...defaultNamespaces, "page-about"];

export default StaticPageExample;
