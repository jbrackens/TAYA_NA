import React from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Checkbox } from "./";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Checkbox",
  component: Checkbox,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    children: String,
  },
} as ComponentMeta<typeof Checkbox>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Checkbox> = (args) => (
  <ThemeProvider theme={theme}>
    <Checkbox {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const NormalUsage = Template.bind({});
NormalUsage.args = {
  label: "Checkbox",
  name: "checkbox",
  checked: false,
};

export const Checked = Template.bind({});
Checked.args = {
  label: "Checkbox",
  name: "checkbox",
  checked: true,
};

export const AnyLabel = Template.bind({});
AnyLabel.args = {
  label: (
    <b>
      <i>Label supports any types</i>
    </b>
  ),
  name: "checkbox",
  checked: true,
};

export const FullWidth = Template.bind({});
FullWidth.args = {
  label: "Label takes up full width",
  name: "checkbox",
  fullWidth: true,
};
