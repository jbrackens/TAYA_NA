import { AxiosResponse } from "axios";
import {
  AudienceRule,
  ExistingCampaign,
  NewCampaign,
  Country,
  Language,
  RewardRule,
  CampaignWithRewards,
  NewContent,
  Email,
  Sms,
  Notification,
  CampaignStatus,
  CampaignStats,
  Game,
  RewardConfig,
  RewardInstance,
  Reward,
  Thumbnail,
  ContentRequest,
  Content,
  ContentConfig,
  InitConfig,
  ContentDraft,
  GameManufacturer,
  CampaignGroup
} from "app/types";

export interface Api {
  status: {
    getStatus: () => Promise<AxiosResponse<{ ok: boolean }>>;
  };
  campaigns: {
    getCampaigns: (
      campaignStatus: CampaignStatus,
      brandId?: string
    ) => Promise<AxiosResponse<{ data: { groups: CampaignGroup[]; pagination: {} } }>>;
    updateCampaignGroupName: (
      groupId: number,
      data: {
        name: string;
      }
    ) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    duplicateCampaignGroup: (groupId: number) => Promise<
      AxiosResponse<{
        data: {
          id: number;
          firstCampaignId: number;
        };
      }>
    >;
    archiveCampaignGroup: (groupId: number) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    getCampaignsWithRewards: () => Promise<AxiosResponse<{ data: CampaignWithRewards[] }>>;
    getCampaign: (campaignId: number) => Promise<AxiosResponse<{ data: ExistingCampaign }>>;
    createCampaign: (data: NewCampaign) => Promise<AxiosResponse<{ data: { campaignId: number } }>>;
    updateCampaign: (
      campaignId: number,
      data: Partial<NewCampaign>
    ) => Promise<AxiosResponse<{ data: ExistingCampaign }>>;
    archiveCampaign: (campaignId: number) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    activateCampaign: (campaignId: number) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    duplicateCampaign: (campaignId: number) => Promise<AxiosResponse<{ data: { campaignId: number } }>>;
    sendEmails: (campaignId: number) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    sendSmses: (campaignId: number) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    getStats: (campaignId: number) => Promise<AxiosResponse<{ data: CampaignStats }>>;
    stopCampaign: (campaignId: number) => Promise<AxiosResponse<{ data: { ok: true } }>>;
    togglePreview: (campaignId: number) => Promise<AxiosResponse<{ data: { previewMode: boolean } }>>;

    addAudienceRule: (
      campaignId: number,
      data: Omit<AudienceRule, "id">
    ) => Promise<AxiosResponse<{ data: { audienceRuleId: number } }>>;
    downloadCsvAudience: (campaignId: number, type?: "email" | "sms") => Promise<AxiosResponse>;
    addCsvAudienceRule: (campaignId: number, data: FormData) => Promise<AxiosResponse<{ data: { ruleId: number } }>>;
    updateAudienceRule: (
      campaignId: number,
      ruleId: number,
      data: Omit<AudienceRule, "id">
    ) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    removeAudienceRule: (campaignId: number, ruleId: number) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;

    addRewardRule: (campaignId: number, data: RewardRule) => Promise<AxiosResponse<{ data: { rewardRuleId: number } }>>;
    updateRewardRule: (
      campaignId: number,
      rewardRuleId: number,
      data: RewardRule
    ) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    removeRewardRule: (campaignId: number, rewardId: number) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;

    addContent: (
      campaignId: number,
      data: NewContent | { [key: string]: number }
    ) => Promise<AxiosResponse<{ data: { campaignContentId: number } }>>;
    updateContent: (
      campaignId: number,
      campaignContentId: number,
      data: NewContent
    ) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    removeContent: (campaignId: number, campaignContentId: number) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
  };
  settings: {
    getInitialData: () => Promise<
      AxiosResponse<{
        data: InitConfig;
      }>
    >;
    getCountries: (brandId?: string) => Promise<AxiosResponse<{ data: Country[] }>>;
    getLanguages: (brandId: string) => Promise<AxiosResponse<{ data: Language[] }>>;
    getTags: (brandId: string) => Promise<AxiosResponse<{ data: string[] }>>;
    getSegments: (brandId: string) => Promise<AxiosResponse<{ data: string[] }>>;
    getRewards: (brandId: string, rewardType?: string) => Promise<AxiosResponse<{ data: Reward[] }>>;
  };
  emails: {
    getEmails: (brandId: string) => Promise<AxiosResponse<{ data: Email[] }>>;
    getEmailPreview: (contentId: number, lang: Language["code"]) => Promise<AxiosResponse<string>>;
  };
  smses: {
    getSmses: (brandId: string) => Promise<AxiosResponse<{ data: Sms[] }>>;
    getSmsPreview: (contentId: number) => Promise<
      AxiosResponse<{
        data: {
          fi: string;
          en: string;
          de: string;
          sv: string;
          no: string;
        };
      }>
    >;
  };
  notifications: {
    getNotifications: (brandId: string) => Promise<AxiosResponse<{ data: Notification[] }>>;
    getNotificationPreview: (contentId: number, lang: Language["code"]) => Promise<AxiosResponse<string>>;
  };
  rewards: {
    getInitialData: () => Promise<AxiosResponse<{ data: RewardConfig }>>;
    getRewards: (brandId: string, type: string) => Promise<AxiosResponse<{ data: RewardInstance[] }>>;
    getReward: (rewardId: number) => Promise<AxiosResponse<{ data: RewardInstance }>>;
    addReward: (data: Omit<Reward, "id" | "order">) => Promise<AxiosResponse<{ data: Reward }>>;
    updateReward: (rewardId: number, data: Omit<Reward, "id">) => Promise<AxiosResponse<{ data: Reward }>>;
    removeReward: (rewardId: number) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    duplicateReward: (rewardId: number) => Promise<AxiosResponse<{ data: RewardInstance["reward"] }>>;
  };
  games: {
    getGames: (brandId: string) => Promise<AxiosResponse<{ data: Game[] }>>;
    addGame: (data: Game) => Promise<AxiosResponse<{ data: { gameId: number } }>>;
    updateGame: (gameId: number, data: Partial<Game>) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    removeGame: (gameId: number) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
    getGameManufacturers: (countryId?: string) => Promise<AxiosResponse<{ data: GameManufacturer[] }>>;
    getThumbnails: (brandId: string) => Promise<AxiosResponse<{ data: Thumbnail[] }>>;
    getPermalinks: (brandId: string) => Promise<AxiosResponse<{ data: string[] }>>;
  };
  content: {
    getInitialData: () => Promise<AxiosResponse<{ data: ContentConfig }>>;
    getContent: ({
      brandId,
      contentType,
      status,
      location,
      excludeInactive
    }: ContentRequest) => Promise<AxiosResponse<{ data: Content[] }>>;
    getContentById: (contentId: number) => Promise<AxiosResponse<{ data: Content }>>;
    createContent: (data: ContentDraft) => Promise<AxiosResponse<{ data: Content }>>;
    updateContent: (contentId: number, data: Content) => Promise<AxiosResponse<{ data: Content }>>;
    removeContent: (contentId: number) => Promise<AxiosResponse<{ data: { ok: boolean } }>>;
  };
}
