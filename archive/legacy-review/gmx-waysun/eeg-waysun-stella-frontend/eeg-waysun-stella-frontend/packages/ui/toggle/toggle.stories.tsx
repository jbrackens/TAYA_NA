import React from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Toggle } from "./";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Toggle",
  component: Toggle,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof Toggle>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Toggle> = (args) => (
  <ThemeProvider theme={theme}>
    <Toggle {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args

export const Normal = Template.bind({});
Normal.args = {
  name: "test",
};

export const WithLabel = Template.bind({});
WithLabel.args = {
  name: "test",
  label: "Toggle",
};

export const Disabled = Template.bind({});
Disabled.args = {
  name: "test",
  label: "Toggle",
  disabled: true,
};

export const Checked = Template.bind({});
Checked.args = {
  name: "test",
  label: "Toggle",
  checked: true,
};
