/* eslint-disable */
export default {
  displayName: "idefix-components",
  preset: "../../../jest.preset.js",
  transform: {
    "^.+\\.[tj]sx?$": ['babel-jest', { presets: ['@nrwl/react/babel'] }]
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  coverageDirectory: "../../../coverage/libs/idefix/components"
};
