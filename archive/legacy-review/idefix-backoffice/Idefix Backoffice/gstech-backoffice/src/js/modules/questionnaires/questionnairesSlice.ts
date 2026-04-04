import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Questionnaire } from "app/types";
import api from "js/core/api";

interface QuestionnairesState {
  questionnaires: Questionnaire[];
  isFetchingQuestionnaires: boolean;
}

const initialState: QuestionnairesState = {
  questionnaires: [],
  isFetchingQuestionnaires: false,
};

export const fetchQuestionnaires = createAsyncThunk("questionnaires/fetch-questionnaires", async (playerId: number) => {
  try {
    const questionnaires = await api.players.getQuestionnaires(playerId);
    return questionnaires;
  } catch (err) {
    console.log(err);
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
  },
});

export const { reducer } = questionnairesSlice;
