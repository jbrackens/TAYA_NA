import trimZerosPercentage from "./trimZerosPercentage";

const trimZerosTestData = [
  { input: "123.456", output: "123.456" },
  { input: "-123.456", output: "123.456" },
  { input: "0.123", output: "0.123" },
  { input: "-0.123", output: "0.123" },
  { input: "000.123", output: "0.123" },
  { input: "-000.123", output: "0.123" },
  { input: "000123.456", output: "123.456" },
  { input: "-000123.456", output: "123.456" },
  { input: "12.", output: "12." },
  { input: ".12", output: ".12" },
  { input: "-.12", output: ".12" },
];

describe("Percentage normalize", () => {
  describe("#trimZeros", () => {
    trimZerosTestData.forEach(({ input, output }) => {
      it(`returns expected value for "${input}" input`, () => {
        expect(trimZerosPercentage(input)).toEqual(output);
      });
    });
  });
});
