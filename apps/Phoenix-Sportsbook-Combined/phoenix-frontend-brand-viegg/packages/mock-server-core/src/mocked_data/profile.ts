export const profile = {
  userId: "demo",
  email: "37213@example.com",
  password: "Qwerty!23!",
  accountVerified: true,
  firstName: "Johnny B.",
  lastName: "Goode",
  phoneNumber: "+31644421521",
  dob: {
    month: 1,
    day: 1,
    year: 1986,
  },
  address: {
    aptNo: 38,
    houseNo: 14,
    street: "школьная",
    city: "пермь",
    state: "permskiy kray",
    zipCode: "614575",
    country: "US",
  },
  wallet: {
    dailyLimitMatchBet: 101.0,
    dailyLimitInPlay: 5.0,
    thirtyDayBetLimit: 4000.0,
  },
  locale: {
    language: "English",
    timezone: "UTC",
  },
  communicationSettings: {
    general: {
      ESP_ANNOUNCEMENTS: true,
      ESP_PROMOTIONS: true,
      SUBSCRIPTION_UPDATES: true,
    },
    betting: {
      MATCHES_RESOLVED: true,
      NEW_MATCHES: true,
    },
  },
};
