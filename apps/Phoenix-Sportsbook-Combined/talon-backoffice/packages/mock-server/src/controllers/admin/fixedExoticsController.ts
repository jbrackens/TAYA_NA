type FixedExoticQuote = {
  quoteId: string;
  userId: string;
  exoticType: string;
  status: "open" | "accepted" | "expired";
  encodedTicket: string;
  combinedOdds: number;
  stakeCents: number;
  acceptedBetId?: string;
  createdAt: string;
  updatedAt: string;
  lastReason?: string;
};

const quotes: FixedExoticQuote[] = [
  {
    quoteId: "feq:local:000101",
    userId: "u-local-1001",
    exoticType: "exacta",
    status: "open",
    encodedTicket: "exacta:home>over",
    combinedOdds: 3.51,
    stakeCents: 500,
    createdAt: "2026-03-04T10:00:00Z",
    updatedAt: "2026-03-04T10:00:00Z",
  },
  {
    quoteId: "feq:local:000102",
    userId: "u-local-1002",
    exoticType: "trifecta",
    status: "accepted",
    encodedTicket: "trifecta:home>over>away",
    combinedOdds: 7.84,
    stakeCents: 700,
    acceptedBetId: "b:local:001234",
    createdAt: "2026-03-04T10:02:00Z",
    updatedAt: "2026-03-04T10:05:00Z",
  },
  {
    quoteId: "feq:local:000103",
    userId: "u-local-1003",
    exoticType: "exacta",
    status: "expired",
    encodedTicket: "exacta:away>under",
    combinedOdds: 4.15,
    stakeCents: 600,
    createdAt: "2026-03-04T10:06:00Z",
    updatedAt: "2026-03-04T10:07:00Z",
    lastReason: "expired by ttl",
  },
];

const normalize = (value?: string): string => `${value || ""}`.trim().toLowerCase();

export default {
  async list(req: any, res: any) {
    const { userId = "", status = "", limit } = req.query || {};
    const normalizedUserId = normalize(userId);
    const normalizedStatus = normalize(status);
    const parsedLimit = Number(limit || 200);
    const maxItems =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 200;

    let items = [...quotes];
    if (normalizedUserId) {
      items = items.filter((quote) => normalize(quote.userId) === normalizedUserId);
    }
    if (normalizedStatus) {
      items = items.filter((quote) => normalize(quote.status) === normalizedStatus);
    }

    return res.status(200).send({
      items: items.slice(0, maxItems),
    });
  },

  async details(req: any, res: any) {
    const { id } = req.params || {};
    const quote = quotes.find((item) => item.quoteId === id);
    if (!quote) {
      return res.status(404).send({
        error: {
          code: "not_found",
          details: {
            reasonCode: "fixed_exotic_quote_not_found",
          },
        },
      });
    }
    return res.status(200).send(quote);
  },

  async expire(req: any, res: any) {
    const { id } = req.params || {};
    const quote = quotes.find((item) => item.quoteId === id);
    if (!quote) {
      return res.status(404).send({
        error: {
          code: "not_found",
          details: {
            reasonCode: "fixed_exotic_quote_not_found",
          },
        },
      });
    }
    if (quote.status === "accepted") {
      return res.status(409).send({
        error: {
          code: "fixed_exotic_quote_conflict",
          details: {
            reasonCode: "fixed_exotic_quote_conflict",
          },
        },
      });
    }

    quote.status = "expired";
    quote.lastReason = `${req.body?.reason || "manual operator expire"}`.trim();
    quote.updatedAt = new Date().toISOString();

    return res.status(200).send(quote);
  },
};
