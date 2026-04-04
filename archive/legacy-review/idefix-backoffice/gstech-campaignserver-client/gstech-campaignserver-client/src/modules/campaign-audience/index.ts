export * from "./campaignAudienceSlice";
export * from "./types";
export * from "./CampaignAudience";

export const RULE_TYPES = [
  { value: "numDeposits", label: "Number of deposits" },
  {
    value: "country",
    label: "Country"
  },
  {
    value: "language",
    label: "Language"
  },
  {
    value: "register",
    label: "Registration date"
  },
  {
    value: "deposit",
    label: "Deposit date"
  },
  {
    value: "depositAmount",
    label: "Deposit amount"
  },
  {
    value: "totalDepositAmount",
    label: "Total deposit amount"
  },
  {
    value: "login",
    label: "Last login date"
  },
  {
    value: "tags",
    label: "Tags"
  },
  {
    value: "segments",
    label: "Segments"
  },
  {
    value: "contact",
    label: "Time from last contact"
  },
  {
    value: "otherCampaignsMember",
    label: "Member of other campaign"
  },
  {
    value: "otherCampaignReward",
    label: "Received reward from other campaign"
  },
  {
    value: "campaignDeposit",
    label: "Deposited on campaign"
  },
  {
    value: "addedToCampaign",
    label: "Campaign active for"
  },
  {
    value: "landingPage",
    label: "Registration landing page"
  },
  {
    value: "gameManufacturer",
    label: "Game Manufacturer"
  }
];

export enum MinutesIn {
  Hour = 60,
  Day = 1440,
  Week = 10080,
  Month = 43200
}

export const MINUTES_RULE_OPTIONS = [
  { label: "Minutes", value: 1 },
  { label: "Hours", value: MinutesIn.Hour },
  { label: "Days", value: MinutesIn.Day },
  { label: "Weeks", value: MinutesIn.Week },
  { label: "Months", value: MinutesIn.Month }
];
