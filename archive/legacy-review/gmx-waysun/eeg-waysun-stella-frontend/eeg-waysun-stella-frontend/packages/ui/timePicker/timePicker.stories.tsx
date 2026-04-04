import React from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TimePicker } from "./";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "TimePicker",
  component: TimePicker,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: { fromYear: Number, toYear: Number },
} as ComponentMeta<typeof TimePicker>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof TimePicker> = (args) => (
  <ThemeProvider theme={theme}>
    <TimePicker {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const IdealUsage = Template.bind({});
IdealUsage.args = {};

export const WithLabelAndError = Template.bind({});
WithLabelAndError.args = {
  label: "Date/Time",
  error: "Som,ething went wrong",
};

export const WithValue = Template.bind({});
WithValue.args = {
  value: {
    hour: 2,
    minute: 15,
    second: 20,
  },
};
