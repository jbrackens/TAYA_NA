import React from "react";
import { ThemeProvider } from "styled-components";
import { theme } from "../theme";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Header } from "./";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Header",
  component: Header,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    children: String,
    type: String,
  },
} as ComponentMeta<typeof Header>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Header> = (args) => (
  <ThemeProvider theme={theme}>
    <Header {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const BasicHeader = Template.bind({});
BasicHeader.args = {
  children: "Header",
};

export const MediumHeader = Template.bind({});
MediumHeader.args = {
  children: "Header",
  size: "medium",
  type: "h3",
};

export const SmallHeader = Template.bind({});
SmallHeader.args = {
  children: "Header",
  size: "small",
  type: "h6",
};

export const SecondaryHeader = Template.bind({});
SecondaryHeader.args = {
  children: "Header",
  size: "small",
  type: "h5",
  variation: "secondary",
};
