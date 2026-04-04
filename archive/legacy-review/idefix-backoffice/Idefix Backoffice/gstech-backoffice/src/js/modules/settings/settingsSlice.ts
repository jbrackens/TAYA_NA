import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { FormikHelpers } from "formik";
import api from "../../core/api";
import {
  Bonus,
  CountrySettings,
  GameManufacturer,
  GameProfile,
  GameSettings,
  PaymentMethod,
  PaymentMethodProvider,
  Promotion,
  Risk,
} from "app/types";
import omit from "lodash/fp/omit";
import { RootState } from "../../rootReducer";

type UpdateProviderValues = Omit<PaymentMethodProvider, "id" | "name" | "paymentProviders">;

interface SettingsState {
  isLoading: boolean;
  countries: CountrySettings[];
  games: GameSettings[];
  gameManufacturers: GameManufacturer[];
  gameProfiles: GameProfile[];
  bonuses: Bonus[];
  paymentMethods: PaymentMethod[];
  paymentMethodProviders: PaymentMethodProvider | null;
  isLoadingProviders: boolean;
  promotions: Promotion[];
  risks: Risk[];
}

const initialState: SettingsState = {
  isLoading: false,
  countries: [],
  games: [],
  gameManufacturers: [],
  gameProfiles: [],
  bonuses: [],
  paymentMethods: [],
  paymentMethodProviders: null,
  isLoadingProviders: false,
  promotions: [],
  risks: [],
};

export const fetchCountries = createAsyncThunk<CountrySettings[], { brandId: string }>(
  "settings/fetch-countries",
  async ({ brandId }) => {
    try {
      const countries = await api.settings.getBrandCountries(brandId);
      return countries;
    } catch (err) {
      console.log(err);
      return err;
    }
  },
);

export const fetchGames = createAsyncThunk<GameSettings[]>("settings/fetch-games", async () => {
  try {
    const games = await api.settings.getGames();
    const filteredGames = games?.map(item => ({
      ...omit(["rtp"], item),
      rtp: item.rtp ? item.rtp / 100 : null,
    }));

    return filteredGames;
  } catch (err) {
    console.log(err);
    return err;
  }
});

export const fetchGameManufacturers = createAsyncThunk<GameManufacturer[]>(
  "settings/fetch-game-manufacturers",
  async () => {
    try {
      const manufacturers = await api.settings.getGameManufacturers();
      return manufacturers;
    } catch (err) {
      console.log(err);
      return err;
    }
  },
);

export const fetchBonuses = createAsyncThunk<Bonus[], { brandId: string }>(
  "settings/fetch-bonuses",
  async ({ brandId }) => {
    try {
      const bonuses = await api.settings.getBonuses(brandId);
      return bonuses;
    } catch (err) {
      console.log(err);
      return err;
    }
  },
);

export const fetchPaymentMethods = createAsyncThunk<PaymentMethod[]>("settings/fetch-payment-methods", async () => {
  try {
    const paymentMethods = await api.settings.getPaymentMethods();
    return paymentMethods;
  } catch (err) {
    console.log(err);
    return err;
  }
});

export const fetchPaymentProviders = createAsyncThunk<PaymentMethodProvider, { paymentMethodId: number }>(
  "settings/fetch-payment-providers",
  async ({ paymentMethodId }) => {
    try {
      const paymentProvider = await api.settings.getPaymentProviders(paymentMethodId);
      return paymentProvider;
    } catch (err) {
      console.log(err);
      return err;
    }
  },
);

export const updatePaymentProviders = createAsyncThunk<
  void,
  {
    id: number;
    values: UpdateProviderValues;
    formikActions: FormikHelpers<UpdateProviderValues>;
  }
>("settings/update-payment-providers", async ({ id, values, formikActions }) => {
  try {
    await api.settings.updatePaymentProviders(id, values);
    formikActions.setSubmitting(false);
  } catch (err) {
    console.log(err);
    formikActions.setFieldError("general", err.message);
  }
});

export const fetchPromotions = createAsyncThunk<Promotion[], { brandId: string }>(
  "settings/fetch-promotions",
  async ({ brandId }) => {
    try {
      const promotions = await api.settings.getPromotions(brandId);
      return promotions;
    } catch (err) {
      console.log(err);
      return err;
    }
  },
);

export const fetchGameProfiles = createAsyncThunk<GameProfile[], { brandId: string }>(
  "settings/fetch-games-profiles",
  async ({ brandId }) => {
    try {
      const gameProfiles = await api.settings.getGameProfileSettings(brandId);
      return gameProfiles;
    } catch (err) {
      console.log(err);
      return err;
    }
  },
);

export const fetchRisks = createAsyncThunk<Risk[], { params?: { manualTrigger: boolean } }>(
  "settings/fetch-risks",
  async ({ params }) => {
    try {
      const risks = await api.settings.getRisks(params);
      return risks;
    } catch (err) {
      console.log(err);
      return err;
    }
  },
);

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchCountries.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        const countries = action.payload;
        state.isLoading = false;
        state.countries = countries;
      });

    builder
      .addCase(fetchGames.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchGames.fulfilled, (state, action) => {
        const games = action.payload;
        state.isLoading = false;
        state.games = games;
      });

    builder
      .addCase(fetchGameManufacturers.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchGameManufacturers.fulfilled, (state, action) => {
        const manufacturers = action.payload;
        state.isLoading = false;
        state.gameManufacturers = manufacturers;
      });

    builder
      .addCase(fetchBonuses.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchBonuses.fulfilled, (state, action) => {
        const bonuses = action.payload;
        state.isLoading = false;
        state.bonuses = bonuses;
      });

    builder
      .addCase(fetchPaymentMethods.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        const paymentMethods = action.payload;
        state.isLoading = false;
        state.paymentMethods = paymentMethods;
      });

    builder
      .addCase(fetchPaymentProviders.pending, state => {
        state.isLoadingProviders = true;
      })
      .addCase(fetchPaymentProviders.fulfilled, (state, action) => {
        const paymentProvider = action.payload;
        state.isLoadingProviders = false;
        state.paymentMethodProviders = paymentProvider;
      });

    builder
      .addCase(fetchPromotions.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchPromotions.fulfilled, (state, action) => {
        const promotions = action.payload;
        state.isLoading = false;
        state.promotions = promotions;
      });

    builder
      .addCase(fetchGameProfiles.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchGameProfiles.fulfilled, (state, action) => {
        const gameProfiles = action.payload;
        state.isLoading = false;
        state.gameProfiles = gameProfiles;
      });

    builder
      .addCase(fetchRisks.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchRisks.fulfilled, (state, action) => {
        const risks = action.payload;
        state.isLoading = false;
        state.risks = risks;
      });
  },
});

export const { reducer } = settingsSlice;

const getSettings = (state: RootState) => state.settings;

export const getSettingsLoading = createSelector(getSettings, settings => settings.isLoading);
export const getCountries = createSelector(getSettings, settings => settings.countries);
export const getBonuses = createSelector(getSettings, settings => settings.bonuses);
export const paymentMethods = createSelector(getSettings, settings => settings.paymentMethods);
export const getPaymentMethods = createSelector(paymentMethods, paymentMethods => paymentMethods);
export const getPaymentMethodProviders = createSelector(getSettings, settings => settings.paymentMethodProviders);
export const getIsLoadingProviders = createSelector(getSettings, settings => settings.isLoadingProviders);
export const getPromotions = createSelector(getSettings, settings => settings.promotions);
export const getGameProfiles = createSelector(getSettings, settings => settings.gameProfiles);
export const getGames = createSelector(getSettings, settings => settings.games);
export const getGameManufacturers = createSelector(getSettings, settings => settings.gameManufacturers);
export const getRisks = createSelector(getSettings, settings => settings.risks);
