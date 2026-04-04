import React from "react";
import { ThemeProvider } from "styled-components";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Table, TableRow, TableCol, TableHeader, TableBody } from "./";
import { theme } from "../theme";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Table",
  component: Table,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    children: String,
  },
} as ComponentMeta<typeof Table>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Table> = (args) => (
  <ThemeProvider theme={theme}>
    <Table {...args} />
  </ThemeProvider>
);

// More on args: https://storybook.js.org/docs/react/writing-stories/args
export const NormalUsage = Template.bind({});
NormalUsage.args = {
  children: (
    <>
      <TableHeader>
        <TableRow>
          <TableCol>Aggregations</TableCol>
          <TableCol>Field</TableCol>
          <TableCol>Type</TableCol>
          <TableCol>Value</TableCol>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCol>Aggregation.tes.1</TableCol>
          <TableCol>SUM</TableCol>
          <TableCol>GT</TableCol>
          <TableCol>2</TableCol>
        </TableRow>
        <TableRow>
          <TableCol>Aggregation.tes.1</TableCol>
          <TableCol>SUM</TableCol>
          <TableCol>GT</TableCol>
          <TableCol>2</TableCol>
        </TableRow>
        <TableRow>
          <TableCol>Aggregation.tes.1</TableCol>
          <TableCol>SUM</TableCol>
          <TableCol>GT</TableCol>
          <TableCol>2</TableCol>
        </TableRow>
      </TableBody>
    </>
  ),
};

export const CustomWidth = Template.bind({});
CustomWidth.args = {
  children: (
    <>
      <TableHeader>
        <TableRow>
          <TableCol width={40}>Aggregations</TableCol>
          <TableCol>Field</TableCol>
          <TableCol>Type</TableCol>
          <TableCol>Value</TableCol>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCol>Aggregation.tes.1</TableCol>
          <TableCol>SUM</TableCol>
          <TableCol>GT</TableCol>
          <TableCol>2</TableCol>
        </TableRow>
        <TableRow>
          <TableCol>Aggregation.tes.1</TableCol>
          <TableCol>SUM</TableCol>
          <TableCol>GT</TableCol>
          <TableCol>2</TableCol>
        </TableRow>
        <TableRow>
          <TableCol>Aggregation.tes.1</TableCol>
          <TableCol>SUM</TableCol>
          <TableCol>GT</TableCol>
          <TableCol>2</TableCol>
        </TableRow>
      </TableBody>
    </>
  ),
};

export const AlignText = Template.bind({});
AlignText.args = {
  children: (
    <>
      <TableHeader>
        <TableRow>
          <TableCol>Aggregations</TableCol>
          <TableCol>Field</TableCol>
          <TableCol>Type</TableCol>
          <TableCol>Value</TableCol>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCol>Aggregation.tes.1</TableCol>
          <TableCol>SUM</TableCol>
          <TableCol>GT</TableCol>
          <TableCol align="right">2</TableCol>
        </TableRow>
        <TableRow>
          <TableCol>Aggregation.tes.1</TableCol>
          <TableCol>SUM</TableCol>
          <TableCol>GT</TableCol>
          <TableCol align="right">2</TableCol>
        </TableRow>
        <TableRow>
          <TableCol>Aggregation.tes.1</TableCol>
          <TableCol>SUM</TableCol>
          <TableCol>GT</TableCol>
          <TableCol align="right">2</TableCol>
        </TableRow>
      </TableBody>
    </>
  ),
};

export const Stripped = Template.bind({});
const tableRows = () => {
  let rows = [];
  for (let i = 0; i < 10; i++) {
    rows.push(
      <TableRow key={i}>
        <TableCol>Aggregations</TableCol>
        <TableCol>Field</TableCol>
        <TableCol>Type</TableCol>
        <TableCol>Value</TableCol>
      </TableRow>,
    );
  }
  return rows;
};
Stripped.args = {
  stripped: true,
  children: (
    <>
      <TableHeader>
        <TableRow>
          <TableCol>Aggregations</TableCol>
          <TableCol>Field</TableCol>
          <TableCol>Type</TableCol>
          <TableCol>Value</TableCol>
        </TableRow>
      </TableHeader>
      <TableBody>{tableRows()}</TableBody>
    </>
  ),
};
