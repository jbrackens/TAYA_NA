import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";

import { Questionnaire } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";
import { RootState } from "../../rootReducer";

interface QuestionnairesState {
  questionnaires: Questionnaire[];
  isFetchingQuestionnaires: boolean;
}

const initialState: QuestionnairesState = {
  questionnaires: [],
  isFetchingQuestionnaires: false
};

export const fetchQuestionnaires = createAsyncThunk("questionnaires/fetch-questionnaires", async (playerId: number) => {
  try {
    const questionnaires = await api.players.getQuestionnaires(playerId);
    return questionnaires;
  } catch (err) {
    console.log(err);
    return;
  }
});

const questionnairesSlice = createSlice({
  name: "questionnaires",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchQuestionnaires.pending, state => {
        state.isFetchingQuestionnaires = true;
      })
      .addCase(fetchQuestionnaires.fulfilled, (state, action) => {
        state.questionnaires = action.payload!;
        state.isFetchingQuestionnaires = false;
      })
      .addCase(fetchQuestionnaires.rejected, state => {
        state.isFetchingQuestionnaires = false;
      });
  }
});

export const { reducer } = questionnairesSlice;

const getState = (state: RootState) => state.questionnaires;

export const getQuestionnaires = createSelector(getState, state => state.questionnaires);
export const getIsLoadingQuestionnaires = createSelector(getState, state => state.isFetchingQuestionnaires);
