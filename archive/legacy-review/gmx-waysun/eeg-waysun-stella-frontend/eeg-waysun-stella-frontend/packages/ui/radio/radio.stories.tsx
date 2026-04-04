import React from "react";
import { ThemeProvider } from "styled-components";
import { theme } from "../theme";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Radio } from ".";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Radio",
  component: Radio,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    options: Array,
  },
} as ComponentMeta<typeof Radio>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Radio> = (args) => (
  <ThemeProvider theme={theme}>
    <Radio {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const NormalUsage = Template.bind({});
NormalUsage.args = {
  label: "example radio",
  name: "example radio",
  options: [
    {
      name: "Option1",
      value: "Value1",
    },
    {
      name: "Option2",
      value: "Value2",
    },
  ],
};
