import { ActionCreator, Reducer } from "redux";
import { ApiExclusion, Exclusion } from "@brandserver-client/types";
import {
  ExclusionState,
  GetLimits,
  ExclusionTypes,
  SetLimit,
  DeleteLimit,
  ExclusionAction
} from "./types";
import { LobbyState, LobbyThunkActionCreator } from "../lobby";
import { formatToMoney } from "@brandserver-client/utils";

function formatLimitWithAmount(limit: Exclusion): Exclusion {
  if (
    limit.limitType === "loss" ||
    limit.limitType === "deposit" ||
    limit.limitType === "bet"
  ) {
    return {
      ...limit,
      limitValue: formatToMoney(limit.limitValue!),
      limitLeft: limit.limitLeft
        ? formatToMoney(limit.limitLeft)
        : limit.limitLeft
    };
  }

  return limit;
}

const initialState: ExclusionState = {
  minDepositLimit: 0,
  limits: []
};

const getLimits: ActionCreator<GetLimits> = (exclusions: ApiExclusion) => ({
  type: ExclusionTypes.FETCH_LIMITS,
  payload: exclusions
});

const setLimit: ActionCreator<SetLimit> = (exclusion: Exclusion) => ({
  type: ExclusionTypes.SET_LIMIT,
  payload: exclusion
});

const deleteLimit: ActionCreator<DeleteLimit> = (exclusion: Exclusion) => ({
  type: ExclusionTypes.DELETE_LIMIT,
  payload: exclusion
});

const exclusionsReducer: Reducer<ExclusionState, ExclusionAction> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case ExclusionTypes.FETCH_LIMITS:
      return {
        ...state,
        limits: action.payload.limits.map(formatLimitWithAmount),
        minDepositLimit: formatToMoney(action.payload.minDepositLimit)
      };
    case ExclusionTypes.SET_LIMIT:
      return {
        ...state,
        limits: [...state.limits, formatLimitWithAmount(action.payload)]
      };
    case ExclusionTypes.DELETE_LIMIT:
      return {
        ...state,
        limits: state.limits.map((limit: Exclusion) => {
          if (limit.limitId === action.payload.limitId)
            return formatLimitWithAmount(action.payload);
          return limit;
        })
      };
    default:
      return state;
  }
};

const fetchExclusions: LobbyThunkActionCreator<
  any,
  LobbyState,
  ExclusionAction
> =
  () =>
  async (dispatch, _, { api }) => {
    await api.exclusion
      .getExclusions()
      .then(response => {
        if (response) {
          dispatch(getLimits(response));
        }
      })
      .catch(err => console.log("Failed to get exclusions: ", err.toString()));
  };
// TODO: better name for thunk
const fetchSetExclusion: LobbyThunkActionCreator<
  any,
  LobbyState,
  ExclusionAction
> =
  (exclusion: Exclusion) =>
  (dispatch, _, { api }) => {
    return api.exclusion
      .setExclusion(exclusion)
      .then(response => {
        if (response) {
          dispatch(setLimit(response));
        }
      })
      .catch(err => console.log("Failed to set exclusion: ", err.toString()));
  };
// TODO: better name for thunk
const fetchDeleteExclusion: LobbyThunkActionCreator<
  unknown,
  LobbyState,
  ExclusionAction
> =
  (id: string) =>
  async (dispatch, _, { api }) => {
    return api.exclusion
      .removeExclusion(id)
      .then(response => {
        if (response) {
          dispatch(deleteLimit(response));
        }
      })
      .catch(err =>
        console.log("Failed to delete exclusion: ", err.toString())
      );
  };

const getExclusions = (state: LobbyState) => state.exclusions;

export {
  getLimits,
  setLimit,
  deleteLimit,
  exclusionsReducer,
  getExclusions,
  fetchExclusions,
  fetchSetExclusion,
  fetchDeleteExclusion
};
