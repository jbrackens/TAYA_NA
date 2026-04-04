import React from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Toast } from "./Toast";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Toast",
  component: Toast,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    children: String,
  },
} as ComponentMeta<typeof Toast>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Toast> = (args) => (
  <ThemeProvider theme={theme}>
    <Toast {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const Default = Template.bind({});
Default.args = {
  children: "Some texts",
};

export const Success = Template.bind({});
Success.args = {
  children: "Some texts",
  type: "success",
};

export const Error = Template.bind({});
Error.args = {
  children: "Some texts",
  type: "error",
};
