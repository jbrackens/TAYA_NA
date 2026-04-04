import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { MainListItem } from ".";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "MainListItem",
  component: MainListItem,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    children: String,
    fullWidth: Boolean,
    variant: Boolean,
    selected: String,
    fieldKey: String,
    listNumber: Number,
    tagType: String,
    clickable: Boolean,
    onClick: Function,
  },
} as ComponentMeta<typeof MainListItem>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const ListItemTemplate: ComponentStory<typeof MainListItem> = (args) => (
  <ThemeProvider theme={theme}>
    <MainListItem {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const Independant = ListItemTemplate.bind({});
Independant.args = {
  children: "Project List Item",
  variant: "positive",
  fieldKey: "some_list",
};

export const Negative = ListItemTemplate.bind({});
Negative.args = {
  children: "Project List Item",
  variant: "negative",
  fieldKey: "some_list",
};

export const Loading = ListItemTemplate.bind({});
Loading.args = {
  children: "Project List Item",
  variant: "negative",
  loading: true,
};
