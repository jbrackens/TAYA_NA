export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  backgrounds: {
    default: "stella",
    values: [
      {
        name: "stella",
        value: "#181818",
      },
      {
        name: "stella 2",
        value: "#1d1d1d",
      },
    ],
  },
};
