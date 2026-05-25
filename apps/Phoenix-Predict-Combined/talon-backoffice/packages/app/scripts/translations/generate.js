const { translations } = require("@phoenix-ui/utils");
const path = require("path");
const { existsSync } = require("fs");

const SOURCE_PATH = path.join(path.dirname(__filename), "../../translations");
const LOCALE_PATH = path.join(
  path.dirname(__filename),
  `../../public/static/locales`,
);

if (existsSync(SOURCE_PATH)) {
  translations.generateLocales(SOURCE_PATH, LOCALE_PATH);
} else {
  console.log("[Utils:translations] Source path missing; using checked-in locales.");
}
