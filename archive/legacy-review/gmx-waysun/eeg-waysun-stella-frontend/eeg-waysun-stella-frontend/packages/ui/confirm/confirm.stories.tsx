import React from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { ConfirmModal } from "./";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "ConfirmModal",
  component: ConfirmModal,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    children: String,
  },
} as ComponentMeta<typeof ConfirmModal>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof ConfirmModal> = (args) => (
  <ThemeProvider theme={theme}>
    <ConfirmModal {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const NormalUsage = Template.bind({});
NormalUsage.args = {
  show: true,
  close: () => {},
};

export const CustomLabels = Template.bind({});
CustomLabels.args = {
  show: true,
  close: () => {},
  header: "Do you want to delete?",
  cancelLabel: "No",
  confirmLabel: "Yes",
};
