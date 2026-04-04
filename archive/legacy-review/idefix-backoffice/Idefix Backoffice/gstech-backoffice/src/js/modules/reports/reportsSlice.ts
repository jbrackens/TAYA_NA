import { createAction, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import api from "js/core/api";
import { ReportType } from "app/types";
import { AppDispatch } from "index";
import { RootState } from "js/rootReducer";
import { SortDirection } from "@material-ui/core";

interface ReportsState {
  values: { brandId?: string; [key: string]: any };
  isLoadingReport: boolean;
  report: unknown[];
}

const initialState: ReportsState = {
  values: {},
  isLoadingReport: false,
  report: [],
};

export const fetchReport = createAsyncThunk<
  any,
  {
    reportType: ReportType;
    values: { brandId?: string; [key: string]: any };
    pageSize?: number;
    text?: string;
    sortBy?: string;
    sortDirection?: SortDirection;
  }
>("reports/fetch-report", async ({ reportType, values, pageSize = 100, text, ...rest }, { rejectWithValue }) => {
  try {
    const reportValues = ["withdrawals", "deposits"].includes(reportType)
      ? { ...values, pageSize, text, ...rest }
      : values;

    const report = await api.reports.getReport(reportType, reportValues);
    return report;
  } catch (err) {
    const error = err.message;
    return rejectWithValue(error);
  }
});

export const changeValueAction = createAction("reports/change-value", (key, value) => ({
  payload: { key, value },
}));

export const changeValue =
  (key: string, value: any, reportType: ReportType) => (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch(changeValueAction(key, value));
    const { values } = getState().reports;
    dispatch(fetchReport({ reportType, values }));
  };

export const resetValuesAndReport = createAction("reports/reset-values");

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchReport.pending, state => {
        state.isLoadingReport = true;
      })
      .addCase(fetchReport.fulfilled, (state, action) => {
        const reports = action.payload;
        state.isLoadingReport = false;

        if (Array.isArray(reports)) {
          state.report = reports;
        } else if (typeof reports === "object" && reports !== null) {
          state.report = []; // TODO this should be fixed on the server, cuz sometimes its an empty object
        }
      })
      .addCase(fetchReport.rejected, state => {
        state.isLoadingReport = false;
      });
    builder.addCase(changeValueAction, (state, action) => {
      state.values = {
        ...state.values,
        [action.payload.key]: action.payload.value,
      };
    });
    builder.addCase(resetValuesAndReport, state => {
      state.values = {};
      state.report = [];
    });
  },
});

export const { reducer } = reportsSlice;

const getState = (state: RootState) => state.reports;

export const getReports = createSelector(getState, reports => reports.report);
export const getIsLoading = createSelector(getState, reports => reports.isLoadingReport);
export const getValues = createSelector(getState, reports => reports.values);
