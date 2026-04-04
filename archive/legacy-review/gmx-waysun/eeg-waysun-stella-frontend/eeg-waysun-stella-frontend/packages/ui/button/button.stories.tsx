import React from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { DeleteOutlined } from "@ant-design/icons";

import { Button, MergedButtonGroup } from "./";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Button",
  component: Button,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    children: String,
  },
} as ComponentMeta<typeof Button>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Button> = (args) => (
  <ThemeProvider theme={theme}>
    <Button {...args} />
  </ThemeProvider>
);

const Template2: ComponentStory<typeof MergedButtonGroup> = (args) => (
  <ThemeProvider theme={theme}>
    <MergedButtonGroup {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary = Template.bind({});
Primary.args = {
  children: "Primary",
  buttonType: "primary",
};

export const Secondary = Template.bind({});
Secondary.args = {
  children: "Secondary",
  buttonType: "secondary",
};

export const FullWidth = Template.bind({});
FullWidth.args = {
  children: "Full Width",
  buttonType: "primary",
  fullWidth: true,
};

export const Colored = Template.bind({});
Colored.args = {
  children: "Colored Button",
  buttonType: "colored",
};

export const NoBackground = Template.bind({});
NoBackground.args = {
  children: "X",
  buttonType: "nobackground",
};

export const BlueOutline = Template.bind({});
BlueOutline.args = {
  children: "Test Event",
  buttonType: "blue-outline",
};

export const WhiteOutline = Template.bind({});
WhiteOutline.args = {
  children: "Test Event",
  buttonType: "white-outline",
};

export const Danger = Template.bind({});
Danger.args = {
  children: <div>Danger</div>,
  buttonType: "danger",
};

export const Disabled = Template.bind({});
Disabled.args = {
  children: "Disabled",
  buttonType: "primary",
  disabled: true,
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  children: <>Delete</>,
  buttonType: "danger",
  icon: <DeleteOutlined />,
};

export const Loading = Template.bind({});
Loading.args = {
  children: <>Submit</>,
  buttonType: "primary",
  loading: true,
};

export const MergedButtons = Template2.bind({});
MergedButtons.args = {
  children: (
    <>
      <Button buttonType="white-outline">Button 1</Button>
      <Button buttonType="white-outline">Button 2</Button>
      <Button buttonType="white-outline">Button 3</Button>
    </>
  ),
};
