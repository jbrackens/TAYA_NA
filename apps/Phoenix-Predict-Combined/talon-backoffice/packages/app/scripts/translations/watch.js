const { translations } = require("@phoenix-ui/utils");
const path = require("path");

const SOURCE_PATH = path.join(path.dirname(__filename), "../../translations");
const LOCALE_PATH = path.join(
  path.dirname(__filename),
  `../../public/static/locales`,
);

translations.watchFiles(SOURCE_PATH, LOCALE_PATH, true);
