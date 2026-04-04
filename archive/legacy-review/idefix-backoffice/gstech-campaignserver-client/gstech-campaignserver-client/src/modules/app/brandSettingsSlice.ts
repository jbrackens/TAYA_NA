import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import { Country, Language, Email, Sms, Notification, Thumbnail } from "app/types";

import api from "../../api";
import zipObject from "lodash/zipObject";
import { RootState } from "../../redux";

interface BrandSettings {
  countries: Country[];
  languages: Language[];
  tags: string[];
  segments: string[];
  emails: Email[];
  smses: Sms[];
  notifications: Notification[];
  thumbnails: Thumbnail[];
}

interface BrandSettingsState extends BrandSettings {
  isLoading: boolean;
}

const initialState: BrandSettingsState = {
  isLoading: true,
  countries: [],
  languages: [],
  tags: [],
  segments: [],
  emails: [],
  smses: [],
  notifications: [],
  thumbnails: []
};

export const fetchBrandSettings = createAsyncThunk("brand-settings/fetch-branch-settings", async (brandId: string) => {
  const [
    {
      data: { data: countries }
    },
    {
      data: { data: languages }
    },
    {
      data: { data: tags }
    },
    {
      data: { data: segments }
    },
    {
      data: { data: emails }
    },
    {
      data: { data: smses }
    },
    {
      data: { data: notifications }
    },
    {
      data: { data: thumbnails }
    }
  ] = await Promise.all([
    api.settings.getCountries(brandId),
    api.settings.getLanguages(brandId),
    api.settings.getTags(brandId),
    api.settings.getSegments(brandId),
    api.emails.getEmails(brandId),
    api.smses.getSmses(brandId),
    api.notifications.getNotifications(brandId),
    api.games.getThumbnails(brandId)
  ]);
  return {
    countries,
    languages,
    tags,
    segments,
    emails,
    smses,
    notifications,
    thumbnails
  };
});

export const fetchBrandThumbnails = createAsyncThunk(
  "brand-settings/fetch-brand-thumbnails",
  async (brandId: string) => {
    const {
      data: { data: thumbnails }
    } = await api.games.getThumbnails(brandId);
    return { thumbnails };
  }
);

const brandSettingsSlice = createSlice({
  name: "brand-settings",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchBrandSettings.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchBrandSettings.fulfilled, (state, action) => {
      const { countries, languages, tags, segments, emails, smses, notifications, thumbnails } = action.payload;
      state.isLoading = false;
      state.countries = countries;
      state.languages = languages;
      state.tags = tags;
      state.segments = segments;
      state.emails = emails;
      state.smses = smses;
      state.notifications = notifications;
      state.thumbnails = thumbnails;
    });
    builder.addCase(fetchBrandSettings.rejected, state => {
      state.isLoading = false;
    });

    builder.addCase(fetchBrandThumbnails.fulfilled, (state, action) => {
      const { thumbnails } = action.payload;
      state.thumbnails = thumbnails;
    });
  }
});

const { reducer } = brandSettingsSlice;

const selectBrandSettings = (state: RootState) => state.app.brandSettings;

export const selectBrandSettingsIsLoading = createSelector(
  selectBrandSettings,
  brandSettings => brandSettings.isLoading
);
export const selectCountries = createSelector(selectBrandSettings, brandSettings => brandSettings.countries);
export const selectLanguages = createSelector(selectBrandSettings, brandSettings => brandSettings.languages);
export const selectTags = createSelector(selectBrandSettings, brandSettings => brandSettings.tags);
export const selectSegments = createSelector(selectBrandSettings, brandSettings => brandSettings.segments);
export const selectEmails = createSelector(selectBrandSettings, brandSettings => brandSettings.emails);
export const selectSmses = createSelector(selectBrandSettings, brandSettings => brandSettings.smses);
export const selectNotifications = createSelector(selectBrandSettings, brandSettings => brandSettings.notifications);
export const selectThumbnails = createSelector(selectBrandSettings, brandSettings => brandSettings.thumbnails);

export const selectLanguageTitles = createSelector(selectLanguages, languages => {
  const languagesCodes = languages.map(({ code }) => code);
  return zipObject(languagesCodes, Array(languagesCodes.length).fill({ text: "" }));
});

export const selectCountryOptions = createSelector(selectCountries, countries =>
  countries.map(country => ({
    value: country.code,
    label: country.name
  }))
);

export const selectLanguageOptions = createSelector(selectLanguages, languages =>
  languages.map(language => ({
    value: language.code,
    label: language.engName
  }))
);

export const selectTagOptions = createSelector(selectTags, tags => tags.map(tag => ({ value: tag, label: tag })));
export const selectSegmentOptions = createSelector(selectSegments, segments =>
  segments.map(segment => ({ value: segment, label: segment }))
);

export const selectEmailOptions = createSelector(selectEmails, emails =>
  emails.map(({ subject, ...rest }) => ({ ...rest, info: subject }))
);

export const selectNotificationOptions = createSelector(selectNotifications, notifications =>
  notifications.map(({ title, ...rest }) => ({ ...rest, info: title }))
);

export const selectSmsesOptions = createSelector(selectSmses, smses =>
  smses.map(({ text, ...rest }) => ({ ...rest, info: text }))
);

export const selectThumbnailsOptions = createSelector(selectThumbnails, thumbnails =>
  thumbnails.map(({ id, key, blurhashes }) => ({ value: id, label: key, blurhashes }))
);

export const selectThumbnailById = createSelector(
  selectThumbnails,
  (_: unknown, byId: number | null) => byId,
  (thumbnails, byId) => thumbnails.find(({ id }) => id === byId)
);

export default reducer;
