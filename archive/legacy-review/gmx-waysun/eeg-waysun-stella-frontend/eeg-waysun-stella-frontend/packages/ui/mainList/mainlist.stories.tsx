import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { MainList, MainListDataType } from ".";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "MainList",
  component: MainList,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    fullWidth: Boolean,
    children: String,
    data: Array,
    clickable: Boolean,
    onClick: Function,
    selectedKey: String,
  },
} as ComponentMeta<typeof MainList>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const ListTemplate: ComponentStory<typeof MainList> = (args) => (
  <ThemeProvider theme={theme}>
    <MainList {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
const dataToPass: Array<MainListDataType> = [
  {
    key: "key1",
    value: "List1",
    variant: "positive",
  },
  {
    key: "key2",
    value: "List2",
    variant: "negative",
  },
  {
    key: "key3",
    value: <i>{"Value can be anything"}</i>,
    variant: "positive",
  },
];

export const List = ListTemplate.bind({});
List.args = {
  children: "Project List Item",
  data: dataToPass,
  fullWidth: true,
};

export const NonSelectable = ListTemplate.bind({});
NonSelectable.args = {
  children: "Project List Item",
  data: dataToPass,
  fullWidth: true,
  clickable: false,
};

export const Loading = ListTemplate.bind({});
Loading.args = {
  children: "Project List Item",
  data: dataToPass,
  loading: true,
};
