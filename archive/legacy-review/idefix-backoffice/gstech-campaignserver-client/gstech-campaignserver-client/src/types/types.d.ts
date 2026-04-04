declare module "app/types" {
  export type CampaignStatus = "draft" | "running" | "archived" | "active";

  export type AudienceType = "static" | "dynamic";

  export interface CampaignGroup {
    id: number;
    name: string;
    startTime: string | null;
    endTime: string | null;
    campaigns: Partial<Campaign>[];
  }

  export interface Campaign {
    id: number;
    brandId: string;
    name: string;
    status: CampaignStatus;
    startTime: string;
    endTime: string;
    audienceType: AudienceType;
    audience: string;
    reactions: string;
    previewMode: boolean;
    migrated: boolean;
    groupId: number | null;
  }

  export interface NewCampaign {
    id?: number;
    brandId: string;
    name: string;
    startTime?: string;
    endTime?: string;
    audienceType: AudienceType;
    creditMultiple: boolean;
  }

  export interface ExistingCampaign {
    id: number;
    brandId: string;
    name: string;
    email: ExistingEmailTemplate | null;
    sms: ExistingSmsTemplate | null;
    notification: ExistingNotificationTemplate | null;
    banner: ExistingBannerTemplate | null;
    status: CampaignStatus;
    startTime: string | null;
    endTime: string | null;
    previewMode: boolean;
    audienceType: AudienceType;
    creditMultiple: boolean;
    groupId: number | null;
    group: { name: string; campaigns: { id: number; name: string }[] };
    audience: {
      rules: CampaignRule[];
    };
    reward: {
      rewards: RewardRule[];
    };
  }

  export interface Statistic {
    id: string;
    name: string;
    value: number;
  }
  export interface CampaignStats {
    audience: Statistic[];
    notification: Statistic[];
    email: Statistic[];
    sms: Statistic[];
    reward: {
      general: Statistic[];
      rewards: {
        [id: string]: Statistic[];
      };
    };
  }

  export interface AudienceRule {
    name: string;
    operator:
      | "<"
      | "<="
      | ">"
      | ">="
      | "!="
      | "<>"
      | "="
      | "between"
      | "in"
      | "csv"
      | "withinMinutes"
      | "otherCampaignReward"
      | "otherCampaignsMember"
      | "gameManufacturer";
    values: any;
    not?: boolean;
    id: number;
  }

  export interface NewContent {
    sendingTime?: string;
    contentId: number;
    sendToAll?: boolean;
  }

  export interface Email {
    id: number;
    name: string;
    subject: string;
  }

  export interface ExistingEmailTemplate {
    emailId: number;
    sendingTime: null | string;
    sendToAll?: boolean;
    contentId: number;
    name: string;
    subject: string;
  }

  export interface Sms {
    id: number;
    name: string;
    text: string;
  }

  export interface ExistingSmsTemplate {
    smsId: number;
    sendingTime: null | string;
    sendToAll?: boolean;
    contentId: number;
    name: string;
    text: string;
  }

  export interface Notification {
    id: number;
    name: string;
    title: string;
  }

  export interface ExistingNotificationTemplate {
    notificationId: number;
    contentId: number;
    name: string;
    title: string;
  }

  export interface ExistingBannerTemplate {
    bannerId: number;
    contentId: number;
    location: string;
    name: string;
    text: string;
  }

  export interface CampaignWithRewards {
    campaignId: number;
    name: string;
    rewardIds: string[];
  }

  interface BrandOption {
    id: string;
    name: string;
  }

  export interface Country {
    brandId: string;
    code: string;
    name: string;
  }

  export interface Language {
    code: string;
    longCode: string;
    name: string;
    engName: string;
  }

  export interface InitConfig {
    brands: BrandOption[];
    rewardTriggers: string[];
    bannerLocations: { [key: string]: string[] };
  }
  export interface RewardRuleConfig {
    id: number;
    externalId: string;
    description: string;
  }

  export interface RewardRule {
    id: number;
    trigger: "deposit" | "login" | "registration";
    wager?: string;
    quantity: string;
    titles?: { [key: string]: { text: string; required?: boolean } };
    rewardId: number;
    minDeposit: number;
    maxDeposit: number | null;
    useOnCredit: boolean;
  }

  export interface ApiServerError {
    error: {
      message: string;
      status?: number;
    };
  }

  export interface Game {
    id: number;
    order: number;
    brandId: string;
    permalink: string;
    name: string;
    manufacturer: string;
    primaryCategory: string;
    aspectRatio: string;
    viewMode: ViewMode;
    newGame: boolean;
    jackpot: boolean;
    thumbnailId: null | number;
    searchOnly: boolean;
    promoted: boolean;
    dropAndWins: boolean;
    active: boolean;
    keywords: string;
    tags: string[];
    removedAt: null | string;
    parameters: {};
  }

  export interface GameManufacturer {
    id: string;
    name: string;
    parentId: string | null;
    active: boolean;
    license: string;
  }

  export type RewardConfigFieldType = "string" | "number" | "money" | "boolean";
  export interface RewardsConfigField {
    property: string;
    title: string;
    type: RewardConfigFieldType;
    required: boolean;
    values?: string[];
    preview?: string;
  }

  export interface RewardsConfigTable {
    title: string;
    property: string;
    values?: string[];
  }

  export interface RewardConfigOption {
    id: number;
    name: string;
    type: string;
    spinTypes: string[];
    fields: RewardsConfigField[];
    table: RewardsConfigTable[];
    hidden?: boolean;
    promotion?: string;
  }

  export interface ThumbnailUrls {
    double?: string;
    single?: string;
    max?: string;
  }

  export type ViewMode = keyof ThumbnailUrls;

  export interface RewardConfig {
    rewardDefinitions: {
      [key: string]: RewardConfigOption[];
    };
    thumbnails: {
      [brandId: string]: ThumbnailUrls;
    };
  }

  export type CreditType = "freeSpins" | "real" | "bonus" | "depositBonus";

  export interface Reward {
    id: number;
    creditType: CreditType;
    bonusCode: string;
    externalId: string;
    rewardDefinitionId: number;
    rewardType: string;
    order: number;
    description: string;
    validity: string | null;
    price: number | null;
    cost: number | null;
    spins: number | null;
    spinValue: number | null;
    spinType: string | null;
    gameId: number | null;
    currency: string | null;
    metadata: { [key: string]: string | boolean } | null;
    active: boolean;
  }

  export interface RewardInstance {
    reward: Reward;
    game: Game;
  }

  export interface Thumbnail {
    id: number;
    key: string;
    blurhashes: {
      single?: string;
      double?: string;
      max?: string;
    };
    viewModes: string[];
  }

  export type ContentType = keyof ContentConfig;
  export type ContentStatus = "published" | "draft";

  export type ContentByLanguage = {
    title: string;
    content: string;
    text?: string;
    subject?: string;
    actionText?: string;
  };
  export interface ContentRequest {
    brandId: string;
    contentType: ContentType;
    status?: ContentStatus;
    location?: string;
    excludeInactive?: boolean;
  }

  interface ContentConfigField {
    property: string;
    required: boolean;
    title: string;
    type: string;
    limit?: number;
    pattern?: string;
    values?: string[];
  }

  interface ContentConfigByType {
    fields: ContentConfigField[];
    localizedFields: ContentConfigField[];
  }

  export interface ContentConfig {
    email?: ContentConfigByType;
    sms?: ContentConfigByType;
    notification?: ContentConfigByType;
    landingPage?: ContentConfigByType;
    banner?: ContentConfigByType;
    tournament?: ContentConfigByType;
    localization?: ContentConfigByType;
  }
  export interface Content {
    id: number;
    contentTypeId: number;
    name: string;
    active: boolean;
    content: {
      en: ContentByLanguage;
      [key: string]: ContentByLanguage;
      image: string;
      enabled?: boolean;
      important?: boolean;
      openOnLogin?: boolean;
      rules?: { [key: string]: any };
      tags?: string[];
      location?: string;
      action?: string;
      lander?: string;
      newImageWithoutLogo?: string;
      startDate?: string;
      endDate?: string;
      brands?: string[];
      server?: boolean;
      format?: string;
      type: string;
    };
    externalId: string;
    subtype: string;
    status: ContentStatus;
    updatedAt: string;
  }

  export type ContentDraft = Omit<Content, "id" | "contentTypeId"> & { type: string };

  export interface ContentRow {
    id: number;
    languages?: {
      language: string;
      isFilled: boolean;
    }[];
    name?: string;
    status?: ContentStatus;
    tags?: string[];
    title?: string;
    startDate?: string;
    endDate?: string;
    brands?: string[];
    updatedAt: string;
  }
}
