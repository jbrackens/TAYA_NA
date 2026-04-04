import React from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TextArea } from "./";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "TextArea",
  component: TextArea,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    children: String,
  },
} as ComponentMeta<typeof TextArea>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof TextArea> = (args) => (
  <ThemeProvider theme={theme}>
    <TextArea {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const NormalUsage = Template.bind({});
NormalUsage.args = {};

export const FullWidth = Template.bind({});
FullWidth.args = {
  fullWidth: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  disabled: true,
};

export const WithPlaceholder = Template.bind({});
WithPlaceholder.args = {
  placeholder: "Enter something",
};

export const WithLabel = Template.bind({});
WithLabel.args = {
  labelText: "Something",
  placeholder: "Enter something",
};

export const WithError = Template.bind({});
WithError.args = {
  labelText: "Something",
  placeholder: "Enter something",
  error: "Something is wrong.",
};

export const Loading = Template.bind({});
Loading.args = {
  labelText: "Something",
  placeholder: "Enter something",
  error: "Something is wrong.",
  loading: true,
};
