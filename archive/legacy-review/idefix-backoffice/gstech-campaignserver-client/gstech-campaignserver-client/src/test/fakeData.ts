export const campaignInfoPayload = {
  data: {
    data: {
      id: 91,
      brandId: "LD",
      name: "qwerty",
      status: "draft",
      startTime: "2020-03-22T21:00:00.000Z",
      endTime: "2020-04-30T21:45:00.000Z",
      audienceType: "dynamic",
      creditMultiple: false,
      audience: {
        rules: []
      },
      reward: {
        rewards: [
          {
            id: 233,
            trigger: "login",
            creditMultiple: true,
            minDeposit: 2,
            reward: "string",
            wager: 5,
            quantity: 10,
            titles: {
              en: { text: "EN title" },
              fi: { text: "FI title", required: true }
            }
          }
        ]
      }
    }
  }
};
