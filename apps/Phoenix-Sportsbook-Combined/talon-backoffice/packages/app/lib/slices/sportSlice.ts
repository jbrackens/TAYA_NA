import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Tournament = {
  id: string;
  name: string;
  numberOfFixtures: number;
};

export type Sport = {
  abbreviation: string;
  iconUrl?: string;
  id: string;
  name: string;
  tournaments?: Array<Tournament>;
  isUrlSeparate?: boolean;
  displayToPunters?: boolean;
};

type State = {
  list: Array<Sport>;
  timeOfSportsGet: Date;
};

const initialState: State = {
  list: [],
  timeOfSportsGet: new Date(),
};

const sportSlice = createSlice({
  name: "sports",
  initialState,
  reducers: {
    setSports: (state, action: PayloadAction<Array<Sport>>) => {
      state.list = action.payload;
    },

    setTimeOfSportsGet: (state, action: PayloadAction<Date>) => {
      state.timeOfSportsGet = action.payload;
    },
  },
});

/**
 * Extract value from root state
 *
 * @param   {Object} state The root state
 * @returns {number} The current value
 */

export type SliceState = {
  [K in typeof sportSlice.name]: ReturnType<typeof sportSlice.reducer>;
};

export const selectSports = (state: SliceState) => state.sports.list;
export const selectTimeOfSportsGet = (state: SliceState) =>
  state.sports.timeOfSportsGet;
export const selectSportByAbbreviation = (
  state: SliceState,
  sportAbbreviation: string,
) =>
  state.sports.list.find((sport) => sport.abbreviation === sportAbbreviation);

export const { setSports, setTimeOfSportsGet } = sportSlice.actions;

export default sportSlice.reducer;
