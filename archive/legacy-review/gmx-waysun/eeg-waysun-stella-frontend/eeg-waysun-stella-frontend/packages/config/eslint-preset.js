module.exports = {
  extends: ["next", "prettier"],
  settings: {
    next: {
      rootDir: ["apps/*/", "packages/*/"],
    },
  },
  "rules": {
    "no-console": "warn",
    "curly": "warn",
    "prefer-template": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "off",
    "import/newline-after-import": "warn",
  }
};
