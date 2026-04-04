import { createSlice } from "@reduxjs/toolkit";

export const initialState = {
  selectedProject: null,
  selectedProjectId: null,
};

const appDataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    setProject: (state, data: any) => {
      state.selectedProject = data.payload;
      state.selectedProjectId = data.payload?.key;
    },
  },
});

export const getProject = (state: any) => state.data.selectedProject;
export const getProjectId = (state: any) => state.data.selectedProjectId;

export const { setProject } = appDataSlice.actions;

export default appDataSlice.reducer;
