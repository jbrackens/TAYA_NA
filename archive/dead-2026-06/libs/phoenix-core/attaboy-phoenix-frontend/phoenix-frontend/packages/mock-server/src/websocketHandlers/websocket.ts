import { websocketData, arrayWithRandomData } from "../mocked_data/websockets";

const randomIntFromInterval = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const websocketHandler = (conn: any) => {
  // fixture updates
  let firstFxitureId: any;
  let firstFxitureChannel: any;
  let firstFxitureCorrelationId: any;
  const x = setInterval(() => {
    const fixtureStatuses = [
      "GAME_ABANDONED",
      "IN_PLAY",
      "POST_GAME",
      "UNKNOWN",
      "BREAK_IN_PLAY",
    ];
    const generateStatus = () =>
      fixtureStatuses[Math.floor(Math.random() * fixtureStatuses.length)];

    if (firstFxitureChannel && firstFxitureId && firstFxitureCorrelationId) {
      conn.send(
        JSON.stringify({
          channel: firstFxitureChannel,
          correlationId: firstFxitureCorrelationId,
          event: "update",
          data: {
            id: firstFxitureId,
            name: "Komil&amp;Friends vs Gentlemen's Gaming",
            score: {
              home: randomIntFromInterval(1, 6),
              away: randomIntFromInterval(1, 6),
            },
            startTime: "2022-01-12T14:00:00Z",
            status: generateStatus(),
          },
        }),
      );
    }
  }, 5000);

  conn.on("message", function(message: any) {
    const parsedMessage = JSON.parse(message);
    if (parsedMessage.channel.includes("fixture")) {
      if (!firstFxitureId) {
        firstFxitureId = parsedMessage.channel.split("^")[2];
      }
      if (!firstFxitureChannel) {
        firstFxitureChannel = parsedMessage.channel;
      }
      if (!firstFxitureCorrelationId) {
        firstFxitureCorrelationId = parsedMessage.correlationId;
      }
    }
  });
  conn.on("disconnect", function() {
    conn.send("closing");
  });
  conn.on("open", () => {
    conn.send("opening");
  });
};
