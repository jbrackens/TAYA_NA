import React from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { SearchOutlined } from "@ant-design/icons";

import { Input } from "./";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Input",
  component: Input,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    children: String,
  },
} as ComponentMeta<typeof Input>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Input> = (args) => (
  <ThemeProvider theme={theme}>
    <Input {...args} />
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

export const ClearInput = Template.bind({});
ClearInput.args = {
  labelText: "Type something to see clear button",
  placeholder: "Type something",
  clearInput: true,
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  labelText: "With icon",
  placeholder: "Search",
  icon: <SearchOutlined />,
};

export const Loading = Template.bind({});
Loading.args = {
  labelText: "Loading",
  loading: true,
};

export const WithIconBackground = Template.bind({});
WithIconBackground.args = {
  labelText: "With icon",
  placeholder: "Search",
  icon: <SearchOutlined />,
  iconBackground: true,
};
