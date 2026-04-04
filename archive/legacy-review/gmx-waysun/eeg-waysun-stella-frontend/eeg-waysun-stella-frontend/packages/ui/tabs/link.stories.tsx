import React from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Tabs } from "./";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Tabs",
  component: Tabs,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    children: String,
  },
} as ComponentMeta<typeof Tabs>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Tabs> = (args) => (
  <ThemeProvider theme={theme}>
    <Tabs {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const NormalUsage = Template.bind({});
NormalUsage.args = {
  tabs: ["Profile settings", "Change password", "Billing"],
};

export const Default = Template.bind({});
Default.args = {
  tabs: ["Tab 1", "Tab 2", "Tab 3", "Tab 4"],
  defaultTab: "Tab 2",
};
