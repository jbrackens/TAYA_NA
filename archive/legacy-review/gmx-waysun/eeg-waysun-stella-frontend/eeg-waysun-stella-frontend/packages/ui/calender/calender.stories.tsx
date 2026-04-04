import React from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Calender } from "./";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Calender",
  component: Calender,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: { fromYear: Number, toYear: Number },
} as ComponentMeta<typeof Calender>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Calender> = (args) => (
  <ThemeProvider theme={theme}>
    <Calender {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const IdealUsage = Template.bind({});
IdealUsage.args = {
  fromYear: 2010,
  toYear: 2025,
  value: {
    year: 2022,
    month: 2,
    day: 10,
  },
};

export const CustomYear = Template.bind({});
CustomYear.args = {
  fromYear: 2012,
  toYear: 2020,
};

export const WithValue = Template.bind({});
WithValue.args = {
  value: {
    year: 2005,
    month: 0,
    day: 10,
  },
};

export const fullWidth = Template.bind({});
fullWidth.args = {
  fullWidth: true
};

export const LabelAndError = Template.bind({});
LabelAndError.args = {
  label: "Calender",
  error: "Error occured."
};