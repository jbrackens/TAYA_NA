import trimZeros from "./trimZeros";

const trimZerosTestData = [
  { input: "123.456", output: "123.456" },
  { input: "-123.456", output: "-123.456" },
  { input: "0.123", output: "0.123" },
  { input: "-0.123", output: "-0.123" },
  { input: "000.123", output: "0.123" },
  { input: "-000.123", output: "-0.123" },
  { input: "000123.456", output: "123.456" },
  { input: "-000123.456", output: "-123.456" },
  { input: "12.", output: "12." },
];

describe("Form fields MoneyField", () => {
  describe("#trimZeros", () => {
    trimZerosTestData.forEach(({ input, output }) => {
      it(`returns expected value for "${input}" input`, () => {
        expect(trimZeros(input)).toEqual(output);
      });
    });
  });
});
