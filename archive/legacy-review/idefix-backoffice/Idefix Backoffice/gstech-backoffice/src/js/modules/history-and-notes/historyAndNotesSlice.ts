import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { EventType, PlayerEvent } from "app/types";
import api from "js/core/api";
import { RootState } from "js/rootReducer";

interface HistoryAndNotesState {
  events: PlayerEvent[];
  filters: Record<EventType, boolean>;
}

const initialState: HistoryAndNotesState = {
  events: [],
  filters: {
    note: true,
    account: true,
    activity: false,
    fraud: false,
    transaction: false,
  },
};

export const fetchEvents = createAsyncThunk("history-and-notes/fetch-events", async (playerId: number) => {
  try {
    const events = await api.players.getEvents(playerId);
    return events;
  } catch (err) {
    console.log(err, "error");
  }
});

const historyAndNotesSlice = createSlice({
  name: "historyAndNotes",
  initialState,
  reducers: {
    changeFilterValue(state, action) {
      state.filters = { ...state.filters, [action.payload.filter]: action.payload.value };
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchEvents.fulfilled, (state, action) => {
      if (action.payload) {
        state.events = action.payload;
      }
    });
  },
});

export const {
  reducer,
  actions: { changeFilterValue },
} = historyAndNotesSlice;

export const getHistoryAndNotes = (state: RootState) => state.historyAndNotes;

export const getEvents = createSelector(getHistoryAndNotes, state => {
  const { events, filters } = state;

  return events.filter(event => filters[event.type]);
});

export const getFilters = createSelector(getHistoryAndNotes, state => state.filters);
