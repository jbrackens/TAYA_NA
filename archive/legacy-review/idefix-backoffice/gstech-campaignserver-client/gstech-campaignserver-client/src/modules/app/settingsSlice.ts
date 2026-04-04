import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import { BrandOption, CampaignWithRewards, ContentConfig, ContentType, RewardConfig } from "app/types";
import keys from "lodash/keys";

import api from "../../api";
import { RootState } from "../../redux";
import { selectSelectedRewardsType } from "../../pages/Rewards";

interface SettingsResponse {
  brands: BrandOption[];
  campaigns: CampaignWithRewards[];
  rewardConfig: RewardConfig;
  rewardRuleTriggers: string[];
  contentConfig: ContentConfig;
  bannerLocations: { [key: string]: string[] };
}

interface SettingsState extends SettingsResponse {
  isLoading: boolean;
}

const initialState: SettingsState = {
  isLoading: true,
  brands: [],
  campaigns: [],
  rewardConfig: {
    rewardDefinitions: {},
    thumbnails: {}
  },
  rewardRuleTriggers: [],
  contentConfig: {},
  bannerLocations: {}
};

export const fetchSettings = createAsyncThunk("settings/fetch-settings", async () => {
  const [
    {
      data: { data: config }
    },
    {
      data: { data: campaigns }
    },
    {
      data: { data: rewardConfig }
    },
    {
      data: { data: contentConfig }
    }
  ] = await Promise.all([
    api.settings.getInitialData(),
    api.campaigns.getCampaignsWithRewards(),
    api.rewards.getInitialData(),
    api.content.getInitialData()
  ]);

  return {
    ...config,
    campaigns,
    rewardConfig,
    contentConfig
  };
});

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchSettings.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchSettings.fulfilled, (state, action) => {
      const { brands, rewardTriggers, campaigns, rewardConfig, contentConfig, bannerLocations } = action.payload;
      state.isLoading = false;
      state.brands = brands;
      state.campaigns = campaigns;
      state.rewardConfig = rewardConfig;
      state.rewardRuleTriggers = rewardTriggers;
      state.contentConfig = contentConfig;
      state.bannerLocations = bannerLocations;
    });
    builder.addCase(fetchSettings.rejected, state => {
      state.isLoading = false;
    });
  }
});

const { reducer } = settingsSlice;

const selectSettings = (state: RootState) => state.app.settings;
export const selectSettingsIsLoading = createSelector(selectSettings, settings => settings.isLoading);
export const selectBrands = createSelector(selectSettings, settings => settings.brands);
export const selectTitleByBrand = createSelector(
  selectBrands,
  (_: unknown, brandId: string) => brandId,
  (brands, brandId) => {
    const activeBrandTitle = brands.find(brand => brand.id === brandId)?.name;

    return activeBrandTitle;
  }
);
export const selectCampaigns = createSelector(selectSettings, settings => settings.campaigns);
export const selectCampaignOptions = createSelector(selectCampaigns, campaigns =>
  campaigns.map(({ campaignId, name }) => ({
    value: campaignId,
    label: name
  }))
);

export const selectRewardConfig = createSelector(selectSettings, settings => settings.rewardConfig);

export const selectRewardConfigThumbnails = createSelector(selectRewardConfig, rewardConfig => rewardConfig.thumbnails);

export const selectRewardDefinitionsByBrandWithHidden = createSelector(
  selectRewardConfig,
  (_: unknown, brandId: string) => brandId,
  (rewardConfig, brandId) => rewardConfig.rewardDefinitions[brandId]
);

export const selectRewardDefinitionsByBrand = createSelector(
  selectRewardDefinitionsByBrandWithHidden,
  rewardDefinitions => rewardDefinitions?.filter(({ hidden }) => !hidden)
);

export const selectRewardTypesByBrand = createSelector(selectRewardDefinitionsByBrand, brandConfig =>
  brandConfig?.map(({ name, type }) => ({ name, type }))
);

export const selectRewardTypesByBrandWithHidden = createSelector(
  selectRewardDefinitionsByBrandWithHidden,
  brandConfig => brandConfig?.map(({ name, type }) => ({ name, type }))
);

export const selectRewardDefinitionsByBrandAndType = createSelector(
  [selectRewardDefinitionsByBrand, selectSelectedRewardsType, (_: unknown, brandId) => brandId],
  (rewardDefinitions, rewardType) => rewardDefinitions?.find(configItem => configItem.type === rewardType)
);

export const selectRewardDefinitionIdByBrandAndType = createSelector(
  [selectRewardDefinitionsByBrandAndType, brandId => brandId],
  rewardDefinitions => rewardDefinitions?.id
);

export const selectRewardTableByBrandAndType = createSelector(
  [selectRewardDefinitionsByBrandAndType, brandId => brandId],
  rewardDefinitions => rewardDefinitions?.table
);

export const selectRewardFieldsByBrandAndType = createSelector(
  [selectRewardDefinitionsByBrandAndType, brandId => brandId],
  rewardDefinitions => rewardDefinitions?.fields
);

export const selectRewardSpinTypesByBrandAndType = createSelector(
  [selectRewardDefinitionsByBrandAndType, brandId => brandId],
  rewardDefinitions => rewardDefinitions?.spinTypes
);

export const selectRewardFormFieldsInfoByBrandAndType = createSelector(
  selectRewardDefinitionsByBrandAndType,
  brandConfig => {
    if (!brandConfig) return undefined;

    const extraFields = brandConfig.fields.reduce(
      (acc, { property, title, values: options, type, preview }) => ({
        ...acc,
        [property]: {
          title,
          property,
          type,
          options,
          preview
        }
      }),
      {}
    );

    const drawerTableFields = brandConfig.table.reduce(
      (acc, { property, title }) => ({
        ...acc,
        [property]: {
          title,
          property,
          type: brandConfig.fields.find(item => item.property === property)?.type,
          options: brandConfig.fields.find(item => item.property === property)?.values
        }
      }),
      {
        cost: { title: "Cost", property: "cost", type: "money" },
        active: { title: "Active", property: "active", type: "boolean" }
      }
    );

    const formFieldsInfo = { ...drawerTableFields, ...extraFields };

    return formFieldsInfo;
  }
);

export const selectRewardFieldsRequiredWithOptions = createSelector(selectRewardFieldsByBrandAndType, fields =>
  fields
    ?.filter(({ required, values }) => required && values)
    .reduce((acc, { property, values }) => {
      return property.includes("metadata.")
        ? {
            ...acc,
            metadata: {
              [property.replace("metadata.", "")]: values![0]
            }
          }
        : {
            ...acc,
            [property]: values![0]
          };
    }, {})
);

export const selectThumbnailUrlsByBrand = createSelector(
  selectRewardConfigThumbnails,
  (_: unknown, brandId: string) => brandId,
  (thumbnails, brandId) => thumbnails[brandId]
);

export const selectThumbnailViewModes = createSelector(selectThumbnailUrlsByBrand, thumbnailUrls =>
  keys(thumbnailUrls)
);

export const selectRewardRuleTriggers = createSelector(selectSettings, settings => settings.rewardRuleTriggers);

export const selectBannerLocationsByBrand = createSelector(
  selectSettings,
  (_: unknown, brandId: string) => brandId,
  (settings, brandId) => settings.bannerLocations[brandId]
);

export const selectContentConfigByType = createSelector(
  selectSettings,
  (_: unknown, contentType: ContentType) => contentType,
  (settings, contentType) => settings.contentConfig[contentType]
);

export default reducer;
