import axios, { AxiosError } from "axios";
import { Api } from "./types";
import { redirect, removeGoogleCookie } from "../modules/google-auth";

export const api = axios.create({ withCredentials: true });

const PREFIX = "/api/v1";

api.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401 && window) {
      removeGoogleCookie();
      redirect("/login");
    }

    return Promise.reject(error);
  }
);

const apiService: Api = {
  status: {
    getStatus: () => api.get(`${PREFIX}/status`)
  },
  settings: {
    getInitialData: () => api.get(`${PREFIX}/config/init`),
    getCountries: brandId =>
      api.get(`${PREFIX}/config/countries`, {
        params: {
          brandId
        }
      }),
    getLanguages: brandId => api.get(`${PREFIX}/config/languages`, { params: { brandId } }),
    getTags: brandId => api.get(`${PREFIX}/config/tags`, { params: { brandId } }),
    getSegments: brandId => api.get(`${PREFIX}/config/segments`, { params: { brandId } }),
    getRewards: (brandId, rewardType) => api.get(`${PREFIX}/config/rewards`, { params: { brandId, rewardType } })
  },
  campaigns: {
    getCampaigns: (campaignStatus, brandId) => api.get(`${PREFIX}/campaigns`, { params: { campaignStatus, brandId } }),
    updateCampaignGroupName: (groupId, data) => api.put(`${PREFIX}/campaign-groups/${groupId}`, data),
    duplicateCampaignGroup: groupId => api.post(`${PREFIX}/campaign-groups/${groupId}/duplicate`),
    archiveCampaignGroup: groupId => api.delete(`${PREFIX}/campaign-groups/${groupId}`),
    getCampaignsWithRewards: () => api.get(`${PREFIX}/campaigns/with-rewards`),
    getCampaign: campaignId => api.get(`${PREFIX}/campaigns/${campaignId}`),
    createCampaign: data => api.post(`${PREFIX}/campaigns`, data),
    updateCampaign: (campaignId, data) => api.put(`${PREFIX}/campaigns/${campaignId}`, data),
    archiveCampaign: campaignId => api.delete(`${PREFIX}/campaigns/${campaignId}`),
    activateCampaign: campaignId => api.post(`${PREFIX}/campaigns/${campaignId}/activate`),
    duplicateCampaign: campaignId => api.post(`${PREFIX}/campaigns/${campaignId}/duplicate`),
    sendEmails: campaignId => api.post(`${PREFIX}/campaigns/${campaignId}/send-emails`),
    sendSmses: campaignId => api.post(`${PREFIX}/campaigns/${campaignId}/send-smses`),
    getStats: campaignId => api.get(`${PREFIX}/campaigns/${campaignId}/stats`),
    stopCampaign: campaignId => api.post(`${PREFIX}/campaigns/${campaignId}/stop`),
    downloadCsvAudience: (campaignId, type) =>
      api.get(`${PREFIX}/campaigns/${campaignId}/csv-audience`, { params: { type } }),
    addAudienceRule: (campaignId, data) => api.post(`${PREFIX}/campaigns/${campaignId}/audience-rules`, data),
    addCsvAudienceRule: (campaignId, data) =>
      api.post(`${PREFIX}/campaigns/${campaignId}/audience-rules/csv`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      }),
    updateAudienceRule: (campaignId, ruleId, data) =>
      api.put(`${PREFIX}/campaigns/${campaignId}/audience-rules/${ruleId}`, data),
    removeAudienceRule: (campaignId, ruleId) =>
      api.delete(`${PREFIX}/campaigns/${campaignId}/audience-rules/${ruleId}`),

    addRewardRule: (campaignId, data) => api.post(`${PREFIX}/campaigns/${campaignId}/reward-rules`, data),
    updateRewardRule: (campaignId, rewardRuleId, data) =>
      api.put(`${PREFIX}/campaigns/${campaignId}/reward-rules/${rewardRuleId}`, data),
    removeRewardRule: (campaignId, rewardId) =>
      api.delete(`${PREFIX}/campaigns/${campaignId}/reward-rules/${rewardId}`),

    addContent: (campaignId, data) => api.post(`${PREFIX}/campaigns/${campaignId}/content`, data),
    updateContent: (campaignId, campaignContentId, data) =>
      api.put(`${PREFIX}/campaigns/${campaignId}/content/${campaignContentId}`, data),
    removeContent: (campaignId, campaignContentId) =>
      api.delete(`${PREFIX}/campaigns/${campaignId}/content/${campaignContentId}`),
    togglePreview: campaignId => api.post(`${PREFIX}/campaigns/${campaignId}/toggle-preview`)
  },
  emails: {
    getEmails: brandId =>
      api.get(`${PREFIX}/emails`, {
        params: {
          brandId
        }
      }),
    getEmailPreview: (contentId, lang) =>
      api.get(`${PREFIX}/emails/${contentId}/preview`, {
        params: {
          lang
        }
      })
  },
  smses: {
    getSmses: brandId =>
      api.get(`${PREFIX}/smses`, {
        params: {
          brandId
        }
      }),
    getSmsPreview: contentId => api.get(`${PREFIX}/smses/${contentId}/preview`)
  },
  notifications: {
    getNotifications: brandId =>
      api.get(`${PREFIX}/notifications`, {
        params: { brandId }
      }),
    getNotificationPreview: (contentId, lang) =>
      api.get(`${PREFIX}/notifications/${contentId}/preview`, {
        params: {
          lang
        }
      })
  },
  rewards: {
    getInitialData: () => api.get(`${PREFIX}/rewards/init`),
    getRewards: (brandId, type) =>
      api.get(`${PREFIX}/rewards`, {
        params: { brandId, type }
      }),
    getReward: rewardId => api.get(`${PREFIX}/rewards/${rewardId}`),
    addReward: data => api.post(`${PREFIX}/rewards`, data),
    updateReward: (rewardId, data) => api.put(`${PREFIX}/rewards/${rewardId}`, data),
    removeReward: rewardId => api.delete(`${PREFIX}/rewards/${rewardId}`),
    duplicateReward: rewardId => api.post(`${PREFIX}/rewards/${rewardId}/duplicate`)
  },
  games: {
    getGames: brandId =>
      api.get(`${PREFIX}/games`, {
        params: { brandId }
      }),
    addGame: data => api.post(`${PREFIX}/games`, data),
    updateGame: (gameId, data) => api.put(`${PREFIX}/games/${gameId}`, data),
    removeGame: gameId => api.delete(`${PREFIX}/games/${gameId}`),
    getGameManufacturers: countryId => api.get(`${PREFIX}/games/game-manufacturers`, { params: { countryId } }),
    getThumbnails: brandId =>
      api.get(`${PREFIX}/games/thumbnails`, {
        params: {
          brandId
        }
      }),
    getPermalinks: brandId => api.get(`${PREFIX}/games/permalinks`, { params: { brandId } })
  },
  content: {
    getInitialData: () => api.get(`${PREFIX}/content/init`),
    getContent: ({ brandId, contentType, status, location, excludeInactive }) =>
      contentType === "localization"
        ? api.get(`${PREFIX}/content/localizations`, { params: { brandId, status } })
        : api.get(`${PREFIX}/content`, {
            params: {
              brandId,
              contentType,
              status,
              location,
              excludeInactive
            }
          }),
    getContentById: (contentId: number) => api.get(`${PREFIX}/content/${contentId}`),
    createContent: data =>
      data.type === "localization"
        ? api.post(`${PREFIX}/content/localizations`, data)
        : api.post(`${PREFIX}/content/`, data),
    updateContent: (contentId, data) => api.put(`${PREFIX}/content/${contentId}`, data),
    removeContent: contentId => api.delete(`${PREFIX}/content/${contentId}`)
  }
};

export default apiService;
