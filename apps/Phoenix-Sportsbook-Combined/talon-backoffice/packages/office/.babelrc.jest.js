// Jest-specific babel config: uses next/babel for TS/JSX transpilation
// but omits the module-resolver plugin since Jest handles module resolution
// via moduleDirectories and moduleNameMapper instead.
module.exports = {
  presets: ["next/babel"],
  plugins: [
    ["styled-components", { ssr: true, displayName: true, preprocess: false }],
  ],
};
