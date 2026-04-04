import React from "react";
import { ThemeProvider } from "styled-components";
import { theme } from "../theme";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Select } from "./";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Select",
  component: Select,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    options: Array,
  },
} as ComponentMeta<typeof Select>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Select> = (args) => (
  <ThemeProvider theme={theme}>
    <Select {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const NormalUsage = Template.bind({});
NormalUsage.args = {
  options: [
    {
      key: "Option1",
      value: "Value1",
    },
    {
      key: "Option2",
      value: "Value2",
    },
  ],
};

export const Compact = Template.bind({});
Compact.args = {
  compact: true,
  options: [
    {
      key: "Option1",
      value: "Value1",
    },
    {
      key: "Option2",
      value: "Value2",
    },
  ],
};

export const OptionsAsSimpleArray = Template.bind({});
OptionsAsSimpleArray.args = {
  options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

export const Search = Template.bind({});
Search.args = {
  options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  search: true,
};

export const EmptyOptions = Template.bind({});
EmptyOptions.args = {};

export const SearchLoading = Template.bind({});
SearchLoading.args = {
  options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  search: true,
  loading: true,
};

export const SelectLoading = Template.bind({});
SelectLoading.args = {
  options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  loading: true,
};

export const ClearButton = Template.bind({});
ClearButton.args = {
  options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  addClearButton: true,
};

export const ClearButtonSearch = Template.bind({});
ClearButtonSearch.args = {
  options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  addClearButton: true,
  search: true,
};
