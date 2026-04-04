import { ComponentStory, ComponentMeta } from "@storybook/react";
import { ThemeProvider } from "styled-components";

import { Transfer } from "./";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Transfer",
  component: Transfer,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    left: [],
    right: [],
    onChange: () => {},
    onSelectChange: () => {},
  },
} as ComponentMeta<typeof Transfer>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Transfer> = (args) => (
  <ThemeProvider theme={theme}>
    <Transfer {...args} />
  </ThemeProvider>
);

const mockData1 = [];
for (let i = 1; i <= 5; i++) {
  mockData1.push({
    key: `key${i}`,
    value: `value${i}`,
    checked: false,
  });
}

const mockData2 = [];
for (let i = 6; i <= 10; i++) {
  mockData2.push({
    key: `key${i}`,
    value: `value${i}`,
    checked: false,
  });
}

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const NormalUsage = Template.bind({});
NormalUsage.args = {
  left: mockData1,
  right: mockData2,
};

export const Empty = Template.bind({});
Empty.args = {
  left: [],
  right: [],
};

export const LeftOnly = Template.bind({});
LeftOnly.args = {
  left: mockData1,
  right: [],
};

export const RightOnly = Template.bind({});
RightOnly.args = {
  left: [],
  right: mockData1,
};

export const FullWidth = Template.bind({});
FullWidth.args = {
  left: mockData1,
  right: mockData2,
  fullWidth: true,
};

export const DefaultChecked = Template.bind({});
DefaultChecked.args = {
  left: [
    {
      key: "key1",
      value: "value1",
      checked: false,
    },
    {
      key: "key2",
      value: "value2",
      checked: true,
    },
    {
      key: "key3",
      value: "value3",
      checked: true,
    },
  ],
  right: [],
};
