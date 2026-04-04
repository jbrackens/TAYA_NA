const g = (r) => `${process.env.IDFX_NPMLIB}/${r}`;

const fs = require("fs");
const { allCountries, iso2Lookup } = require(g("country-telephone-data"));
const { faker } = require(g("/@faker-js/faker"));
const libPhoneNumber = require(g("google-libphonenumber"));

const phoneUtil = libPhoneNumber.PhoneNumberUtil.getInstance();
const { MOBILE, FIXED_LINE_OR_MOBILE } = libPhoneNumber.PhoneNumberType;

const prefixed = (phoneNumber) =>
  phoneNumber[0] === "+" ? phoneNumber : `+${phoneNumber}`;

const isValid = (countryISO, phone) => {
  const numberInfo = phoneUtil.parse(prefixed(phone), countryISO);
  if (!phoneUtil.isValidNumber(numberInfo)) return false;
  if (phoneUtil.getNumberType(numberInfo) === MOBILE) return true;
  if (phoneUtil.getNumberType(numberInfo) === FIXED_LINE_OR_MOBILE) return true;
  return false;
};

const fakeValidPhone = (countryISO) => {
  const { iso2, format, dialCode } =
    allCountries[iso2Lookup[countryISO.toLowerCase()]];
  if (format === undefined) return faker.phone.number();
  const fmtRe = new RegExp(`^\\+\\.{${dialCode.length}}`);
  const fmt = format
    .replace(/[\(\)\-\s]/g, "")
    .replace(fmtRe, `+${dialCode}`)
    .replaceAll(".", "#");
  do {
    const n = faker.phone.number(fmt);
    if (isValid(iso2.toUpperCase(), n)) return { number: n };
  } while (true);
};

const generateEmailAddresses = ({ email, firstName, lastName, provider }) => {
  if (!email) {
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    return faker.internet
      .email({
        firstName,
        lastName,
        provider: provider || "luckydino.com",
      })
      .replace(/@/, `.${randomNumber}idfx@`);
  }
  const emailRE = /^[\w-]+(\.[\w-]+)*@([a-z0-9-]+\.)+[a-z]{2,7}$/i;
  if (emailRE.test(email)) return email;
  if (email.endsWith("@luckydino.com")) return email;
  return `${email}@luckydino.com`;
};

const fakePlayer = ({
  name: oName,
  email: oEmail,
  firstName: oFirstName,
  lastName: oLastName,
  countryISO: oCountry,
  languageISO: oLang,
  ...override
} = {}) => {
  const firstName =
    oName?.split(" ")[0] || oFirstName || faker.person.firstName();
  const lastName = oName?.split(" ")[1] || oLastName || faker.person.lastName();
  const countryISO = oCountry?.toUpperCase() || "FI";
  const lang = oLang?.toLowerCase() || "en";
  const email = generateEmailAddresses({
    email: oEmail,
    firstName,
    lastName,
    provider: "luckydino.com",
  });
  return {
    firstName,
    lastName,
    email,
    password: "Foobar123",
    address: faker.location.streetAddress(),
    postCode: faker.location.zipCode(),
    city: faker.location.city(),
    dateOfBirth: faker.date.birthdate(),
    countryISO,
    currencyISO: override?.currencyISO?.toUpperCase() || "EUR",
    languageISO: lang,
    phone: fakeValidPhone(countryISO).number,
    receivePromotional: "0",
    accept: "1",
    pinCode: "0000",
    lang,
    ...override,
  };
};

(async (op, ...rest) => {
  let override = {};

  try {
    const piped = fs.readFileSync(0, "utf-8");
    if (piped) override = JSON.parse(piped);
  } catch (e) {
    process.stderr.write(`Error parsing stdin: ${e.message}\n`);
  }

  const opFn = {
    player: (o = override) => fakePlayer(o),
    phone: (o = override) => fakeValidPhone(o.countryISO),
  }[op];

  if (!opFn) throw new Error(`Unknown operation '${op}'`);
  process.stdout.write(JSON.stringify(opFn()));
})(...process.argv.slice(2));
