/* @noflow */
const globals = require('globals');
const { FlatCompat } = require('@eslint/eslintrc');
const { fixupPluginRules, fixupConfigRules } = require('@eslint/compat');
const js = require('@eslint/js');
const hermes = require('hermes-eslint');
const prettier = require('eslint-plugin-prettier');
const ftFlow = require('eslint-plugin-ft-flow');
const airbnbBase = require('eslint-config-airbnb-base');
const pluginImport = require('eslint-plugin-import');
const importRecommended = require('eslint-plugin-import/config/recommended');

const { extends: airbnbRules, ...airbnbConfig } = airbnbBase;

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const envMap = {
  builtin: 'builtin',
  es5: 'es5',
  es6: 'es2015',
  es2016: 'es2015',
  es2017: 'es2017',
  es2018: 'es2017',
  es2019: 'es2017',
  es2020: 'es2020',
  es2021: 'es2021',
  es2022: 'es2021',
  es2023: 'es2021',
  es2024: 'es2021',
  browser: 'browser',
  worker: 'worker',
  node: 'node',
  nodeBuiltin: 'nodeBuiltin',
  commonjs: 'commonjs',
  amd: 'amd',
  mocha: 'mocha',
  jasmine: 'jasmine',
  jest: 'jest',
  qunit: 'qunit',
  phantomjs: 'phantomjs',
  couch: 'couch',
  rhino: 'rhino',
  nashorn: 'nashorn',
  wsh: 'wsh',
  jquery: 'jquery',
  yui: 'yui',
  shelljs: 'shelljs',
  prototypejs: 'prototypejs',
  meteor: 'meteor',
  mongo: 'mongo',
  applescript: 'applescript',
  serviceworker: 'serviceworker',
  atomtest: 'atomtest',
  embertest: 'embertest',
  protractor: 'protractor',
  'shared-node-browser': 'shared-node-browser',
  webextensions: 'webextensions',
  greasemonkey: 'greasemonkey',
  devtools: 'devtools',
};

const convertToFlatConfig = ({ env, parserOptions, plugins: _p, ...oldConfig }) => ({
  ...oldConfig,
  languageOptions: {
    ...(env && {
      globals: Object.fromEntries(
        Object.keys(env)
          .filter((k) => env[k] === true && k in envMap && envMap[k] in globals)
          .flatMap((k) => Object.entries(globals[envMap[k]])),
      ),
    }),
    ...(parserOptions && { parserOptions }),
  },
});

async function eslintCfg() {
  const abnbRules = await Promise.all(
    airbnbRules.map(async (r) => convertToFlatConfig((await import(r)).default)),
  );
  return [
    {
      ignores: [
        'node_modules/**',
        'packages/gstech-core/flow-typed/',
        'packages/brandserver-backend/public/**/*.js',
        '!packages/brandserver-backend/public/admin/js/ld-dashboard.js',
      ],
    },
    ...abnbRules,
    ...fixupConfigRules(
      compat.extends(
        'eslint:recommended',
        'plugin:ft-flow/recommended',
        'plugin:prettier/recommended',
      ),
    ),
    ...fixupConfigRules(compat.config(importRecommended)),
    convertToFlatConfig(airbnbConfig),
    {
      plugins: {
        import: fixupPluginRules(pluginImport),
        'ft-flow': fixupPluginRules(ftFlow),
        prettier: fixupPluginRules(prettier),
      },
      languageOptions: {
        globals: {
          ...globals.node,
          ...globals.mocha,
          expect: true,
          setup: true,
          clean: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'commonjs',
        parser: hermes,
        parserOptions: {
          sourceType: 'module',
        },
      },
      settings: {
        'import/parsers': {
          'hermes-eslint': ['.js'],
        },
        'import/resolver': {
          node: {
            extensions: ['.js', '.json'],
          },
        },
        'import/internal-regex': '^gstech-core/',
      },
      rules: {
        camelcase: 'off',
        'default-param-last': 'warn',
        'global-require': 'off',
        'implicit-arrow-linebreak': 'off',
        'arrow-parens': 'off',
        'object-curly-newline': 'off',
        'prefer-promise-reject-errors': 'off',
        'max-len': ['error', { code: 800, tabWidth: 2 }],
        'no-shadow': ['error', { allow: ['qb', 'key'] }],
        'no-unused-vars': [
          'error',
          {
            argsIgnorePattern: 'this',
            ignoreRestSiblings: true,
            caughtErrors: 'none',
          },
        ],
        'no-param-reassign': [
          'error',
          { props: true, ignorePropertyModificationsFor: ['req', 'res', 'acc'] },
        ],
        'no-restricted-syntax': 'off',
        'no-await-in-loop': 'off',
        'no-buffer-constructor': 'off',
        'no-restricted-globals': 'off',
        'no-return-await': 'off',
        'no-promise-executor-return': 'warn',
        'ft-flow/require-valid-file-annotation': ['error', 'always'],
        'ft-flow/space-after-type-colon': [
          'error',
          'always',
          {
            allowLineBreak: true,
          },
        ],
        'import/no-dynamic-require': 'off',
        'import/no-import-module-exports': 'off',
        'import/no-extraneous-dependencies': ['error', { packageDir: __dirname }],
        'import/order': [
          'off',
          {
            groups: ['type', 'builtin', 'external', 'internal', ['parent', 'sibling'], 'index'],
            distinctGroup: false,
          },
        ],
        'prettier/prettier': 'off',
      },
    },
    {
      files: ['packages/brandserver-backend/**/*.js'],
      rules: {
        radix: 'off',
        'no-shadow': 'off',
        'no-plusplus': 'off',
        'consistent-return': 'off',
        'no-useless-escape': 'off',
        'no-param-reassign': 'off',
        'class-methods-use-this': 'off',
        'guard-for-in': 'off',
        'no-use-before-define': 'off',
        'no-case-declarations': 'off',
        'no-loop-func': 'off',
        'no-underscore-dangle': 'off',
        'array-callback-return': 'off',
        'no-nested-ternary': 'off',
      },
    },
    {
      files: ['packages/brandserver-backend/src/server/common/websocket.js'],
      rules: { 'no-unused-vars': 'off' },
    },
  ];
}

module.exports = eslintCfg();
