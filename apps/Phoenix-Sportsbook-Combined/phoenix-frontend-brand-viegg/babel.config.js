// Root babel config for Jest transforms.
//
// Uses Next.js' compiled babel presets (since standalone @babel/preset-*
// packages are not installed at the root level).
//
// The .babelrc files in packages/app-core and packages/app use "next/babel"
// which works during the Next.js build but cannot resolve its plugin deps
// when invoked by babel-jest from the monorepo root.  This root config
// replaces them for Jest runs.  babelrcRoots is intentionally omitted so
// the subpackage .babelrc files are ignored during testing.
//
// Module aliases (e.g. "i18n") are handled by Jest's moduleNameMapper
// in jest.config.js rather than babel-plugin-module-resolver.
module.exports = {
  presets: [
    [require("next/dist/compiled/babel/preset-env"), { targets: { node: "current" } }],
    [require("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }],
    require("next/dist/compiled/babel/preset-typescript"),
  ],
};
