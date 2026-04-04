/* @noflow */
require("flow-remove-types/register")({ ignoreUninitializedFields: true });
const phoneEmu = require("gstech-core/modules/sms/phoneEmu");
const logger = require("gstech-core/modules/logger");
const request = require("supertest-session");

let pinCode;
phoneEmu.registerReceiver((v) => {
  const matches = v.message.match(/\d+/);
  pinCode = matches ? matches[0] : "";
});

const getPinFromEmail = async (email) => {
  const mailPitPort = process.env.MAILPIT_IDFX_APP_PORT;
  logger.debug(`Getting pin from email ${email} on port ${mailPitPort}`);
  const mailPitApi = request(`http://localhost:${mailPitPort}`);
  const {
    body: { messages },
  } = await mailPitApi.get("/api/v1/messages");
  const msgsOfInterest = messages
    .filter(
      ({ To, Read, Created }) =>
        To.find(({ Address }) => Address === email) &&
        new Date(Created) > Date.now() - 1000 * 60 * 10 &&
        !Read
    )
    .sort((a, b) => new Date(b.Created) - new Date(a.Created));
  if (msgsOfInterest.length === 0) return "";
  const pinMailId = msgsOfInterest[0].ID;
  const {
    body: { Text },
  } = await mailPitApi.get(`/api/v1/message/${pinMailId}`);
  await mailPitApi.put(`/api/v1/messages`, {
    ids: [pinMailId],
    read: true,
  });
  const matches = Text.match(/\d+/);
  return matches ? matches[0] : "";
};

const registerTestPlayer = async (override) => {
  let counter = 407000000 + (Date.now() % 1000000);
  const player = {
    pinCode: "0000",
    firstName: "Foo",
    lastName: "Foo",
    address: `Foobar ${counter++}`,
    postCode: "123123",
    city: "Foobar123",
    dateOfBirth: "1985-01-01",
    countryISO: "FI",
    currencyISO: "EUR",
    languageISO: "en",
    phone: `+358-${counter++}`,
    receivePromotional: "1",
    accept: "1",
    lang: "en",
    email: `tech${counter++}@luckydino.com`,
    password: "Foobar123",
    ...override,
  };
  const session = request(`http://localhost:${process.env.DBG_BRAND || 3000}`);
  let up = false;
  while (!up) {
    try {
      await session.get("/");
      up = true;
    } catch (e) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  try {
    await session.post("/api/activate/phone").send(player);
    do {
      const emailPin = await getPinFromEmail(player.email);
      if (emailPin) pinCode = emailPin;
      else await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (!pinCode);
    await session.post("/api/register").send({ ...player, pinCode });
    pinCode = "";
    // await session.post('/api/questionnaire/Transfer').send({ license_transfer: 'true' });
  } catch (e) {
    logger.error(`Error registering ${player.email}`, e);
  }
};

(async () => {
  const testPlayers = [
    {
      firstName: "Joe",
      lastName: "Rogan",
      email: "joeRogan@luckydino.com",
      phone: `+358-${407000000 + 1}`,
      countryISO: "FI",
      currencyISO: "EUR",
    },
    {
      firstName: "Chris",
      lastName: "Distefano",
      email: "chrisDistefano@luckydino.com",
      phone: `+358-${407000000 + 2}`,
      countryISO: "FI",
      currencyISO: "EUR",
    },
    // {
    //   firstName: "Joey",
    //   lastName: "Diaz",
    //   email: "joeyDiaz@luckydino.com",
    //   phone: `+358-${407000000 + 3}`,
    //   countryISO: "BR",
    //   currencyISO: "BRL",
    // },
    // {
    //   firstName: "Tom",
    //   lastName: "Segura",
    //   email: "tomSegura@luckydino.com",
    //   phone: `+358-${407000000 + 4}`,
    // },
    // {
    //   firstName: "Tom",
    //   lastName: "Segura",
    //   email: "tomSegura@luckydino.com",
    //   phone: `+358-${407000000 + 4}`,
    //   countryISO: "PE",
    //   currencyISO: "PEN",
    // },
    // {
    //   firstName: "Bobby",
    //   lastName: "Lee",
    //   email: "bobbyLee@luckydino.com",
    //   phone: `+358-${407000000 + 5}`,
    // },
    // {
    //   firstName: "Bert",
    //   lastName: "Kreisher",
    //   email: "bertKreisher@luckydino.com",
    // },
    // {
    //   firstName: "Andrew",
    //   lastName: "Santino",
    //   email: "andrewSantino@luckydino.com",
    // },
  ];

  for (let i = 0; i < testPlayers.length; i++)
    await registerTestPlayer(testPlayers[i]);

  const comms = request("http://localhost:4334");
  await comms.get("/scaffold");
  await comms.get("/exit");

  // await registerTestPlayer(
  // process.env.LD_REGISTER_PLAYER
  //   ? {
  //       firstName: `${process.env.LD_REGISTER_PLAYER}${i}`,
  //       email: `${process.env.LD_REGISTER_PLAYER}${i}@luckydino.com`,
  //     }
  //   : {},
  // );
})();
