import React, { useState } from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Modal } from "./";
import { Toggle } from "../toggle";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Modal",
  component: Modal,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof Modal>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Modal> = (args) => {
  const [open, setOpen] = useState(false);
  return (
    <ThemeProvider theme={theme}>
      <div style={{ position: "relative", zIndex: open ? 1001 : 0 }}>
        <Toggle
          onChange={() => setOpen(!open)}
          checked={open}
          label="Toggle modal"
        />
      </div>
      <Modal display={open} {...args} />
    </ThemeProvider>
  );
};

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const NormalUsage = Template.bind({});
NormalUsage.args = {
  children: <div>Basic modal - Create form inside</div>,
};

export const WithoutCloseButton = Template.bind({});
WithoutCloseButton.args = {
  children: <div>Modal without close button on the top</div>,
  closeButtonOnTop: false,
};

export const FullWidth = Template.bind({});
FullWidth.args = {
  children: <div>Modal full width</div>,
  fullWidth: true,
};
