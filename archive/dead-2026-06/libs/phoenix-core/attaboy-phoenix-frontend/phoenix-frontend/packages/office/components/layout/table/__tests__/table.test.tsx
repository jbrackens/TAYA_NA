import MatchMediaMock from "jest-matchmedia-mock";
import { render, act, cleanup, screen } from "@testing-library/react";
import Table from "../index";

let matchMedia: any;

describe("Components: Table", () => {
  beforeAll(() => {
    matchMedia = new MatchMediaMock();
  });

  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    matchMedia.clear();
  });
  test("Should show loading indicator", async () => {
    await act(async () => {
      render(<Table loading />);
    });

    const result = await screen.findByRole("img");

    expect(
      result.className.includes("anticon-loading anticon-spin"),
    ).toBeTruthy();
  });

  // test("Should display 2 columns with 2 rows", async () => {

  //   const data = [{
  //     column1: 'column1_row1',
  //     column2: 'column2_row1',
  //   }, {
  //     column1: 'column1_row2',
  //     column2: 'column2_row2',
  //   }]

  //   const columns = [    {
  //     title: 'COLUMN_1',
  //     dataIndex: "column1",
  //   },
  //   {
  //     title: 'COLUMN_2',
  //     dataIndex: "column2",
  //   },]

  //   await act(async () => {
  //     render(<Table dataSource={data} columns={columns} />);
  //   });

  //   const result = await screen.findAllByRole('table');

  //   expect(result).toBeTruthy();

  //   const table = result[0];
  //   expect(table.getElementsByTagName('th').length).toBe(columns.length);
  //   expect(table.getElementsByTagName('td').length).toBe(columns.length * data.length);
  // });
});
