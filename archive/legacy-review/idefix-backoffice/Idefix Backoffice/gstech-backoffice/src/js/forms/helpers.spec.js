const { convertIBANToBIC } = require("./helpers");

describe("Form helpers", () => {
  it("can convert IBAN to BIC", () => {
    expect(convertIBANToBIC("FI7647261020059823")).toEqual("POPFFI22");
  });
});
