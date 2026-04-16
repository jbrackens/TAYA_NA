const { translations } = require("@phoenix-ui/utils");
const path = require("path");
const fs = require("fs");

const SCRIPT_PATH = path.dirname(__filename);
const SOURCE_PATH = path.join(SCRIPT_PATH, `../../translations`);
const APP_CORE_SOURCE_PATH = path.join(SCRIPT_PATH, `../../../app-core/translations`);
const LEGACY_CORE_SOURCE_PATH = path
  .dirname(require.resolve("@phoenix-ui/utils"))
  .replace("@phoenix-ui/utils/dist", "@phoenix-ui/app/translations"); // legacy layout fallback
const LOCALE_PATH = path.join(SCRIPT_PATH, `../../public/static/locales`);

const translationSources = [SOURCE_PATH, APP_CORE_SOURCE_PATH, LEGACY_CORE_SOURCE_PATH].filter((sourcePath) =>
  fs.existsSync(sourcePath),
);

translations.watchFiles(translationSources, LOCALE_PATH, true);
