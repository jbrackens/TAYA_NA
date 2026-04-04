import { ApiExclusion, Exclusion } from "@brandserver-client/types";

export type ExclusionState = ApiExclusion;

export enum ExclusionTypes {
  FETCH_LIMITS = "exclusions/fetch-limits",
  SET_LIMIT = "exclusions/set-limit",
  DELETE_LIMIT = "exclusions/delete-limit"
}

export type GetLimits = {
  type: ExclusionTypes.FETCH_LIMITS;
  payload: ApiExclusion;
};

export type SetLimit = {
  type: ExclusionTypes.SET_LIMIT;
  payload: Exclusion;
};

export type DeleteLimit = {
  type: ExclusionTypes.DELETE_LIMIT;
  payload: Exclusion;
};

export type ExclusionAction = GetLimits | SetLimit | DeleteLimit;
